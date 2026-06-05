import { router } from "expo-router";
import { Pressable, Text } from "react-native";

import { triggerSelectionHaptic } from "@/lib/haptics";

interface TagBadgeProps {
  tag: string;
  count?: number;
  size?: "sm" | "md" | "lg";
}

export function TagBadge({ tag, count, size = "md" }: TagBadgeProps) {
  const py = size === "sm" ? "py-0.5" : size === "lg" ? "py-1.5" : "py-1";
  const px = size === "sm" ? "px-2" : size === "lg" ? "px-3" : "px-2.5";
  const text = size === "sm" ? "text-[0.62rem]" : size === "lg" ? "text-[0.72rem]" : "text-[0.68rem]";

  return (
    <Pressable
      onPress={() => {
        triggerSelectionHaptic();
        router.push(`/tags/${encodeURIComponent(tag)}`);
      }}
      className={`items-center justify-center rounded-md bg-base-200/80 active:bg-primary/10 ${px} ${py}`}
    >
      <Text className={`font-medium text-soft active:text-primary ${text}`}>
        #{tag}
        {count != null && <Text className="opacity-40"> · {count}</Text>}
      </Text>
    </Pressable>
  );
}
