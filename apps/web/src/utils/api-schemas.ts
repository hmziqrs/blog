import { z } from "zod";

// ---- Reusable component schemas ----

export const CoverSchema = z
  .object({
    src: z.string().describe("Image URL or path"),
    width: z.number().int().describe("Width in pixels"),
    height: z.number().int().describe("Height in pixels"),
  })
  .nullable();

export const PostSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  date: z.string().describe("ISO 8601 date-time"),
  updated: z.string().nullable().describe("ISO 8601 date-time, if updated"),
  category: z.string(),
  tags: z.array(z.string()),
  cover: CoverSchema,
  cover_alt: z.string().nullable(),
});

export const PostDetailSchema = PostSummarySchema.extend({
  body: z.string().describe("Raw markdown content"),
});

export const CategorySchema = z.object({
  category: z.string(),
  count: z.number().int(),
});

export const TagSchema = z.object({
  tag: z.string(),
  count: z.number().int(),
});

export const AuthorSchema = z.object({
  author: z.object({
    name: z.string(),
    url: z.string().nullable(),
    bio: z.string().nullable(),
    email: z.string().nullable(),
    twitterHandle: z.string().nullable(),
    avatar: z.object({
      light: z.string(),
      dark: z.string(),
    }),
    websites: z.object({
      main: z.string(),
      blog: z.string(),
    }),
    socials: z.array(
      z.object({
        platform: z.string(),
        url: z.string(),
      }),
    ),
    sameAs: z.array(z.string()),
  }),
});

export const ReadmeSchema = z.object({
  title: z.string(),
  source: z.string().describe("GitHub source URL"),
  content: z.string().describe("Raw markdown content"),
});

// ---- ApiMeta type ----

export interface ApiMeta {
  operationId: string;
  summary: string;
  description?: string;
  tags?: string[];
  /** Map of path param name → Zod schema */
  parameters?: Record<string, z.ZodTypeAny>;
  /** Zod schema for the 200 response body */
  response: z.ZodTypeAny;
}
