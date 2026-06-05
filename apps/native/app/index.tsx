import { FlatList, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { HeroPostCard } from "@/components/hero-post-card";
import { PostCard } from "@/components/post-card";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { getPosts } from "@/lib/api";
import { useApi } from "@/lib/hooks";

export default function HomeScreen() {
  const { data, loading, refreshing, error, refetch } = useApi(() => getPosts());
  const posts = data?.posts ?? [];
  const insets = useSafeAreaInsets();

  const heroPost = posts[0];
  const recentPosts = posts.slice(1);

  if (loading && !data) {
    return (
      <View className="flex-1 bg-base-100">
        <AppHeader />
        <LoadingState />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View className="flex-1 bg-base-100">
        <AppHeader />
        <ErrorState message={error} onRetry={refetch} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-base-100">
      <AppHeader />
      <FlatList
        data={recentPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} />}
        ListHeaderComponent={
          <View>
            {heroPost ? (
              <View className="px-4 pt-2">
                <HeroPostCard post={heroPost} />
              </View>
            ) : null}
            {recentPosts.length > 0 ? (
              <View className="px-4 pt-6 pb-1">
                <Text className="text-sm font-semibold text-dim">Latest</Text>
              </View>
            ) : null}
          </View>
        }
        ListFooterComponent={<View style={{ height: insets.bottom + 24 }} />}
        ListEmptyComponent={
          heroPost ? null : (
            <View className="px-4 pt-4">
              <Text className="text-sm text-muted">No posts yet.</Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
