import { Text, type TextProps } from "react-native";
import { cn } from "heroui-native";

interface PageKickerProps extends TextProps {
  children: React.ReactNode;
  className?: string;
}

export function PageKicker({ children, className, ...props }: PageKickerProps) {
  return (
    <Text className={cn("page-kicker", className)} {...props}>
      {children}
    </Text>
  );
}
