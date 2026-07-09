import { SITE } from "./site";
import type {
  CategoriesResponse,
  CategoryPostsResponse,
  PageConfigResponse,
  PostDetail,
  PostsResponse,
  TagsResponse,
  TagPostsResponse,
} from "./types";

const BASE = (process.env.EXPO_PUBLIC_SITE_URL ?? SITE.siteUrl).replace(/\/$/, "");

type CoverInput = string | { src: string; width?: number; height?: number } | null | undefined;

function resolveCoverUrl(cover: CoverInput): string | null {
  if (!cover) return null;
  const src = typeof cover === "string" ? cover : cover.src;
  if (!src) return null;
  if (src.startsWith("http")) return src;
  return `${BASE}${src.startsWith("/") ? src : `/${src}`}`;
}

function normalizePost<T extends { cover: CoverInput }>(post: T): T & { cover: string | null } {
  return { ...post, cover: resolveCoverUrl(post.cover) };
}

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export function getPosts() {
  return fetchApi<PostsResponse>("/api/index.json").then((r) => ({
    posts: r.posts
      .map(normalizePost)
      .toSorted((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  }));
}

export function getPost(slug: string) {
  return fetchApi<PostDetail>(`/api/posts/${slug}.json`).then(normalizePost);
}

export function getTags() {
  return fetchApi<TagsResponse>("/api/tags/index.json");
}

export function getTagPosts(tag: string) {
  return fetchApi<TagPostsResponse>(`/api/tags/${encodeURIComponent(tag)}.json`).then((r) => ({
    tag: r.tag,
    posts: r.posts.map(normalizePost),
  }));
}

export function getCategories() {
  return fetchApi<CategoriesResponse>("/api/categories.json");
}

export function getCategoryPosts(category: string) {
  return fetchApi<CategoryPostsResponse>(`/api/category/${encodeURIComponent(category)}.json`).then(
    (r) => ({ category: r.category, posts: r.posts.map(normalizePost) }),
  );
}

export function getPageConfig(page: "about" | "contact" | "privacy" | "terms") {
  return fetchApi<PageConfigResponse>(`/api/${page}.json`);
}
