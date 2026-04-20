import { ActivityIndicator, FlatList, Text, View } from "react-native";

import { PostCard } from "./post-card";
import type { PostSummary } from "@/lib/types";

interface PostListProps {
  posts: PostSummary[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
}

export function PostList({
  posts,
  loading,
  error,
  emptyMessage = "No posts yet. Check back soon.",
}: PostListProps) {
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <Text className="text-sm text-red-500">{error}</Text>
      </View>
    );
  }

  if (posts.length === 0) {
    return <Text className="text-sm text-base-content/40">{emptyMessage}</Text>;
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <PostCard post={item} />}
      scrollEnabled={false}
      contentContainerStyle={{ gap: 16 }}
    />
  );
}
