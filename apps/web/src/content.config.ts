import { defineCollection } from "astro:content";
import { z } from "zod";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
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
