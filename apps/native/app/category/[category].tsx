import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import { PostList } from "@/components/post-list";
import { getCategoryPosts } from "@/lib/api";
import { useApi } from "@/lib/hooks";

export default function CategoryPostsScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const decodedCategory = decodeURIComponent(category ?? "");
  const { data, loading, error } = useApi(
    () => getCategoryPosts(decodedCategory),
    [decodedCategory],
  );

  return (
    <Container className="px-4 pb-4">
      <PageHeader
        title={decodedCategory}
        description={`Posts in "${decodedCategory}" category`}
      />
      <PostList
        posts={data?.posts ?? []}
        loading={loading}
        error={error}
        emptyMessage={`No posts found in category "${decodedCategory}".`}
      />
    </Container>
  );
}
