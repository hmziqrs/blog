import { Database } from "bun:sqlite";
import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

// ─── Config ────────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(import.meta.dir, "..");
const CONTENT_DIR = path.join(REPO_ROOT, "content");
const MEDIA_DIR = path.join(CONTENT_DIR, "media");
const DB_PATH = path.join(REPO_ROOT, "data.db");
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? "";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? "";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif"]);

// ─── DB helpers ────────────────────────────────────────────────────────────────

function openDb(): Database {
  const db = new Database(DB_PATH, { create: true });
  db.run(`
    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      local_path TEXT NOT NULL UNIQUE,
      r2_key TEXT NOT NULL,
      r2_url TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  return db;
}

// ─── Hashing ───────────────────────────────────────────────────────────────────

function hashFile(filePath: string): string {
  const contents = fs.readFileSync(filePath);
  return createHash("sha256").update(contents).digest("hex");
}

// ─── R2 client ─────────────────────────────────────────────────────────────────

function createR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

// ─── R2 key helpers ────────────────────────────────────────────────────────────

export function buildR2Key(filePath: string, hash: string): string {
  const relFromMedia = path.relative(MEDIA_DIR, filePath).replaceAll(path.sep, "/");
  const ext = path.extname(relFromMedia);
  const stem = relFromMedia.slice(0, relFromMedia.length - ext.length);
  return `media/${stem}-${hash.slice(0, 8)}${ext}`;
}

// "media/posts/foo-abc12345.jpg" → "content/media/posts/foo.jpg"
export function reverseR2Key(r2Key: string): string | null {
  if (!r2Key.startsWith("media/")) return null;
  const relFromMedia = r2Key.slice("media/".length);
  const ext = path.extname(relFromMedia);
  const withoutExt = relFromMedia.slice(0, relFromMedia.length - ext.length);
  const m = withoutExt.match(/^(.*)-([0-9a-f]{8})$/);
  if (!m) return null;
  return `content/media/${m[1]}${ext}`;
}

// ─── Sync DB from R2 (cold-start recovery) ─────────────────────────────────────

async function syncDbFromR2(db: Database, client: S3Client): Promise<void> {
  const count = (db.prepare("SELECT COUNT(*) as n FROM media").get() as { n: number }).n;
  if (count > 0) return; // DB already populated

  console.log("  data.db is empty — rebuilding from R2 listing...");

  let token: string | undefined;
  let total = 0;

  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: "media/",
        ContinuationToken: token,
      }),
    );

    for (const obj of res.Contents ?? []) {
      const key = obj.Key;
      if (!key) continue;
      const localPath = reverseR2Key(key);
      if (!localPath) continue;
      const r2Url = `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
      // hash stored as empty — upload logic will populate it on next run without re-uploading
      db.run(
        `INSERT OR IGNORE INTO media (local_path, r2_key, r2_url, content_hash) VALUES (?, ?, ?, '')`,
        [localPath, key, r2Url],
      );
      total++;
    }

    token = res.NextContinuationToken;
  } while (token);

  console.log(`  rebuilt ${total} entr${total === 1 ? "y" : "ies"} from R2`);
}

// ─── Upload ────────────────────────────────────────────────────────────────────

async function upload() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.error(
      "Missing R2 credentials. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.",
    );
    process.exit(1);
  }

  if (!R2_PUBLIC_URL) {
    console.error("Missing R2_PUBLIC_URL.");
    process.exit(1);
  }

  if (!existsSync(MEDIA_DIR)) {
    console.log("No content/media/ directory found. Nothing to upload.");
    return;
  }

  const db = openDb();
  const client = createR2Client();

  // Rebuild map from R2 if data.db was absent (cache miss or first run)
  await syncDbFromR2(db, client);

  const getExisting = db.prepare("SELECT content_hash, r2_key FROM media WHERE local_path = ?");

  const files = scanDir(MEDIA_DIR);
  let uploaded = 0;
  let skipped = 0;
  let oversized = 0;

  for (const filePath of files) {
    const localPath = path.relative(REPO_ROOT, filePath);

    const stats = fs.statSync(filePath);
    if (stats.size > MAX_FILE_BYTES) {
      console.warn(`  skipped (${(stats.size / 1024 / 1024).toFixed(1)} MB > 10 MB): ${localPath}`);
      oversized++;
      continue;
    }

    const hash = hashFile(filePath);
    const existing = getExisting.get(localPath) as { content_hash: string; r2_key: string } | null;

    // Fast path: content unchanged
    if (existing && existing.content_hash === hash) {
      skipped++;
      continue;
    }

    const r2Key = buildR2Key(filePath, hash);
    const r2Url = `${R2_PUBLIC_URL.replace(/\/$/, "")}/${r2Key}`;

    // R2 already has this exact version (synced from listing, hash was empty)
    if (existing && existing.r2_key === r2Key) {
      db.run("UPDATE media SET content_hash = ? WHERE local_path = ?", [hash, localPath]);
      skipped++;
      continue;
    }

    if (existing) {
      try {
        await client.send(
          new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: existing.r2_key }),
        );
      } catch {
        // best-effort; old key may already be gone
      }
    }

    const body = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: r2Key,
        Body: body,
        ContentType: contentTypeFor(ext),
      }),
    );

    db.run(
      `INSERT INTO media (local_path, r2_key, r2_url, content_hash)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(local_path) DO UPDATE SET
         r2_key = excluded.r2_key,
         r2_url = excluded.r2_url,
         content_hash = excluded.content_hash,
         uploaded_at = datetime('now')`,
      [localPath, r2Key, r2Url, hash],
    );

    console.log(`  uploaded: ${localPath} → ${r2Url}`);
    uploaded++;
  }

  // Remove DB entries for files that no longer exist locally
  const deleted = await cleanup(db, client);

  db.close();
  const parts = [`${uploaded} uploaded`, `${skipped} skipped`];
  if (oversized > 0) parts.push(`${oversized} oversized`);
  if (deleted > 0) parts.push(`${deleted} cleaned up`);
  console.log(`\nDone. ${parts.join(", ")}.`);
}

