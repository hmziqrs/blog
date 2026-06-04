import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ContactMethodRow } from "@/components/contact-method-row";
import { Container } from "@/components/container";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { ScreenHeader } from "@/components/screen-header";
import { SiteFooter } from "@/components/site-footer";
import { getPageConfig } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { ContactPageConfig } from "@/lib/types";

export default function ContactScreen() {
  const { data, loading, error, refetch } = useApi(() => getPageConfig("contact"));
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

  const config = data.config as ContactPageConfig;

  return (
    <Container isScrollable={false}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="max-w-3xl gap-3 pt-2">
          {config.paragraphs.map((paragraph, index) => (
            <Text
              key={index}
              className={`max-w-2xl text-base leading-7 tracking-body ${
                index === config.paragraphs.length - 1
                  ? "text-base-content"
                  : "text-base-content/78"
              }`}
            >
              {paragraph}
            </Text>
          ))}

          <View className="mt-12 max-w-md gap-2.5">
            {config.methods.map((method) => (
              <ContactMethodRow key={method.label} method={method} />
            ))}
          </View>

          <SiteFooter />
        </View>
      </ScrollView>
    </Container>
  );
}
