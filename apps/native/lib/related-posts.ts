import type { PostSummary } from "./types";

export function getRelatedPosts(
  currentId: string,
  currentTags: string[],
  currentCategory: string,
  allPosts: PostSummary[],
  limit = 3,
): PostSummary[] {
  return allPosts
    .filter((post) => post.id !== currentId)
    .map((post) => {
      let score = 0;
      for (const tag of currentTags) {
        if (post.tags.includes(tag)) score += 2;
      }
      if (post.category === currentCategory) score += 1;
      return { post, score };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || new Date(b.post.date).getTime() - new Date(a.post.date).getTime(),
    )
    .slice(0, limit)
    .map(({ post }) => post);
}
