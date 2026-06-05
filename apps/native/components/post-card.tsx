import { router } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";

import { CategoryBadge } from "./category-badge";
import { formatDate } from "@/lib/format";
import { triggerSelectionHaptic } from "@/lib/haptics";
import type { PostSummary } from "@/lib/types";

interface PostCardProps {
  post: PostSummary;
}

/**
 * Compact list-style card for the post feed.
 * Thumbnail on the left, title + metadata on the right — like a native news reader.
 */
export function PostCard({ post }: PostCardProps) {
  return (
    <Pressable
      onPress={() => {
        triggerSelectionHaptic();
        router.push(`/posts/${post.id}`);
      }}
      className="flex-row gap-3.5 border-b border-base-content/6 py-3.5 active:opacity-70"
    >
      {post.cover ? (
        <Image
          source={{ uri: post.cover }}
          alt={post.cover_alt ?? post.title}
          className="h-[4.5rem] w-[4.5rem] rounded-lg bg-base-200"
          resizeMode="cover"
        />
      ) : (
        <View className="h-[4.5rem] w-[4.5rem] items-center justify-center rounded-lg bg-base-200">
          <Text className="text-lg font-bold text-dim">
            {post.title.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View className="flex-1 justify-center gap-1">
        <View className="flex-row items-center gap-2">
          <CategoryBadge category={post.category} />
          <Text className="font-mono text-[0.62rem] tracking-[0.08em] uppercase text-dim">
            {formatDate(post.date)}
          </Text>
        </View>
        <Text
          className="text-[0.92rem] font-semibold leading-snug tracking-tight text-foreground"
          numberOfLines={2}
        >
          {post.title}
        </Text>
        {post.description && (
          <Text
            className="text-[0.78rem] leading-snug text-soft"
            numberOfLines={1}
          >
            {post.description}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
