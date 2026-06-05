import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { ButtonLink } from "@/components/button-link";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { InlineNewsletter } from "@/components/inline-newsletter";
import { SiteFooter } from "@/components/site-footer";
import { getPageConfig } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { AboutPageConfig } from "@/lib/types";

export default function AboutScreen() {
  const { data, loading, error, refetch } = useApi(() => getPageConfig("about"));
  const insets = useSafeAreaInsets();

  if (loading && !data) {
    return (
      <View className="flex-1 bg-base-100">
        <AppHeader />
        <LoadingState />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View className="flex-1 bg-base-100">
        <AppHeader />
        <ErrorState message={error ?? "Failed to load page"} onRetry={refetch} />
      </View>
    );
  }

  const config = data.config as AboutPageConfig;

  return (
    <View className="flex-1 bg-base-100">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppHeader />

        <View className="max-w-3xl gap-4 pt-4">
          {config.paragraphs.map((paragraph, i) => (
            <Text key={i} className="max-w-2xl text-base leading-7 tracking-body text-base-content">
              {paragraph}
            </Text>
          ))}

          {config.focusAreas.length > 0 && (
            <View className="mt-8">
              <Text className="mb-4 text-xl font-semibold text-foreground">Focus Areas</Text>
              <View className="gap-4">
                {config.focusAreas.map((area) => (
                  <View
                    key={area.title}
                    className="rounded-2xl border border-base-content/8 bg-base-200/50 p-5"
                  >
                    <Text className="font-medium text-foreground">{area.title}</Text>
                    <Text className="mt-1.5 text-sm leading-relaxed text-soft">{area.body}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {config.principles.length > 0 && (
            <View className="mt-8">
              <Text className="mb-4 text-xl font-semibold text-foreground">Principles</Text>
              <View className="gap-3">
                {config.principles.map((principle) => (
                  <View key={principle.title} className="flex-row gap-3">
                    <Text className="mt-0.5 text-lg text-primary">→</Text>
                    <View className="flex-1">
                      <Text className="font-medium text-foreground">{principle.title}</Text>
                      <Text className="text-sm text-soft">{principle.body}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View className="mt-6 flex-row flex-wrap gap-2">
            <ButtonLink
              onPress={() => router.push("/explore")}
              className="font-mono uppercase tracking-[0.14em]"
            >
              Tags
            </ButtonLink>
            <ButtonLink
              variant="primary"
              onPress={() => router.push("/explore")}
              className="font-mono uppercase tracking-[0.14em]"
            >
              Categories
            </ButtonLink>
          </View>

          <View className="mt-12">
            <InlineNewsletter />
          </View>

          <SiteFooter />
        </View>
      </ScrollView>
    </View>
  );
}
