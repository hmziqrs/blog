import { router } from "expo-router";
import { Linking, Pressable, Text, View } from "react-native";

import { ThemeToggle } from "./theme-toggle";
import { triggerSelectionHaptic } from "@/lib/haptics";
import { SITE } from "@/lib/site";

interface ScreenHeaderProps {
  showThemeToggle?: boolean;
}

export function ScreenHeader({ showThemeToggle = true }: ScreenHeaderProps) {
  return (
    <View className="border-b border-base-300/80 bg-base-100/92 px-4 py-3">
      <View className="flex-row items-center justify-between gap-3">
        <Pressable
          onPress={() => {
            triggerSelectionHaptic();
            router.push("/(tabs)");
          }}
          className="active:opacity-70"
        >
          <Text className="text-base font-medium tracking-body text-foreground active:text-primary">
            {SITE.name}
          </Text>
        </Pressable>
        <View className="flex-row items-center gap-1">
          {SITE.primaryNav.map((link) => (
            <Pressable
              key={link.href}
              onPress={() => {
                triggerSelectionHaptic();
                if (link.href.includes("/about")) router.push("/(tabs)/about");
                else if (link.href.includes("/contact")) router.push("/contact");
                else Linking.openURL(link.href).catch(() => {});
              }}
              className="rounded-full px-2.5 py-1.5 active:bg-base-200"
            >
              <Text className="font-mono text-xs tracking-[0.14em] uppercase text-soft active:text-primary">
                {link.label}
              </Text>
            </Pressable>
          ))}
          {showThemeToggle && <ThemeToggle />}
        </View>
      </View>
    </View>
  );
}
