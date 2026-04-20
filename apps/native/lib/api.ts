import type {
  CategoriesResponse,
  CategoryPostsResponse,
  PageConfigResponse,
  PostDetail,
  PostSummary,
  PostsResponse,
  TagsResponse,
  TagPostsResponse,
} from "./types";

const BASE = process.env.EXPO_PUBLIC_SITE_URL ?? "https://hmziq.rs";

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

function resolveCover(post: PostSummary): PostSummary {
  if (!post.cover || post.cover.startsWith("http")) return post;
  return { ...post, cover: `${BASE}${post.cover}` };
}

export function getPosts() {
  return fetchApi<PostsResponse>("/api/index.json").then((r) => ({
    posts: r.posts.map(resolveCover),
  }));
}

export function getPost(slug: string) {
  return fetchApi<PostDetail>(`/api/posts/${slug}.json`).then((post) => {
    if (!post.cover || post.cover.startsWith("http")) return post;
    return { ...post, cover: `${BASE}${post.cover}` };
  });
}

export function getTags() {
  return fetchApi<TagsResponse>("/api/tags/index.json");
}

export function getTagPosts(tag: string) {
  return fetchApi<TagPostsResponse>(`/api/tags/${encodeURIComponent(tag)}.json`).then((r) => ({
    tag: r.tag,
    posts: r.posts.map(resolveCover),
  }));
}

export function getCategories() {
  return fetchApi<CategoriesResponse>("/api/categories.json");
}

export function getCategoryPosts(category: string) {
  return fetchApi<CategoryPostsResponse>(`/api/category/${encodeURIComponent(category)}.json`).then(
    (r) => ({ category: r.category, posts: r.posts.map(resolveCover) }),
  );
}

export function getPageConfig(page: "about" | "contact" | "privacy" | "terms") {
  return fetchApi<PageConfigResponse>(`/api/${page}.json`);
}
