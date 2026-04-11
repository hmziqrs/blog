import type {
  CategoriesResponse,
  CategoryPostsResponse,
  PageConfigResponse,
  PostsResponse,
  PostDetail,
  TagsResponse,
  TagPostsResponse,
} from "./types";

const BASE = process.env.EXPO_PUBLIC_SITE_URL ?? "https://hmziq.rs";

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export function getPosts() {
  return fetchApi<PostsResponse>("/api/index.json");
}

export function getPost(slug: string) {
  return fetchApi<PostDetail>(`/api/posts/${slug}.json`);
}

export function getTags() {
  return fetchApi<TagsResponse>("/api/tags/index.json");
}

export function getTagPosts(tag: string) {
  return fetchApi<TagPostsResponse>(`/api/tags/${encodeURIComponent(tag)}.json`);
}

export function getCategories() {
  return fetchApi<CategoriesResponse>("/api/categories.json");
}

export function getCategoryPosts(category: string) {
  return fetchApi<CategoryPostsResponse>(
    `/api/category/${encodeURIComponent(category)}.json`,
  );
}

export function getPageConfig(page: "about" | "contact" | "privacy" | "terms") {
  return fetchApi<PageConfigResponse>(`/api/${page}.json`);
}
