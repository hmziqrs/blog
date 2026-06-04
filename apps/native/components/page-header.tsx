import { Text, View } from "react-native";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export function PageHeader({ title, description, className }: PageHeaderProps) {
  return (
    <View className={`mb-6 ${className ?? ""}`}>
      <Text className="text-4xl font-semibold tracking-tight text-foreground">{title}</Text>
      {description && (
        <Text className="mt-2 max-w-2xl text-base leading-7 text-soft">{description}</Text>
      )}
    </View>
  );
}
