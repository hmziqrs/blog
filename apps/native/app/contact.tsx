import { Linking, ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import { getPageConfig } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { ContactPageConfig, ContactMethod } from "@/lib/types";

function ContactCard({ method }: { method: ContactMethod }) {
  const handlePress = () => {
    Linking.openURL(method.href).catch(() => {});
  };

  return (
    <Pressable
      onPress={handlePress}
      className="items-center justify-center rounded-2xl border border-base-content/10 bg-base-200/60 px-3 py-4 active:opacity-70"
    >
      <Text className="font-mono text-[0.68rem] tracking-[0.16em] uppercase text-base-content/48">
        {method.label}
      </Text>
      <Text className="mt-1 text-sm font-medium tracking-[-0.02em] text-foreground">
        {method.value}
      </Text>
    </Pressable>
  );
}

export default function ContactScreen() {
  const { data, loading, error } = useApi(() => getPageConfig("contact"));

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
        <PageHeader title="Contact" />
        <Text className="text-sm text-red-500">
          {error ?? "Failed to load page"}
        </Text>
      </Container>
    );
  }

  const config = data.config as ContactPageConfig;

  return (
    <Container className="px-4 pb-4">
      <PageHeader title={config.title} description={config.description} />
      <ScrollView
        contentContainerStyle={{ gap: 16 }}
        scrollEnabled={false}
      >
        {config.paragraphs.map((paragraph, i) => (
          <Text key={i} className="text-base leading-7 text-base-content/78">
            {paragraph}
          </Text>
        ))}

        <View className="mt-4 grid grid-cols-2 gap-3">
          {config.methods.map((method) => (
            <ContactCard key={method.label} method={method} />
          ))}
        </View>
      </ScrollView>
    </Container>
  );
}
