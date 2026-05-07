import { defineCollection } from "astro:content";
import { z } from "zod";
import { glob } from "astro/loaders";
import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.resolve(fileURLToPath(import.meta.url), "../../../../");

const defaultContentDir = import.meta.env.DEV ? "content-staging" : "content";
const contentRoot = process.env.CONTENT_DIR || path.join(monorepoRoot, defaultContentDir);
const postsDir = path.join(contentRoot, "posts");

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: postsDir }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      category: z.string().trim().min(1),
      tags: z.array(z.string()),
      draft: z.boolean().default(false),
      cover: z.union([image(), z.string().url()]).optional(),
      cover_alt: z.string().trim().min(1).optional(),
    }),
});

const changelogsDir = path.join(monorepoRoot, "changelog");

const changelogs = defineCollection({
  loader: glob({ pattern: "v*.md", base: changelogsDir }),
  schema: () =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      version: z.string().optional(),
    }),
});

export const collections = { posts, changelogs };
