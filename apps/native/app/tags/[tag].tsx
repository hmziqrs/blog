import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import { PostList } from "@/components/post-list";
import { getTagPosts } from "@/lib/api";
import { useApi } from "@/lib/hooks";

export default function TagPostsScreen() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const decodedTag = decodeURIComponent(tag ?? "");
  const { data, loading, error } = useApi(() => getTagPosts(decodedTag), [decodedTag]);

  return (
    <Container className="px-4 pb-4">
      <PageHeader title={decodedTag} description={`Posts tagged with "${decodedTag}"`} />
      <PostList
        posts={data?.posts ?? []}
        loading={loading}
        error={error}
        emptyMessage={`No posts found with tag "${decodedTag}".`}
      />
    </Container>
  );
}
