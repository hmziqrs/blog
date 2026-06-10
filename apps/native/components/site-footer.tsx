import { Linking, Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { triggerSelectionHaptic } from "@/lib/haptics";
import { SITE } from "@/lib/site";

/** Map internal page keys and hrefs to native app routes */
const INTERNAL_ROUTES: Record<string, string> = {
  tags: "/explore",
  categories: "/explore",
  contact: "/contact",
  privacy: "/privacy",
  terms: "/terms",
  "/newsletter": "/newsletter",
  "/changelog": "/changelog",
  advertise: "/contact",
};

function navigateFooterLink(href: string) {
  triggerSelectionHaptic();
  const internal = INTERNAL_ROUTES[href];
  if (internal) {
    router.push(internal as any);
  } else {
    Linking.openURL(href).catch(() => {});
  }
}

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <View className="mt-12 border-t border-base-300/80 pt-8 gap-3">
      <View className="flex-row flex-wrap gap-x-4 gap-y-2">
        {SITE.footerNav.map((link) => (
          <Pressable key={link.href} onPress={() => navigateFooterLink(link.href)}>
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
          onPress={() => {
            triggerSelectionHaptic();
            Linking.openURL(SITE.copyrightSiteURL).catch(() => {});
          }}
        >
          {SITE.copyrightSiteName}
        </Text>
        . Built with Astro and deployed on Cloudflare.
      </Text>
    </View>
  );
}
