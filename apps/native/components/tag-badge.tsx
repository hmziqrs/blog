import { router } from "expo-router";
import { Pressable, Text } from "react-native";

interface TagBadgeProps {
  tag: string;
  count?: number;
}

export function TagBadge({ tag, count }: TagBadgeProps) {
  return (
    <Pressable
      onPress={() => router.push(`/tags/${encodeURIComponent(tag)}`)}
      className="rounded-full border border-base-content/12 bg-base-200/60 px-3 py-1.5 active:opacity-70"
    >
      <Text className="font-mono text-[0.72rem] tracking-[0.08em] uppercase text-base-content/72">
        {tag}
        {count != null && <Text className="opacity-60"> {count}</Text>}
      </Text>
    </Pressable>
  );
}