// ─── Cleanup deleted files ─────────────────────────────────────────────────────

async function cleanup(db: Database, client: S3Client): Promise<number> {
  const rows = db.prepare("SELECT local_path, r2_key FROM media").all() as {
    local_path: string;
    r2_key: string;
  }[];

  let deleted = 0;
  for (const row of rows) {
    const absPath = path.join(REPO_ROOT, row.local_path);
    if (!existsSync(absPath)) {
      try {
        await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: row.r2_key }));
      } catch {
        // best-effort
      }
      db.run("DELETE FROM media WHERE local_path = ?", [row.local_path]);
      console.log(`  removed: ${row.local_path}`);
      deleted++;
    }
  }
  return deleted;
}

// ─── Rewrite ───────────────────────────────────────────────────────────────────

function rewrite(outDir?: string) {
  const db = openDb();
  const rows = db.prepare("SELECT local_path, r2_url FROM media").all() as {
    local_path: string;
    r2_url: string;
  }[];
  db.close();

  if (rows.length === 0) {
    console.error("No media entries in data.db. Run `bun run media:upload` first.");
    process.exit(1);
  }

  // Key by both full relative path and basename for flexible matching in markdown
  const byPath = new Map<string, string>();
  const byBasename = new Map<string, string>();
  for (const row of rows) {
    byPath.set(row.local_path.replaceAll(path.sep, "/"), row.r2_url);
    // Warn on basename collisions rather than silently dropping one
    const bn = path.basename(row.local_path);
    if (byBasename.has(bn)) {
      console.warn(`  warning: basename collision for "${bn}" — use full paths in markdown`);
    }
    byBasename.set(bn, row.r2_url);
  }

  const targetDir = outDir ?? fs.mkdtempSync(path.join(tmpdir(), "blog-content-"));
  const postsDir = path.join(CONTENT_DIR, "posts");
  const outPostsDir = path.join(targetDir, "posts");
  fs.mkdirSync(outPostsDir, { recursive: true });

  const mdFiles = fs.readdirSync(postsDir).filter((f) => f.endsWith(".md"));

  for (const file of mdFiles) {
    const src = fs.readFileSync(path.join(postsDir, file), "utf-8");
    const rewritten = rewriteImageRefs(src, byBasename);
    fs.writeFileSync(path.join(outPostsDir, file), rewritten);
  }

  console.log(outPostsDir);
}

export function rewriteImageRefs(content: string, replacements: Map<string, string>): string {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return content;

  const frontmatter = fmMatch[1];
  const body = content.slice(fmMatch[0].length);

  let newFm = frontmatter;
  for (const [filename, url] of replacements) {
    const coverRegex = new RegExp(
      `(cover:\\s*["'])(?:\\.\\.\\/|\\.\\/)?(?:media\\/)?${escapeRegex(filename)}(["'])`,
      "g",
    );
    newFm = newFm.replace(coverRegex, `$1${url}$2`);
  }

  let newBody = body;
  for (const [filename, url] of replacements) {
    const imgRegex = new RegExp(
      `(\\!\\[[^\\]]*\\]\\()(?:\\.\\.\\/|\\.\\/)?(?:media\\/)?${escapeRegex(filename)}(\\))`,
      "g",
    );
    newBody = newBody.replace(imgRegex, `$1${url}$2`);
  }

  return `---\n${newFm}\n---${newBody}`;
}

// ─── Utils ─────────────────────────────────────────────────────────────────────

function scanDir(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanDir(fullPath));
    } else if (IMAGE_EXTS.has(path.extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }
  return results;
}

function contentTypeFor(ext: string): string {
  const types: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".avif": "image/avif",
  };
  return types[ext.toLowerCase()] ?? "application/octet-stream";
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── CLI ───────────────────────────────────────────────────────────────────────

const command = process.argv[2];
const outDirFlag = process.argv.indexOf("--out-dir");
const outDir = outDirFlag !== -1 ? process.argv[outDirFlag + 1] : undefined;

switch (command) {
  case "upload":
    await upload();
    break;
  case "rewrite":
    rewrite(outDir);
    break;
  default:
    console.log("Usage: media-pipeline.ts <upload|rewrite> [--out-dir <path>]");
    process.exit(1);
}
