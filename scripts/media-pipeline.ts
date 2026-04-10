import { Database } from "bun:sqlite";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
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

// ─── Upload ────────────────────────────────────────────────────────────────────

async function upload() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.error("Missing R2 credentials. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.");
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
  const getExisting = db.prepare("SELECT content_hash, r2_key FROM media WHERE local_path = ?");

  const files = scanDir(MEDIA_DIR);
  let uploaded = 0;
  let skipped = 0;

  for (const filePath of files) {
    const localPath = path.relative(REPO_ROOT, filePath);
    const hash = hashFile(filePath);
    const existing = getExisting.get(localPath) as { content_hash: string; r2_key: string } | null;

    if (existing && existing.content_hash === hash) {
      skipped++;
      continue;
    }

    // Build R2 key: media/name-hash8.ext
    const ext = path.extname(filePath);
    const stem = path.basename(filePath, ext);
    const hashSuffix = hash.slice(0, 8);
    const r2Key = `media/${stem}-${hashSuffix}${ext}`;
    const r2Url = `${R2_PUBLIC_URL.replace(/\/$/, "")}/${r2Key}`;

    // If file changed (old entry exists), delete old R2 object first
    if (existing && existing.r2_key !== r2Key) {
      try {
        await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: existing.r2_key }));
      } catch {
        // Best-effort delete — old key may already be gone
      }
    }

    const body = fs.readFileSync(filePath);
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

  db.close();
  console.log(`\nDone. ${uploaded} uploaded, ${skipped} skipped (unchanged).`);
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

  // Build replacement map: relative media path → R2 URL
  // We need to match patterns like ../media/foo.jpg, ./media/foo.jpg, media/foo.jpg
  const replacements = new Map<string, string>();
  for (const row of rows) {
    const filename = path.basename(row.local_path);
    replacements.set(filename, row.r2_url);
  }

  // Create temp output dir
  const targetDir = outDir ?? fs.mkdtempSync(path.join(tmpdir(), "blog-content-"));
  const postsDir = path.join(CONTENT_DIR, "posts");
  const outPostsDir = path.join(targetDir, "posts");
  fs.mkdirSync(outPostsDir, { recursive: true });

  const mdFiles = fs.readdirSync(postsDir).filter((f) => f.endsWith(".md"));

  for (const file of mdFiles) {
    const src = fs.readFileSync(path.join(postsDir, file), "utf-8");
    const rewritten = rewriteImageRefs(src, replacements);
    fs.writeFileSync(path.join(outPostsDir, file), rewritten);
  }

  // Print the posts dir path (what Astro's content config needs)
  console.log(outPostsDir);
}

function rewriteImageRefs(content: string, replacements: Map<string, string>): string {
  // Split into frontmatter and body
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return content;

  const frontmatter = fmMatch[1];
  const body = content.slice(fmMatch[0].length);

  // Rewrite frontmatter: cover: "../media/foo.jpg" → cover: "https://..."
  let newFm = frontmatter;
  for (const [filename, url] of replacements) {
    // Match cover: followed by any relative path ending in this filename
    const coverRegex = new RegExp(
      `(cover:\\s*["'])(?:\\.\\.\\/|\\.\\/)?(?:media\\/)?${escapeRegex(filename)}(["'])`,
      "g",
    );
    newFm = newFm.replace(coverRegex, `$1${url}$2`);
  }

  // Rewrite body: ![alt](../media/foo.jpg) → ![alt](https://...)
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
