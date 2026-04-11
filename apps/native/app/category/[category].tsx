import { useLocalSearchParams } from "expo-router";
import { FlatList, Text, View } from "react-native";

import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import { PostCard } from "@/components/post-card";
import { ActivityIndicator } from "react-native";
import { getCategoryPosts } from "@/lib/api";
import { useApi } from "@/lib/hooks";

export default function CategoryPostsScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const decodedCategory = decodeURIComponent(category ?? "");
  const { data, loading, error } = useApi(
    () => getCategoryPosts(decodedCategory),
    [decodedCategory],
  );

  if (loading) {
    return (
      <Container isScrollable={false}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </Container>
    );
  }

  if (error) {
    return (
      <Container isScrollable={false} className="px-4">
        <PageHeader title={decodedCategory} />
        <Text className="text-sm text-red-500">{error}</Text>
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
        ListHeaderComponent={
          <View className="px-4 pt-4 pb-2">
            <PageHeader
              title={decodedCategory}
              description={`Posts in "${decodedCategory}" category`}
            />
          </View>
        }
        ListEmptyComponent={
          <View className="px-4">
            <Text className="text-sm text-base-content/40">
              No posts found in category "{decodedCategory}".
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 16 }}
      />
    </Container>
  );
}
