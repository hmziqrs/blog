import { Linking, Pressable, Text, View, Image } from "react-native";

import { PageKicker } from "./page-kicker";
import { triggerSelectionHaptic } from "@/lib/haptics";
import { SITE, absoluteUrl } from "@/lib/site";
import { useAppTheme } from "@/contexts/app-theme-context";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";

const SOCIAL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  x: "logo-twitter",
  github: "logo-github",
  linkedin: "logo-linkedin",
  reddit: "logo-reddit",
};

export function AuthorBlock() {
  const { isDark } = useAppTheme();
  const socials = SITE.author.socials ?? [];

  const authorImage = isDark
    ? absoluteUrl("/author-dark.svg")
    : absoluteUrl("/author-light.svg");
  const foreground = useThemeColor("foreground");

  return (
    <View className="flex-row flex-wrap items-center gap-5">
      <View className="flex-row items-center gap-3.5">
        <Image
          source={{ uri: authorImage }}
          className="h-12 w-12 rounded-full ring-1 ring-base-content/10"
          resizeMode="cover"
        />
        <View className="min-w-0">
          <PageKicker>Written by</PageKicker>
          <Pressable
            onPress={() => {
              if (SITE.author.url) {
                triggerSelectionHaptic();
                Linking.openURL(SITE.author.url).catch(() => {});
              }
            }}
          >
            <Text className="text-sm font-semibold text-foreground active:text-primary">
              {SITE.author.name}
            </Text>
          </Pressable>
        </View>
      </View>

      {socials.length > 0 && (
        <View className="flex-row items-center gap-3">
          {socials.map((social) => {
            const icon = SOCIAL_ICONS[social.platform] ?? "link";
            return (
              <Pressable
                key={social.platform}
                onPress={() => {
                  triggerSelectionHaptic();
                  Linking.openURL(social.url).catch(() => {});
                }}
                className="active:opacity-60"
                accessibilityLabel={social.platform}
              >
                <Ionicons name={icon} size={18} color={foreground} style={{ opacity: 0.52 }} />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
