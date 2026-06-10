import { useLocalSearchParams } from "expo-router";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryNav } from "@/components/category-nav";
import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import { PostCard } from "@/components/post-card";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { getCategories, getCategoryPosts } from "@/lib/api";
import { useApi } from "@/lib/hooks";

export default function CategoryPostsScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const decodedCategory = decodeURIComponent(category ?? "");
  const { data, loading, refreshing, error, refetch } = useApi(
    () => getCategoryPosts(decodedCategory),
    [decodedCategory],
  );
  const categories = useApi(() => getCategories());
  const insets = useSafeAreaInsets();

  if ((loading && !data) || (categories.loading && !categories.data)) {
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
  const categoryNames = (categories.data?.categories.map((c) => c.category) ?? []).sort((a, b) =>
    a.localeCompare(b),
  );

  return (
    <Container isScrollable={false}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} />}
        ListHeaderComponent={
          <View className="gap-4 pb-2 pt-4">
            <PageHeader
              title={decodedCategory}
              description={`Posts in "${decodedCategory}" category`}
            />
            <CategoryNav categories={categoryNames} active={decodedCategory} />
          </View>
        }
        ListEmptyComponent={
          <View>
            <Text className="text-sm text-muted">
              No posts found in category "{decodedCategory}".
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
