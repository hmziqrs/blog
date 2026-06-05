import { router } from "expo-router";
import { Pressable, Text } from "react-native";

import { triggerSelectionHaptic } from "@/lib/haptics";

interface CategoryBadgeProps {
  category: string;
  count?: number;
  size?: "sm" | "lg";
}

export function CategoryBadge({ category, count, size = "sm" }: CategoryBadgeProps) {
  const py = size === "lg" ? "py-1.5" : "py-0.5";
  const px = size === "lg" ? "px-3" : "px-2";
  const text = size === "lg" ? "text-[0.72rem]" : "text-[0.62rem]";

  return (
    <Pressable
      onPress={() => {
        triggerSelectionHaptic();
        router.push(`/category/${encodeURIComponent(category)}`);
      }}
      className={`self-start flex-row items-center rounded-md bg-primary/10 active:bg-primary/18 ${px} ${py}`}
    >
      <Text className={`font-medium capitalize text-primary ${text}`}>
        {category}
        {count != null && <Text className="opacity-40"> · {count}</Text>}
      </Text>
    </Pressable>
  );
}
