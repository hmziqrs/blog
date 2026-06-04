import { ActivityIndicator, FlatList, RefreshControl, Text, View } from "react-native";

import { PostCard } from "./post-card";
import { ErrorState } from "./screen-state";
import type { PostSummary } from "@/lib/types";

interface PostListProps {
  posts: PostSummary[];
  loading?: boolean;
  refreshing?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onRefresh?: () => void;
  onRetry?: () => void;
}

export function PostList({
  posts,
  loading,
  refreshing,
  error,
  emptyMessage = "No posts yet. Check back soon.",
  onRefresh,
  onRetry,
}: PostListProps) {
  if (loading && posts.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error && posts.length === 0) {
    return <ErrorState message={error} onRetry={onRetry} className="py-12" />;
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
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} />
        ) : undefined
      }
      contentContainerStyle={{ gap: 16 }}
    />
  );
}
