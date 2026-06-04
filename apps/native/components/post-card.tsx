import { router } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";

import { CoverOverlay } from "./cover-overlay";
import { CategoryBadge } from "./category-badge";
import { TagBadge } from "./tag-badge";
import { formatDate } from "@/lib/format";
import { triggerSelectionHaptic } from "@/lib/haptics";
import { SITE } from "@/lib/site";
import type { PostSummary } from "@/lib/types";

interface PostCardProps {
  post: PostSummary;
}

export function PostCard({ post }: PostCardProps) {
  return (
    <Pressable
      onPress={() => {
        triggerSelectionHaptic();
        router.push(`/posts/${post.id}`);
      }}
      className="overflow-hidden rounded-[1.5rem] border border-base-300 bg-base-200/55 active:border-base-content/18 active:bg-base-200"
    >
      {post.cover ? (
        <View className="relative min-h-[22rem] overflow-hidden bg-base-100">
          <Image
            source={{ uri: post.cover }}
            alt={post.cover_alt ?? post.title}
            className="absolute inset-0 h-full w-full"
            resizeMode="cover"
          />
          <CoverOverlay />
          <View className="absolute inset-x-0 bottom-0 z-10 px-4 pb-3 pt-4">
            <PostCardInfo post={post} withCover />
          </View>
        </View>
      ) : (
        <View className="p-4 sm:p-5">
          <PostCardInfo post={post} />
        </View>
      )}
    </Pressable>
  );
}

function PostCardInfo({
  post,
  withCover = false,
}: PostCardProps & { withCover?: boolean }) {
  return (
    <View>
      <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
        <Text className="font-mono text-[0.7rem] tracking-[0.12em] uppercase text-muted">
          {formatDate(post.date)}
        </Text>
        <Text className="text-base-content/30">/</Text>
        <CategoryBadge category={post.category} />
        <Text className="text-base-content/30">/</Text>
        <Text className="font-mono text-[0.7rem] tracking-[0.12em] uppercase text-dim">
          {SITE.author.name}
        </Text>
      </View>
      <Text
        className={`mt-3 font-semibold leading-tight tracking-tight text-foreground ${
          withCover ? "text-[1.36rem]" : "text-[1.32rem]"
        }`}
        numberOfLines={2}
      >
        {post.title}
      </Text>
      <Text
        className={`mt-2.5 max-w-2xl text-sm leading-6 ${withCover ? "text-base-content/76" : "text-soft"}`}
        numberOfLines={2}
      >
        {post.description}
      </Text>
      {post.tags.length > 0 && (
        <View className={`flex-row flex-wrap gap-2 ${withCover ? "mt-3" : "mt-4"}`}>
          {post.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </View>
      )}
    </View>
  );
}
