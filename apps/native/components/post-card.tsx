import { router } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";

import { CategoryBadge } from "./category-badge";
import { TagBadge } from "./tag-badge";
import type { PostSummary } from "@/lib/types";

interface PostCardProps {
  post: PostSummary;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PostCard({ post }: PostCardProps) {
  return (
    <Pressable
      onPress={() => router.push(`/posts/${post.id}`)}
      className="overflow-hidden rounded-2xl border border-base-content/10 bg-base-200/55 active:opacity-80"
    >
      {post.cover && (
        <View className="relative h-52 overflow-hidden">
          <Image
            source={{ uri: post.cover }}
            alt={post.cover_alt ?? post.title}
            className="h-full w-full"
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-gradient-to-t from-base-100 via-base-100/80 to-transparent" />
          <View className="absolute bottom-0 left-0 right-0 p-4">
            <PostCardInfo post={post} />
          </View>
        </View>
      )}
      {!post.cover && (
        <View className="p-4">
          <PostCardInfo post={post} />
        </View>
      )}
    </Pressable>
  );
}

function PostCardInfo({ post }: PostCardProps) {
  return (
    <View>
      <View className="flex-row items-center gap-2">
        <Text className="font-mono text-[0.68rem] tracking-[0.12em] uppercase text-base-content/56">
          {formatDate(post.date)}
        </Text>
        <Text className="text-base-content/30">/</Text>
        <CategoryBadge category={post.category} />
      </View>
      <Text
        className="mt-2 text-[1.28rem] font-semibold leading-tight tracking-tight text-foreground"
        numberOfLines={2}
      >
        {post.title}
      </Text>
      <Text
        className="mt-1.5 text-sm leading-6 text-base-content/72"
        numberOfLines={2}
      >
        {post.description}
      </Text>
      {post.tags.length > 0 && (
        <View className="mt-3 flex-row flex-wrap gap-2">
          {post.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </View>
      )}
    </View>
  );
}
