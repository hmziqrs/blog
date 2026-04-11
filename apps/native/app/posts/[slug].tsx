import { useLocalSearchParams } from "expo-router";
import { Image, ScrollView, Text, View } from "react-native";
import Markdown from "react-native-markdown-display";

import { CategoryBadge } from "@/components/category-badge";
import { Container } from "@/components/container";
import { TagBadge } from "@/components/tag-badge";
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

  if (loading || !post) {
    return (
      <Container className="px-4 pb-4">
        <View className="flex-1 items-center justify-center py-12">
          <Text className="text-sm text-base-content/40">
            {error ?? "Loading..."}
          </Text>
        </View>
      </Container>
    );
  }

  const readingTime = estimateReadingTime(post.body ?? "");

  return (
    <Container className="pb-0">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-4 pt-4">
          <CategoryBadge category={post.category} />
          <Text className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
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
          <View className="mt-6 overflow-hidden">
            <Image
              source={{ uri: post.cover }}
              alt={post.cover_alt ?? post.title}
              className="h-56 w-full"
              resizeMode="cover"
            />
          </View>
        )}

        <View className="px-4 pt-6">
          <Markdown
            style={{
              body: {
                color: undefined,
                fontSize: 16,
                lineHeight: 28,
              },
              heading1: {
                fontSize: 28,
                fontWeight: "600" as const,
                marginTop: 24,
                marginBottom: 8,
              },
              heading2: {
                fontSize: 22,
                fontWeight: "600" as const,
                marginTop: 20,
                marginBottom: 8,
              },
              heading3: {
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
              },
              code_block: {
                fontFamily: "monospace",
                fontSize: 14,
                backgroundColor: "rgba(128,128,128,0.1)",
                padding: 12,
                borderRadius: 8,
                marginTop: 8,
                marginBottom: 8,
              },
              blockquote: {
                borderLeftWidth: 3,
                borderLeftColor: "rgba(128,128,128,0.3)",
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
