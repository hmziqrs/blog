import { ScrollView, Text, View } from "react-native";

import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import { Chip } from "heroui-native/chip";
import { ActivityIndicator } from "react-native";
import { getPageConfig } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { LegalPageConfig } from "@/lib/types";

export default function TermsScreen() {
  const { data, loading, error } = useApi(() => getPageConfig("terms"));

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
        <PageHeader title="Terms" />
        <Text className="text-sm text-red-500">{error ?? "Failed to load page"}</Text>
      </Container>
    );
  }

  const config = data.config as LegalPageConfig;

  return (
    <Container isScrollable={false}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 32,
          gap: 20,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <PageHeader title={config.title} description={config.description} />

        <View className="flex-row items-center gap-3">
          <Chip variant="secondary" size="sm">
            <Chip.Label>{config.badgeLabel}</Chip.Label>
          </Chip>
          <Text className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-base-content/48">
            Effective {config.effectiveDate}
          </Text>
        </View>

        {config.preamble.map((paragraph, i) => (
          <Text key={i} className="text-base leading-7 text-base-content/80">
            {paragraph}
          </Text>
        ))}

        {config.sections.map((section, i) => (
          <View key={i}>
            <Text className="mb-2 text-lg font-semibold text-foreground">{section.title}</Text>
            <Text className="text-base leading-7 text-base-content/78">{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </Container>
  );
}
