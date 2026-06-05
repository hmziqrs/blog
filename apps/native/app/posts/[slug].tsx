import { router, useLocalSearchParams } from "expo-router";
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
    body: { color: foreground, fontSize: 16, lineHeight: 28 },
    heading1: {
      color: foreground,
      fontSize: 24,
      fontWeight: "700" as const,
      marginTop: 28,
      marginBottom: 8,
    },
    heading2: {
      color: foreground,
      fontSize: 20,
      fontWeight: "600" as const,
      marginTop: 24,
      marginBottom: 8,
    },
    heading3: {
      color: foreground,
      fontSize: 17,
      fontWeight: "600" as const,
      marginTop: 16,
      marginBottom: 6,
    },
    paragraph: { marginTop: 6, marginBottom: 6 },
    bullet_list: { marginTop: 4, marginBottom: 4 },
    ordered_list: { marginTop: 4, marginBottom: 4 },
    code_inline: {
      fontFamily: "monospace",
      fontSize: 13,
      color: foreground,
      backgroundColor: surfaceTertiary,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    code_block: {
      fontFamily: "monospace",
      fontSize: 13,
      color: foreground,
      backgroundColor: surfaceTertiary,
      padding: 14,
      borderRadius: 12,
      marginTop: 10,
      marginBottom: 10,
    },
    fence: {
      fontFamily: "monospace",
      fontSize: 13,
      color: foreground,
      backgroundColor: surfaceTertiary,
      padding: 14,
      borderRadius: 12,
      marginTop: 10,
      marginBottom: 10,
    },
    blockquote: {
      borderLeftWidth: 2,
      borderLeftColor: separator,
      paddingLeft: 12,
      marginTop: 8,
      marginBottom: 8,
    },
    link: { color: link },
  };

  function handleMarkdownLink(url: string) {
    const resolved =
      url.startsWith("http://") || url.startsWith("https://")
        ? url
        : new URL(url, SITE.url).toString();

    try {
      const parsed = new URL(resolved);
      const siteHost = new URL(SITE.url).host;
      if (parsed.host === siteHost) {
        const path = parsed.pathname;
        const postMatch = path.match(/^\/posts\/(.+)$/);
        if (postMatch) { router.push(`/posts/${postMatch[1]}`); return false; }
        const tagMatch = path.match(/^\/tags\/(.+)$/);
        if (tagMatch) { router.push(`/tags/${tagMatch[1]}`); return false; }
        const catMatch = path.match(/^\/category\/(.+)$/);
        if (catMatch) { router.push(`/category/${catMatch[1]}`); return false; }
        if (["/explore", "/about", "/contact", "/privacy", "/terms"].includes(path)) {
          router.push(path as any); return false;
        }
        if (path === "/" || path === "") { router.push("/"); return false; }
      }
    } catch { /* fall through */ }

    Linking.openURL(resolved).catch(() => {});
    return false;
  }

  return (
    <Container isScrollable={false}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Post header */}
        <View className="px-4 pt-2">
          <View className="flex-row items-center gap-2">
            <CategoryBadge category={post.category} />
            <Text className="text-[0.65rem] font-mono tracking-wide text-dim">
              {formatDate(post.date)} · {readingTime} min
            </Text>
          </View>
          <Text className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {post.title}
          </Text>
          {post.description && (
            <Text className="mt-2 text-[0.88rem] leading-6 text-soft">
              {post.description}
            </Text>
          )}
          {post.tags.length > 0 && (
            <View className="mt-3 flex-row flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <TagBadge key={tag} tag={tag} size="sm" />
              ))}
            </View>
          )}
        </View>

        {/* Cover image */}
        {post.cover && (
          <View className="mt-5 mx-4 overflow-hidden rounded-2xl bg-base-200">
            <Image
              source={{ uri: post.cover }}
              alt={post.cover_alt ?? post.title}
              className="h-auto w-full"
              style={{ minHeight: 180 }}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Body */}
        <View className="px-4 pt-6">
          <TableOfContents headings={headings} />
          <Markdown onLinkPress={handleMarkdownLink} style={markdownStyles}>
            {post.body ?? ""}
          </Markdown>
        </View>

        {/* Bottom section */}
        <View className="px-4 pt-6">
          <RelatedPosts posts={related} />
          <View className="mt-8 mb-6 h-px bg-base-content/6" />
          <SharePost title={post.title} url={shareUrl} />
          <View className="mt-6" />
          <AuthorBlock />
        </View>
      </ScrollView>
    </Container>
  );
}
