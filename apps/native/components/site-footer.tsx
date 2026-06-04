import { Linking, Pressable, Text, View } from "react-native";

import { triggerSelectionHaptic } from "@/lib/haptics";
import { SITE, absoluteUrl } from "@/lib/site";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <View className="mt-12 border-t border-base-300/80 pt-8 gap-3">
      <View className="flex-row flex-wrap gap-x-4 gap-y-2">
        {SITE.footerNav.map((link) => (
          <Pressable
            key={link.href}
            onPress={() => {
              triggerSelectionHaptic();
              Linking.openURL(absoluteUrl(link.href)).catch(() => {});
            }}
          >
            <Text className="font-mono text-[0.72rem] tracking-[0.14em] uppercase text-muted active:text-primary">
              {link.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text className="text-sm text-faint">
        © {year}{" "}
        <Text
          className="text-faint active:text-primary"
          onPress={() => Linking.openURL(SITE.copyrightSiteURL).catch(() => {})}
        >
          {SITE.copyrightSiteName}
        </Text>
        . Built with Astro and deployed on Cloudflare.
      </Text>
    </View>
  );
}
