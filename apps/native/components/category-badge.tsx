import { router } from "expo-router";
import { Pressable, Text } from "react-native";

import { triggerSelectionHaptic } from "@/lib/haptics";

interface CategoryBadgeProps {
  category: string;
  count?: number;
  size?: "sm" | "lg";
}

export function CategoryBadge({ category, count, size = "sm" }: CategoryBadgeProps) {
  const sizeClass = size === "lg" ? "px-3.5 py-2" : "px-2.5 py-1";
  const textSize = size === "lg" ? "text-xs" : "text-[0.68rem]";

  return (
    <Pressable
      onPress={() => {
        triggerSelectionHaptic();
        router.push(`/category/${encodeURIComponent(category)}`);
      }}
      className={`self-start flex-row items-center justify-center rounded-full border border-primary/18 bg-primary/12 active:border-primary/28 active:bg-primary/18 ${sizeClass}`}
    >
      <Text className={`font-mono font-medium tracking-[0.01em] capitalize text-primary ${textSize}`}>
        {category}
        {count != null && <Text className="opacity-50"> {count}</Text>}
      </Text>
    </Pressable>
  );
}
