import { useLocalSearchParams } from "expo-router";
import { useThemeColor } from "heroui-native";
import { Image, ScrollView, Text, View } from "react-native";
import Markdown from "react-native-markdown-display";

import { CategoryBadge } from "@/components/category-badge";
import { Container } from "@/components/container";
import { TagBadge } from "@/components/tag-badge";
import { ActivityIndicator } from "react-native";
import { getPost } from "@/lib/api";
import { useApi } from "@/lib/hooks";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function estimateReadingTime(text: string) {
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export default function PostDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: post, loading, error } = useApi(() => getPost(slug!), [slug]);
  const foreground = useThemeColor("foreground");
  const muted = useThemeColor("muted");

  if (loading || !post) {
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
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-red-500">{error}</Text>
        </View>
      </Container>
    );
  }

  const readingTime = estimateReadingTime(post.body ?? "");

  return (
    <Container isScrollable={false}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-4 pt-4">
          <CategoryBadge category={post.category} />
          <Text className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {post.title}
          </Text>
          <Text className="mt-3 max-w-2xl text-base leading-7 text-base-content/68">
            {post.description}
          </Text>
          <View className="mt-3 flex-row flex-wrap items-center gap-2">
            <Text className="font-mono text-xs tracking-[0.08em] uppercase text-base-content/46">
              {formatDate(post.date)}
            </Text>
            <Text className="text-base-content/30">·</Text>
            <Text className="font-mono text-xs tracking-[0.08em] uppercase text-base-content/46">
              {readingTime} min read
            </Text>
            {post.updated && (
              <>
                <Text className="text-base-content/30">·</Text>
                <Text className="font-mono text-xs tracking-[0.08em] uppercase text-base-content/46">
                  Updated {formatDate(post.updated)}
                </Text>
              </>
            )}
          </View>
          {post.tags.length > 0 && (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {post.tags.map((tag) => (
                <TagBadge key={tag} tag={tag} />
              ))}
            </View>
          )}
        </View>

        {post.cover && (
          <View className="mt-6">
            <Image
              source={{ uri: post.cover }}
              alt={post.cover_alt ?? post.title}
              className="h-56 w-full"
              resizeMode="cover"
            />
          </View>
        )}

        <View className="px-4 pt-6 pb-8">
          <Markdown
            style={{
              body: {
                color: foreground,
                fontSize: 16,
                lineHeight: 28,
              },
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
              paragraph: {
                marginTop: 8,
                marginBottom: 8,
              },
              bullet_list: {
                marginTop: 4,
                marginBottom: 4,
              },
              ordered_list: {
                marginTop: 4,
                marginBottom: 4,
              },
              code_inline: {
                fontFamily: "monospace",
                fontSize: 14,
                color: foreground,
                borderWidth: 0,
                backgroundColor: muted,
                padding: 4,
                borderRadius: 4,
              },
              code_block: {
                fontFamily: "monospace",
                fontSize: 14,
                color: foreground,
                borderWidth: 0,
                backgroundColor: muted,
                padding: 12,
                borderRadius: 8,
                marginTop: 8,
                marginBottom: 8,
              },
              fence: {
                fontFamily: "monospace",
                fontSize: 14,
                color: foreground,
                borderWidth: 0,
                backgroundColor: muted,
                padding: 12,
                borderRadius: 8,
                marginTop: 8,
                marginBottom: 8,
              },
              blockquote: {
                borderLeftWidth: 3,
                borderLeftColor: muted,
                paddingLeft: 12,
                marginTop: 8,
                marginBottom: 8,
              },
              link: {
                textDecorationLine: "underline" as const,
              },
            }}
          >
            {post.body ?? ""}
          </Markdown>
        </View>
      </ScrollView>
    </Container>
  );
}
