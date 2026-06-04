import { Pressable, Text, View } from "react-native";

import type { MarkdownHeading } from "@/lib/markdown";
import { triggerSelectionHaptic } from "@/lib/haptics";

interface TableOfContentsProps {
  headings: MarkdownHeading[];
  onSelect?: (slug: string) => void;
}

export function TableOfContents({ headings, onSelect }: TableOfContentsProps) {
  const filtered = headings.filter((h) => h.depth >= 2 && h.depth <= 3);
  if (filtered.length < 3) return null;

  return (
    <View className="page-panel mb-8 p-4">
      <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-soft">
        On this page
      </Text>
      <View className="gap-1.5">
        {filtered.map((heading) => (
          <Pressable
            key={`${heading.slug}-${heading.text}`}
            onPress={() => {
              triggerSelectionHaptic();
              onSelect?.(heading.slug);
            }}
            className="active:opacity-70"
            style={heading.depth === 3 ? { paddingLeft: 16 } : undefined}
          >
            <Text className="text-sm leading-snug text-soft active:text-primary">
              {heading.text}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
