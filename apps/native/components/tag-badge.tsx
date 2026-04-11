import { router } from "expo-router";
import { Chip } from "heroui-native/chip";

interface TagBadgeProps {
  tag: string;
  count?: number;
}

export function TagBadge({ tag, count }: TagBadgeProps) {
  return (
    <Chip
      variant="secondary"
      size="sm"
      onPress={() => router.push(`/tags/${encodeURIComponent(tag)}`)}
    >
      <Chip.Label>
        {tag}
        {count != null ? ` ${count}` : ""}
      </Chip.Label>
    </Chip>
  );
}
