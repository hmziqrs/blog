import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, Text, View } from "react-native";
import { useThemeColor } from "heroui-native";

import { triggerSelectionHaptic } from "@/lib/haptics";
import type { ContactMethod } from "@/lib/types";

const PLATFORM_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  X: "logo-twitter",
  Email: "mail-outline",
  GitHub: "logo-github",
  LinkedIn: "logo-linkedin",
};

interface ContactMethodRowProps {
  method: ContactMethod;
}

export function ContactMethodRow({ method }: ContactMethodRowProps) {
  const foreground = useThemeColor("foreground");

  return (
    <Pressable
      onPress={() => {
        triggerSelectionHaptic();
        Linking.openURL(method.href).catch(() => {});
      }}
      className="flex-row items-center gap-3 rounded-xl border border-base-content/8 bg-base-100 px-5 py-3.5 active:border-base-content/16 active:bg-base-200/30"
    >
      <Ionicons
        name={PLATFORM_ICONS[method.label] ?? "link-outline"}
        size={20}
        color={foreground}
        style={{ opacity: 0.52 }}
      />
      <View className="min-w-0 flex-1">
        <Text className="font-mono text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-dim">
          {method.label}
        </Text>
        <Text className="text-sm text-base-content/78" numberOfLines={1}>
          {method.value}
        </Text>
      </View>
      <Text className="text-xs text-base-content/16">→</Text>
    </Pressable>
  );
}
