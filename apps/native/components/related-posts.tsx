import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { formatDate } from "@/lib/format";
import { triggerSelectionHaptic } from "@/lib/haptics";
import type { PostSummary } from "@/lib/types";

interface RelatedPostsProps {
  posts: PostSummary[];
}

export function RelatedPosts({ posts }: RelatedPostsProps) {
  if (posts.length === 0) return null;

  return (
    <View className="mt-12 border-t border-base-300/80 pt-8">
      <Text className="mb-6 text-xl font-semibold text-foreground">Related Posts</Text>
      <View className="gap-4">
        {posts.map((post) => (
          <Pressable
            key={post.id}
            onPress={() => {
              triggerSelectionHaptic();
              router.push(`/posts/${post.id}`);
            }}
            className="rounded-lg border border-base-300/80 bg-base-200/55 p-4 active:border-primary/40 active:bg-base-200/80"
          >
            <Text className="font-semibold text-foreground active:text-primary">{post.title}</Text>
            {post.description && (
              <Text className="mt-1 text-sm text-soft" numberOfLines={2}>
                {post.description}
              </Text>
            )}
            <Text className="mt-2 font-mono text-xs text-dim">
              {formatDate(post.date, "long")}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
