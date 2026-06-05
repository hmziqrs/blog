import { router } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";

import { CategoryBadge } from "./category-badge";
import { CoverOverlay } from "./cover-overlay";
import { PageKicker } from "./page-kicker";
import { formatDate } from "@/lib/format";
import { triggerSelectionHaptic } from "@/lib/haptics";
import { SITE } from "@/lib/site";
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
      className="overflow-hidden rounded-[1.5rem] active:opacity-95"
    >
      {post.cover ? (
        <View className="relative min-h-[18rem] overflow-hidden bg-base-200">
          <Image
            source={{ uri: post.cover }}
            alt={post.cover_alt ?? post.title}
            className="absolute inset-0 h-full w-full"
            resizeMode="cover"
          />
          <CoverOverlay />
          <View className="absolute inset-x-0 bottom-0 z-10 px-5 pb-5 pt-6">
            <View className="flex-row items-center gap-2">
              <CategoryBadge category={post.category} />
              <Text className="text-xs font-mono tracking-wide text-base-content/70">
                {formatDate(post.date, "long")}
              </Text>
            </View>
            <Text
              className="mt-3 text-2xl font-bold leading-tight tracking-tight text-base-content"
              numberOfLines={3}
            >
              {post.title}
            </Text>
            {post.description && (
              <Text
                className="mt-2 text-sm leading-relaxed text-base-content/70"
                numberOfLines={2}
              >
                {post.description}
              </Text>
            )}
          </View>
        </View>
      ) : (
        <View className="glass-panel p-5">
          <View className="flex-row items-center gap-2">
            <CategoryBadge category={post.category} />
            <Text className="text-xs font-mono tracking-wide text-muted">
              {formatDate(post.date, "long")}
            </Text>
          </View>
          <Text
            className="mt-3 text-2xl font-bold leading-tight tracking-tight text-foreground"
            numberOfLines={3}
          >
            {post.title}
          </Text>
          {post.description && (
            <Text
              className="mt-2.5 max-w-lg text-sm leading-relaxed text-soft"
              numberOfLines={2}
            >
              {post.description}
            </Text>
          )}
          <View className="mt-3 flex-row items-center gap-2">
            <Text className="font-mono text-[0.7rem] tracking-[0.12em] uppercase text-dim">
              {SITE.author.name}
            </Text>
            <Text className="text-base-content/20">·</Text>
            <Text className="font-mono text-[0.7rem] tracking-[0.12em] uppercase text-dim">
              {Math.max(1, Math.ceil((post.description?.split(/\s+/).length ?? 0) / 200))} min read
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}
