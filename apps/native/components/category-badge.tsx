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
      className="items-center justify-center rounded-full border border-primary/18 bg-primary/12 active:border-primary/28 active:bg-primary/18 px-2.5 py-1"
    >
      <Text className="font-mono font-medium tracking-[0.01em] text-[0.68rem] capitalize text-primary">
        {category}
        {count != null && <Text className="opacity-50"> {count}</Text>}
      </Text>
    </Pressable>
  );
}
