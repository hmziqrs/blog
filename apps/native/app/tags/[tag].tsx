import { useLocalSearchParams } from "expo-router";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import { PostCard } from "@/components/post-card";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { getTagPosts } from "@/lib/api";
import { useApi } from "@/lib/hooks";

export default function TagPostsScreen() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const decodedTag = decodeURIComponent(tag ?? "");
  const { data, loading, refreshing, error, refetch } = useApi(
    () => getTagPosts(decodedTag),
    [decodedTag],
  );
  const insets = useSafeAreaInsets();

  if (loading && !data) {
    return (
      <Container isScrollable={false}>
        <LoadingState />
      </Container>
    );
  }

  if (error && !data) {
    return (
      <Container isScrollable={false}>
        <ErrorState message={error} onRetry={refetch} />
      </Container>
    );
  }

  const posts = data?.posts ?? [];

  return (
    <Container isScrollable={false}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} />}
        ListHeaderComponent={
          <View className="px-4 pt-4 pb-2">
            <PageHeader title={decodedTag} description={`Posts tagged with "${decodedTag}"`} />
          </View>
        }
        ListEmptyComponent={
          <View className="px-4">
            <Text className="text-sm text-base-content/40">
              No posts found with tag "{decodedTag}".
            </Text>
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
