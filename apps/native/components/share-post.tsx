import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Linking, Pressable, Text, View } from "react-native";
import { useThemeColor } from "heroui-native";
import { useState } from "react";

import { PageKicker } from "./page-kicker";
import { triggerSelectionHaptic } from "@/lib/haptics";
import { SITE } from "@/lib/site";

interface SharePostProps {
  title: string;
  url: string;
}

const SHARE_ITEMS = [
  { platform: "X", icon: "logo-twitter" as const, buildUrl: (t: string, u: string) => {
    const xSocial = SITE.author.socials?.find((s) => s.platform === "x");
    const via = xSocial?.url.split("/").pop()?.replace("@", "");
    return `https://x.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}${via ? `&via=${via}` : ""}&ref=blog.hmziq.rs`;
  }},
  { platform: "LinkedIn", icon: "logo-linkedin" as const, buildUrl: (_t: string, u: string) =>
    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}&ref=blog.hmziq.rs` },
  { platform: "Reddit", icon: "logo-reddit" as const, buildUrl: (t: string, u: string) =>
    `https://www.reddit.com/submit?url=${encodeURIComponent(u)}&title=${encodeURIComponent(t)}&ref=blog.hmziq.rs` },
  { platform: "Telegram", icon: "paper-plane" as const, buildUrl: (t: string, u: string) =>
    `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}&ref=blog.hmziq.rs` },
];

export function SharePost({ title, url }: SharePostProps) {
  const foreground = useThemeColor("foreground");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    triggerSelectionHaptic();
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View className="mt-10 mb-8">
      <PageKicker className="mb-3.5">Share this post</PageKicker>
      <View className="flex-row flex-wrap items-center gap-1">
        {SHARE_ITEMS.map((item) => (
          <Pressable
            key={item.platform}
            onPress={() => {
              triggerSelectionHaptic();
              Linking.openURL(item.buildUrl(title, url)).catch(() => {});
            }}
            className="p-1.5 active:opacity-60"
            accessibilityLabel={`Share on ${item.platform}`}
          >
            <Ionicons name={item.icon} size={18} color={foreground} style={{ opacity: 0.52 }} />
          </Pressable>
        ))}
        <Pressable
          onPress={handleCopy}
          className="p-1.5 active:opacity-60"
          accessibilityLabel="Copy link"
        >
          <Ionicons name="copy-outline" size={18} color={foreground} style={{ opacity: 0.52 }} />
        </Pressable>
        {copied && (
          <Text className="ml-1 font-mono text-xs text-faint">Copied!</Text>
        )}
      </View>
    </View>
  );
}
