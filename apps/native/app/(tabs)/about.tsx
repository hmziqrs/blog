import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import { getPageConfig } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { AboutPageConfig } from "@/lib/types";

export default function AboutScreen() {
  const { data, loading, error } = useApi(() => getPageConfig("about"));

  if (loading) {
    return (
      <Container className="px-4 pb-4">
        <View className="flex-1 items-center justify-center py-12">
          <ActivityIndicator size="large" />
        </View>
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container className="px-4 pb-4">
        <PageHeader title="About" />
        <Text className="text-sm text-red-500">
          {error ?? "Failed to load page"}
        </Text>
      </Container>
    );
  }

  const config = data.config as AboutPageConfig;

  return (
    <Container className="px-4 pb-4">
      <PageHeader title={config.title} description={config.description} />
      <ScrollView
        contentContainerStyle={{ gap: 16 }}
        scrollEnabled={false}
      >
        {config.paragraphs.map((paragraph, i) => (
          <Text key={i} className="text-base leading-7 text-base-content/80">
            {paragraph}
          </Text>
        ))}

        <View className="mt-4 flex-row flex-wrap gap-3">
          <Pressable
            onPress={() => router.push("/(tabs)/explore")}
            className="rounded-full border border-base-content/12 bg-base-200/60 px-4 py-2 active:opacity-70"
          >
            <Text className="font-mono text-[0.72rem] tracking-[0.14em] uppercase text-base-content/72">
              Tags
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/(tabs)/explore")}
            className="rounded-full border border-primary/25 bg-primary/8 px-4 py-2 active:opacity-70"
          >
            <Text className="font-mono text-[0.72rem] tracking-[0.14em] uppercase text-primary">
              Categories
            </Text>
          </Pressable>
        </View>

        <View className="mt-4 border-t border-base-content/10 pt-4">
          <Pressable onPress={() => router.push("/contact")} className="mb-3">
            <Text className="text-sm font-medium text-primary">Contact</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/privacy")} className="mb-3">
            <Text className="text-sm font-medium text-primary">Privacy</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/terms")}>
            <Text className="text-sm font-medium text-primary">Terms</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Container>
  );
}
