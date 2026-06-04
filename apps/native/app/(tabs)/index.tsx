import { FlatList, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/components/container";
import { PostCard } from "@/components/post-card";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { ScreenHeader } from "@/components/screen-header";
import { SiteFooter } from "@/components/site-footer";
import { getPosts } from "@/lib/api";
import { useApi } from "@/lib/hooks";

export default function HomeScreen() {
  const { data, loading, refreshing, error, refetch } = useApi(() => getPosts());
  const posts = data?.posts ?? [];
  const insets = useSafeAreaInsets();

  if (loading && !data) {
    return (
      <Container isScrollable={false}>
        <ScreenHeader />
        <LoadingState />
      </Container>
    );
  }

  if (error && !data) {
    return (
      <Container isScrollable={false}>
        <ScreenHeader />
        <ErrorState message={error} onRetry={refetch} />
      </Container>
    );
  }

  return (
    <Container isScrollable={false}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} />}
        ListHeaderComponent={<ScreenHeader />}
        ListFooterComponent={
          <View className="px-4 pt-4">
            <SiteFooter />
          </View>
        }
        ListEmptyComponent={
          <View className="px-4">
            <Text className="text-sm text-muted">No posts yet. Check back soon.</Text>
          </View>
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
          gap: 20,
        }}
      />
    </Container>
  );
}
