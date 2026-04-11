import { router } from "expo-router";
import { Chip } from "heroui-native/chip";

interface CategoryBadgeProps {
  category: string;
  count?: number;
}

export function CategoryBadge({ category, count }: CategoryBadgeProps) {
  return (
    <Chip
      variant="primary"
      size="sm"
      onPress={() => router.push(`/category/${encodeURIComponent(category)}`)}
    >
      <Chip.Label>
        {category}
        {count != null ? ` ${count}` : ""}
      </Chip.Label>
    </Chip>
  );
}
