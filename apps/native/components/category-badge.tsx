import { router } from "expo-router";
import { Pressable, Text } from "react-native";

interface CategoryBadgeProps {
  category: string;
  count?: number;
}

export function CategoryBadge({ category, count }: CategoryBadgeProps) {
  return (
    <Pressable
      onPress={() => router.push(`/category/${encodeURIComponent(category)}`)}
      className="rounded-full border border-primary/25 bg-primary/8 px-3 py-1.5 active:opacity-70"
    >
      <Text className="font-mono text-[0.72rem] tracking-[0.08em] uppercase text-primary">
        {category}
        {count != null && <Text className="opacity-60"> {count}</Text>}
      </Text>
    </Pressable>
  );
}
