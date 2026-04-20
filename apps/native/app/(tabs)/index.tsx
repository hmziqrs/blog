import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/components/container";
import { PostCard } from "@/components/post-card";
import { ActivityIndicator } from "react-native";
import { getPosts } from "@/lib/api";
import { useApi } from "@/lib/hooks";

export default function HomeScreen() {
  const { data, loading, error } = useApi(() => getPosts());
  const posts = data?.posts ?? [];
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <Container isScrollable={false} className="px-4">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </Container>
    );
  }

  if (error) {
    return (
      <Container isScrollable={false} className="px-4">
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-red-500">{error}</Text>
        </View>
      </Container>
    );
  }

  return (
    <Container isScrollable={false}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        ListHeaderComponent={
          <View className="px-4 pt-6 pb-2">
            <Text className="text-3xl font-semibold tracking-tight text-foreground">hmziq.rs</Text>
            <Text className="mt-1 text-sm text-base-content/56">
              Writing about software engineering, tools, and ideas.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="px-4">
            <Text className="text-sm text-base-content/40">No posts yet. Check back soon.</Text>
          </View>
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
          gap: 16,
        }}
      />
    </Container>
  );
}
