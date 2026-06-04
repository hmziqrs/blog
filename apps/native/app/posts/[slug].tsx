import { useLocalSearchParams } from "expo-router";
import { useThemeColor } from "heroui-native";
import { Image, Linking, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Markdown from "react-native-markdown-display";

import { AuthorBlock } from "@/components/author-block";
import { CategoryBadge } from "@/components/category-badge";
import { Container } from "@/components/container";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { RelatedPosts } from "@/components/related-posts";
import { SharePost } from "@/components/share-post";
import { TableOfContents } from "@/components/table-of-contents";
import { TagBadge } from "@/components/tag-badge";
import { getPost, getPosts } from "@/lib/api";
import { estimateReadingTime, formatDate } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { extractHeadings } from "@/lib/markdown";
import { getRelatedPosts } from "@/lib/related-posts";
import { postUrl, SITE } from "@/lib/site";

export default function PostDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: post, loading, error, refetch } = useApi(() => getPost(slug!), [slug]);
  const { data: allPostsData } = useApi(() => getPosts());
  const foreground = useThemeColor("foreground");
  const surfaceTertiary = useThemeColor("surface-tertiary");
  const separator = useThemeColor("separator");
  const link = useThemeColor("link");
  const insets = useSafeAreaInsets();

  if (loading && !post) {
    return (
      <Container isScrollable={false}>
        <LoadingState />
      </Container>
    );
  }

  if (error || !post) {
    return (
      <Container isScrollable={false}>
        <ErrorState message={error ?? "Post not found"} onRetry={refetch} />
      </Container>
    );
  }

  const readingTime = estimateReadingTime(post.body ?? "");
  const headings = extractHeadings(post.body ?? "");
  const related = getRelatedPosts(
    post.id,
    post.tags,
    post.category,
    allPostsData?.posts ?? [],
  );
  const shareUrl = postUrl(post.id);

  const markdownStyles = {
    body: { color: foreground, fontSize: 16.5, lineHeight: 32 },
    heading1: {
      color: foreground,
      fontSize: 28,
      fontWeight: "600" as const,
      marginTop: 24,
      marginBottom: 8,
    },
    heading2: {
      color: foreground,
      fontSize: 22,
      fontWeight: "600" as const,
      marginTop: 20,
      marginBottom: 8,
    },
    heading3: {
      color: foreground,
      fontSize: 18,
      fontWeight: "600" as const,
      marginTop: 16,
      marginBottom: 6,
    },
    paragraph: { marginTop: 8, marginBottom: 8 },
    bullet_list: { marginTop: 4, marginBottom: 4 },
    ordered_list: { marginTop: 4, marginBottom: 4 },
    code_inline: {
      fontFamily: "monospace",
      fontSize: 14,
      color: foreground,
      borderWidth: 1,
      borderColor: `${foreground}20`,
      backgroundColor: surfaceTertiary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    code_block: {
      fontFamily: "monospace",
      fontSize: 14,
      color: foreground,
      backgroundColor: surfaceTertiary,
      padding: 12,
      borderRadius: 8,
      marginTop: 8,
      marginBottom: 8,
    },
    fence: {
      fontFamily: "monospace",
      fontSize: 14,
      color: foreground,
      backgroundColor: surfaceTertiary,
      padding: 12,
      borderRadius: 8,
      marginTop: 8,
      marginBottom: 8,
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: separator,
      paddingLeft: 12,
      marginTop: 8,
      marginBottom: 8,
    },
    link: { color: link, textDecorationLine: "underline" as const },
  };

  return (
    <Container isScrollable={false}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <View className="px-4 pt-4">
          <CategoryBadge category={post.category} />
          <Text className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
            {post.title}
          </Text>
          <Text className="mt-4 max-w-2xl text-lg leading-8 text-soft">{post.description}</Text>
          <View className="mt-5 flex-row flex-wrap items-center gap-3">
            <Text className="font-mono text-xs tracking-[0.08em] uppercase text-muted">
              {formatDate(post.date, "long")}
            </Text>
            <Text className="text-base-content/30">·</Text>
            <Text className="font-mono text-xs tracking-[0.08em] uppercase text-muted">
              {readingTime} min read
            </Text>
            {post.updated && (
              <>
                <Text className="text-base-content/30">·</Text>
                <Text className="font-mono text-xs tracking-[0.08em] uppercase text-muted">
                  Updated {formatDate(post.updated, "long")}
                </Text>
              </>
            )}
          </View>
          {post.tags.length > 0 && (
            <View className="mt-5 flex-row flex-wrap gap-2">
              {post.tags.map((tag) => (
                <TagBadge key={tag} tag={tag} />
              ))}
            </View>
          )}
        </View>

        {post.cover && (
          <View className="mt-8 overflow-hidden bg-base-200/55">
            <Image
              source={{ uri: post.cover }}
              alt={post.cover_alt ?? post.title}
              className="h-auto w-full"
              style={{ minHeight: 200 }}
              resizeMode="cover"
            />
          </View>
        )}

        <View className="px-4 pt-6">
          <TableOfContents headings={headings} />

          <Markdown
            onLinkPress={(url) => {
              const resolved =
                url.startsWith("http://") || url.startsWith("https://")
                  ? url
                  : new URL(url, SITE.url).toString();
              Linking.openURL(resolved).catch(() => {});
              return false;
            }}
            style={markdownStyles}
          >
            {post.body ?? ""}
          </Markdown>

          <RelatedPosts posts={related} />

          <View className="my-10 h-px bg-base-content/10" />
          <SharePost title={post.title} url={shareUrl} />
          <View className="my-10 h-px bg-base-content/10" />

          <AuthorBlock />
        </View>
      </ScrollView>
    </Container>
  );
}
