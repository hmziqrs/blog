import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import { ActivityIndicator } from "react-native";
import { getPageConfig } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { AboutPageConfig } from "@/lib/types";

export default function AboutScreen() {
  const { data, loading, error } = useApi(() => getPageConfig("about"));
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <Container isScrollable={false}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container isScrollable={false} className="px-4">
        <PageHeader title="About" />
        <Text className="text-sm text-red-500">{error ?? "Failed to load page"}</Text>
      </Container>
    );
  }

  const config = data.config as AboutPageConfig;

  return (
    <Container isScrollable={false}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 24,
          paddingBottom: insets.bottom + 24,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <PageHeader title={config.title} description={config.description} />

        {config.paragraphs.map((paragraph, i) => (
          <Text key={i} className="text-base leading-7 text-base-content/80">
            {paragraph}
          </Text>
        ))}

        <View className="mt-2 flex-row flex-wrap gap-2">
          <Pressable
            onPress={() => router.push("/(tabs)/explore")}
            className="items-center justify-center rounded-full border border-base-300 bg-base-100/80 active:border-primary active:bg-primary/8 px-3.5 py-2"
          >
            <Text className="font-mono font-medium tracking-[0.01em] text-xs text-base-content/72">Tags</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/(tabs)/explore")}
            className="items-center justify-center rounded-full border border-primary/18 bg-primary/12 active:border-primary/28 active:bg-primary/18 px-3.5 py-2"
          >
            <Text className="font-mono font-medium tracking-[0.01em] text-xs text-primary">Categories</Text>
          </Pressable>
        </View>

        <View className="mt-4 border-t border-base-content/10 pt-4 gap-1">
          <Pressable onPress={() => router.push("/contact")}>
            <Text className="py-1.5 font-mono text-[0.72rem] font-semibold tracking-[0.14em] uppercase text-primary">Contact</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/privacy")}>
            <Text className="py-1.5 font-mono text-[0.72rem] font-semibold tracking-[0.14em] uppercase text-primary">Privacy</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/terms")}>
            <Text className="py-1.5 font-mono text-[0.72rem] font-semibold tracking-[0.14em] uppercase text-primary">Terms</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Container>
  );
}
