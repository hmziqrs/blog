import { Text, View } from "react-native";

interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <View className="mb-6">
      <Text className="text-3xl font-semibold tracking-tight text-foreground">
        {title}
      </Text>
      {description && (
        <Text className="mt-2 text-base leading-7 text-base-content/68">
          {description}
        </Text>
      )}
    </View>
  );
}
