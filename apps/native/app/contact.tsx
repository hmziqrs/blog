import { Linking, Pressable, ScrollView, Text, View } from "react-native";

import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import { Surface } from "heroui-native/surface";
import { ActivityIndicator } from "react-native";
import { getPageConfig } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { ContactPageConfig, ContactMethod } from "@/lib/types";

function ContactCard({ method }: { method: ContactMethod }) {
  return (
    <Pressable onPress={() => Linking.openURL(method.href).catch(() => {})} className="flex-1">
      <Surface variant="secondary" className="items-center p-4">
        <Text className="font-mono text-[0.68rem] tracking-[0.16em] uppercase text-base-content/48">
          {method.label}
        </Text>
        <Text className="mt-1 text-sm font-medium text-foreground">{method.value}</Text>
      </Surface>
    </Pressable>
  );
}

export default function ContactScreen() {
  const { data, loading, error } = useApi(() => getPageConfig("contact"));

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
        <PageHeader title="Contact" />
        <Text className="text-sm text-red-500">{error ?? "Failed to load page"}</Text>
      </Container>
    );
  }

  const config = data.config as ContactPageConfig;

  return (
    <Container isScrollable={false}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 32,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <PageHeader title={config.title} description={config.description} />

        {config.paragraphs.map((paragraph, i) => (
          <Text key={i} className="text-base leading-7 text-base-content/78">
            {paragraph}
          </Text>
        ))}

        <View className="mt-2 flex-row flex-wrap gap-3">
          {config.methods.map((method) => (
            <ContactCard key={method.label} method={method} />
          ))}
        </View>
      </ScrollView>
    </Container>
  );
}
