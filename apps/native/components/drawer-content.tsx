import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColor } from "heroui-native";

import { ThemeToggle } from "./theme-toggle";
import { triggerSelectionHaptic } from "@/lib/haptics";
import { SITE } from "@/lib/site";

interface DrawerContentProps {
  onClose: () => void;
}

interface NavItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
}

const PRIMARY_NAV: NavItem[] = [
  { label: "Home", icon: "home", href: "/" },
  { label: "Explore", icon: "compass", href: "/explore" },
  { label: "About", icon: "person", href: "/about" },
  { label: "Contact", icon: "mail", href: "/contact" },
];

const SECONDARY_NAV: NavItem[] = [
  { label: "Privacy", icon: "shield", href: "/privacy" },
  { label: "Terms", icon: "document-text", href: "/terms" },
];

export function DrawerContent({ onClose }: DrawerContentProps) {
  const pathname = usePathname();
  const foreground = useThemeColor("foreground");
  const insets = useSafeAreaInsets();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  function navigate(href: string) {
    triggerSelectionHaptic();
    onClose();
    // Small delay so the drawer close animation plays before navigation
    setTimeout(() => router.push(href as any), 180);
  }

  return (
    <View
      className="flex-1"
      style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
    >
      {/* Header */}
      <View className="px-6 pb-6">
        <Text className="text-lg font-semibold tracking-tight text-foreground">{SITE.name}</Text>
        <Text className="mt-1 font-mono text-[0.68rem] tracking-[0.12em] uppercase text-dim">
          {SITE.description}
        </Text>
      </View>

      <View className="mx-4 h-px bg-base-content/8" />

      {/* Primary nav */}
      <View className="gap-1 px-3 pt-4">
        {PRIMARY_NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Pressable
              key={item.href}
              onPress={() => navigate(item.href)}
              className={`flex-row items-center gap-3.5 rounded-xl px-4 py-3.5 active:bg-base-200 ${
                active ? "bg-primary/10" : ""
              }`}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={foreground}
                style={{ opacity: active ? 1 : 0.45 }}
              />
              <Text className={`text-sm font-medium ${active ? "text-primary" : "text-soft"}`}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="mx-4 mt-4 h-px bg-base-content/8" />

      {/* Secondary nav */}
      <View className="gap-1 px-3 pt-4">
        {SECONDARY_NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Pressable
              key={item.href}
              onPress={() => navigate(item.href)}
              className={`flex-row items-center gap-3.5 rounded-xl px-4 py-3 active:bg-base-200 ${
                active ? "bg-primary/10" : ""
              }`}
            >
              <Ionicons
                name={item.icon}
                size={18}
                color={foreground}
                style={{ opacity: active ? 1 : 0.35 }}
              />
              <Text
                className={`text-[0.82rem] font-medium ${active ? "text-primary" : "text-dim"}`}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Footer with theme toggle */}
      <View className="mt-auto px-6 pt-4">
        <View className="mx-0 mb-4 h-px bg-base-content/8" />
        <View className="flex-row items-center justify-between">
          <Text className="text-xs text-faint">
            © {new Date().getFullYear()} {SITE.copyrightSiteName}
          </Text>
          <ThemeToggle />
        </View>
      </View>
    </View>
  );
}
