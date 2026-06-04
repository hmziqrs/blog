import { Button } from "heroui-native";
import { ActivityIndicator, Text, View } from "react-native";

interface LoadingStateProps {
  className?: string;
}

export function LoadingState({ className }: LoadingStateProps) {
  return (
    <View className={`flex-1 items-center justify-center ${className ?? ""}`}>
      <ActivityIndicator size="large" />
    </View>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ message, onRetry, className }: ErrorStateProps) {
  return (
    <View className={`flex-1 items-center justify-center gap-4 px-6 ${className ?? ""}`}>
      <Text className="text-center text-sm text-red-500">{message}</Text>
      {onRetry && (
        <Button size="sm" variant="secondary" onPress={onRetry}>
          Try again
        </Button>
      )}
    </View>
  );
}
