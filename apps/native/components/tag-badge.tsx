import { router } from "expo-router";
import { Pressable, Text } from "react-native";

interface TagBadgeProps {
  tag: string;
  count?: number;
  size?: "sm" | "md" | "lg";
}

export function TagBadge({ tag, count, size = "md" }: TagBadgeProps) {
  const sizeClass =
    size === "sm"
      ? "px-2.5 py-1"
      : size === "lg"
        ? "px-3.5 py-2"
        : "px-3 py-1.5";
  const textSize =
    size === "sm"
      ? "text-[0.68rem]"
      : size === "lg"
        ? "text-xs"
        : "text-[0.72rem]";

  return (
    <Pressable
      onPress={() => router.push(`/tags/${encodeURIComponent(tag)}`)}
      className={`items-center justify-center rounded-full border border-base-300 bg-base-100/80 active:border-primary active:bg-primary/8 ${sizeClass}`}
    >
      <Text className={`font-mono font-medium tracking-[0.01em] text-base-content/72 active:text-primary ${textSize}`}>
        #{tag}
        {count != null && <Text className="opacity-50"> {count}</Text>}
      </Text>
    </Pressable>
  );
}
