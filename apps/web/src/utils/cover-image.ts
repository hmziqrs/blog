import type { ImageMetadata } from "astro";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface CoverImage {
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

const srcDir = path.resolve(fileURLToPath(import.meta.url), "..");
const contentDir = process.env.CONTENT_DIR || path.resolve(srcDir, "../../../../content/posts");
const manifestPath = path.resolve(contentDir, "..", "media-manifest.json");

export const mediaManifest: Record<string, { width: number; height: number }> = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, "utf-8"))
  : {};

export function normalizeCover(
  cover: ImageMetadata | string | undefined,
  manifest?: Record<string, { width: number; height: number }> | null,
): CoverImage | undefined {
  if (cover == null) return undefined;

  if (typeof cover === "string") {
    const dims = (manifest ?? mediaManifest)?.[cover];
    return {
      src: cover,
      width: dims?.width ?? 1280,
      height: dims?.height ?? 720,
    };
  }

  return {
    src: cover.src,
    width: cover.width,
    height: cover.height,
  };
}
