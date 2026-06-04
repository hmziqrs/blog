import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { getPageConfig } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { SITE } from "@/lib/site";
import type { LegalPageConfig } from "@/lib/types";

function LegalBadge({ label }: { label: string }) {
  return (
    <View className="rounded-full border border-base-300 bg-base-200 px-3 py-1">
      <Text className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-soft">
        {label}
      </Text>
    </View>
  );
}

export default function PrivacyScreen() {
  const { data, loading, error, refetch } = useApi(() => getPageConfig("privacy"));
  const insets = useSafeAreaInsets();

  if (loading && !data) {
    return (
      <Container isScrollable={false}>
        <LoadingState />
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container isScrollable={false}>
        <ErrorState message={error ?? "Failed to load page"} onRetry={refetch} />
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
          paddingBottom: insets.bottom + 24,
          gap: 20,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <PageHeader title={config.title} description={config.description} className="mb-8" />

        <View className="flex-row flex-wrap items-center gap-3">
          <LegalBadge label={config.badgeLabel} />
          <Text className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-muted">
            Effective {config.effectiveDate}
          </Text>
        </View>

        {config.preamble.map((paragraph, i) => (
          <Text key={i} className="max-w-3xl text-base leading-7 text-base-content/80">
            {paragraph.replaceAll("this site", SITE.name)}
          </Text>
        ))}

        {config.sections.map((section) => (
          <View key={section.title} className="max-w-3xl gap-2">
            <Text className="font-mono text-[0.82rem] font-semibold uppercase tracking-[0.16em] text-base-content/92">
              {section.title}
            </Text>
            <Text className="text-base leading-7 text-base-content/78">
              {section.body.replaceAll("this site", SITE.name)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </Container>
  );
}
