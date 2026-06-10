import { Text, View } from "react-native";

interface SectionHeaderProps {
  title: string;
  count?: number;
}

export function SectionHeader({ title, count }: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-lg font-semibold tracking-tight text-foreground">{title}</Text>
      {count != null && (
        <View className="rounded-full bg-primary/10 px-2.5 py-0.5">
          <Text className="font-mono text-xs text-primary">{count}</Text>
        </View>
      )}
    </View>
  );
}
