import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { CategoryBadge } from "./category-badge";
import { formatDate } from "@/lib/format";
import { triggerSelectionHaptic } from "@/lib/haptics";
import type { PostSummary } from "@/lib/types";

interface RelatedPostsProps {
  posts: PostSummary[];
}

export function RelatedPosts({ posts }: RelatedPostsProps) {
  if (posts.length === 0) return null;

  return (
    <View className="mt-6">
      <Text className="mb-3 text-sm font-semibold text-dim">Related</Text>
      <View className="gap-2">
        {posts.map((post) => (
          <Pressable
            key={post.id}
            onPress={() => {
              triggerSelectionHaptic();
              router.push(`/posts/${post.id}`);
            }}
            className="flex-row items-center gap-3 rounded-xl bg-base-200/40 px-3.5 py-3 active:bg-base-200/70"
          >
            <View className="flex-1 gap-1">
              <Text className="text-[0.88rem] font-semibold leading-snug text-foreground">
                {post.title}
              </Text>
              <View className="flex-row items-center gap-2">
                <CategoryBadge category={post.category} />
                <Text className="text-[0.6rem] font-mono text-dim">
                  {formatDate(post.date)}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
