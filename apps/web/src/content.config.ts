import { defineCollection } from "astro:content";
import { z } from "zod";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    category: z.enum(["engineering", "tutorials", "opinions", "tools", "news"]),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
    cover: z.string().optional(),
  }),
});

export const collections = { posts };
