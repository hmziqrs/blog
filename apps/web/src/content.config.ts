import { defineCollection } from "astro:content";
import { z } from "zod";
import { glob } from "astro/loaders";
import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.resolve(fileURLToPath(import.meta.url), "../../../../");

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: path.join(monorepoRoot, "content/posts") }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      category: z.string().trim().min(1),
      tags: z.array(z.string()),
      draft: z.boolean().default(false),
      cover: image().optional(),
      cover_alt: z.string().trim().min(1).optional(),
    }),
});

export const collections = { posts };
