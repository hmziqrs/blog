import { router } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";

import { CategoryBadge } from "./category-badge";
import { CoverOverlay } from "./cover-overlay";
import { formatDate } from "@/lib/format";
import { triggerSelectionHaptic } from "@/lib/haptics";
import type { PostSummary } from "@/lib/types";

interface HeroPostCardProps {
  post: PostSummary;
}

export function HeroPostCard({ post }: HeroPostCardProps) {
  return (
    <Pressable
      onPress={() => {
        triggerSelectionHaptic();
        router.push(`/posts/${post.id}`);
      }}
      className="overflow-hidden rounded-2xl active:opacity-90"
    >
      {post.cover ? (
        <View className="relative h-52 overflow-hidden bg-base-200">
          <Image
            source={{ uri: post.cover }}
            alt={post.cover_alt ?? post.title}
            className="absolute inset-0 h-full w-full"
            resizeMode="cover"
          />
          <CoverOverlay />
          <View className="absolute inset-x-0 bottom-0 z-10 px-4 pb-3.5 pt-8">
            <Text
              className="text-xl font-bold leading-tight tracking-tight text-base-content"
              numberOfLines={2}
            >
              {post.title}
            </Text>
            <View className="mt-2 flex-row items-center gap-2">
              <CategoryBadge category={post.category} />
              <Text className="text-[0.68rem] font-mono tracking-wide text-base-content/60">
                {formatDate(post.date)}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View className="rounded-2xl border border-base-content/8 bg-base-200/50 p-5">
          <View className="flex-row items-center gap-2">
            <CategoryBadge category={post.category} />
            <Text className="text-[0.68rem] font-mono tracking-wide text-dim">
              {formatDate(post.date)}
            </Text>
          </View>
          <Text
            className="mt-3 text-xl font-bold leading-tight tracking-tight text-foreground"
            numberOfLines={3}
          >
            {post.title}
          </Text>
          {post.description && (
            <Text className="mt-2 text-[0.82rem] leading-relaxed text-soft" numberOfLines={2}>
              {post.description}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}
