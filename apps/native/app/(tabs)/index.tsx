import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { PostList } from "@/components/post-list";
import { getPosts } from "@/lib/api";
import { useApi } from "@/lib/hooks";

export default function HomeScreen() {
  const { data, loading, error } = useApi(() => getPosts());

  return (
    <Container className="px-4 pb-4">
      <View className="py-6 mb-2">
        <Text className="text-3xl font-semibold tracking-tight text-foreground">
          hmziq.rs
        </Text>
        <Text className="mt-1 text-sm text-muted">
          Writing about software engineering, tools, and ideas.
        </Text>
      </View>
      <PostList
        posts={data?.posts ?? []}
        loading={loading}
        error={error}
      />
    </Container>
  );
}
