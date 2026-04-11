import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import { getPageConfig } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { LegalPageConfig } from "@/lib/types";

export default function PrivacyScreen() {
  const { data, loading, error } = useApi(() => getPageConfig("privacy"));

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
        <PageHeader title="Privacy" />
        <Text className="text-sm text-red-500">
          {error ?? "Failed to load page"}
        </Text>
      </Container>
    );
  }

  const config = data.config as LegalPageConfig;

  return (
    <Container className="px-4 pb-4">
      <PageHeader title={config.title} description={config.description} />

      <View className="mb-6 flex-row flex-wrap items-center gap-3">
        <View className="rounded-full border border-base-content/12 bg-base-200 px-3 py-1">
          <Text className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-base-content/62">
            {config.badgeLabel}
          </Text>
        </View>
        <Text className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-base-content/48">
          Effective {config.effectiveDate}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ gap: 20 }}
        scrollEnabled={false}
      >
        {config.preamble.map((paragraph, i) => (
          <Text key={i} className="text-base leading-7 text-base-content/80">
            {paragraph}
          </Text>
        ))}

        {config.sections.map((section, i) => (
          <View key={i} className="mt-2">
            <Text className="mb-2 text-lg font-semibold text-foreground">
              {section.title}
            </Text>
            <Text className="text-base leading-7 text-base-content/78">
              {section.body}
            </Text>
          </View>
        ))}
      </ScrollView>
    </Container>
  );
}
