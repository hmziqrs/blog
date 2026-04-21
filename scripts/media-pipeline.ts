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
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? "";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? "";

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN ?? "";
const D1_DATABASE_ID = process.env.D1_DATABASE_ID ?? "";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif"]);

// ─── D1 client ─────────────────────────────────────────────────────────────────

async function queryD1<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
    },
  );

  if (!response.ok) throw new Error(`D1 query failed: ${response.statusText}`);

  const data = await response.json<{
    success: boolean;
    errors: Array<{ message: string }>;
    result: Array<{ results: T[] }>;
  }>();
  if (!data.success) throw new Error(`D1 error: ${data.errors[0].message}`);

  return data.result[0].results;
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

// ─── Sync D1 from R2 (cold-start recovery) ─────────────────────────────────────

async function syncD1FromR2(client: S3Client): Promise<void> {
  const [row] = await queryD1<{ n: number }>("SELECT COUNT(*) as n FROM media");
  if (row.n > 0) return;

  console.log("  media table is empty — rebuilding from R2 listing...");

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
      await queryD1(
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

  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN || !D1_DATABASE_ID) {
    console.error(
      "Missing D1 credentials. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, D1_DATABASE_ID.",
    );
    process.exit(1);
  }

  if (!existsSync(MEDIA_DIR)) {
    console.log("No content/media/ directory found. Nothing to upload.");
    return;
  }

  const client = createR2Client();

  await syncD1FromR2(client);

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
    const [existing] = await queryD1<{ content_hash: string; r2_key: string }>(
      "SELECT content_hash, r2_key FROM media WHERE local_path = ?",
      [localPath],
    );

    // Fast path: content unchanged
    if (existing && existing.content_hash === hash) {
      skipped++;
      continue;
    }

    const r2Key = buildR2Key(filePath, hash);
    const r2Url = `${R2_PUBLIC_URL.replace(/\/$/, "")}/${r2Key}`;

    // R2 already has this exact version (recovered from listing, hash was empty)
    if (existing && existing.r2_key === r2Key) {
      await queryD1("UPDATE media SET content_hash = ? WHERE local_path = ?", [hash, localPath]);
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

    await queryD1(
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

  const deleted = await cleanup(client);

  const parts = [`${uploaded} uploaded`, `${skipped} skipped`];
  if (oversized > 0) parts.push(`${oversized} oversized`);
  if (deleted > 0) parts.push(`${deleted} cleaned up`);
  console.log(`\nDone. ${parts.join(", ")}.`);
}

// ─── Cleanup deleted files ─────────────────────────────────────────────────────

async function cleanup(client: S3Client): Promise<number> {
  const rows = await queryD1<{ local_path: string; r2_key: string }>(
    "SELECT local_path, r2_key FROM media",
  );

  let deleted = 0;
  for (const row of rows) {
    const absPath = path.join(REPO_ROOT, row.local_path);
    if (!existsSync(absPath)) {
      try {
        await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: row.r2_key }));
      } catch {
        // best-effort
      }
      await queryD1("DELETE FROM media WHERE local_path = ?", [row.local_path]);
      console.log(`  removed: ${row.local_path}`);
      deleted++;
    }
  }
  return deleted;
}

// ─── Rewrite ───────────────────────────────────────────────────────────────────

async function rewrite(outDir?: string) {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN || !D1_DATABASE_ID) {
    console.error(
      "Missing D1 credentials. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, D1_DATABASE_ID.",
    );
    process.exit(1);
  }

  const rows = await queryD1<{ local_path: string; r2_url: string }>(
    "SELECT local_path, r2_url FROM media",
  );

  if (rows.length === 0) {
    console.error("No media entries in D1. Run `bun run media:upload` first.");
    process.exit(1);
  }

  // Key by both full relative path and basename for flexible matching in markdown
  const byPath = new Map<string, string>();
  const byBasename = new Map<string, string>();
  for (const row of rows) {
    byPath.set(row.local_path.replaceAll(path.sep, "/"), row.r2_url);
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
    await rewrite(outDir);
    break;
  default:
    console.log("Usage: media-pipeline.ts <upload|rewrite> [--out-dir <path>]");
    process.exit(1);
}
