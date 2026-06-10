import { Pressable, Text, type PressableProps } from "react-native";

import { triggerSelectionHaptic } from "@/lib/haptics";
import { cn } from "heroui-native";

type ButtonLinkVariant = "primary" | "ghost" | "plain";
type ButtonLinkSize = "sm" | "md";

interface ButtonLinkProps extends Omit<PressableProps, "children"> {
  children: React.ReactNode;
  variant?: ButtonLinkVariant;
  size?: ButtonLinkSize;
  className?: string;
}

const variantClasses: Record<ButtonLinkVariant, string> = {
  primary: "border-base-content bg-base-content active:border-primary active:bg-primary",
  ghost: "border-base-300 bg-base-100/80 active:border-primary/28 active:bg-primary/18",
  plain: "border-transparent bg-transparent",
};

const textVariantClasses: Record<ButtonLinkVariant, string> = {
  primary: "text-base-100 active:text-primary-content",
  ghost: "text-base-content/72 active:text-primary",
  plain: "text-soft active:text-primary",
};

const sizeClasses: Record<ButtonLinkSize, string> = {
  sm: "h-8 px-3",
  md: "h-10 px-4",
};

const textSizeClasses: Record<ButtonLinkSize, string> = {
  sm: "text-xs",
  md: "text-sm",
};

export function ButtonLink({
  children,
  variant = "ghost",
  size = "sm",
  className,
  onPress,
  ...props
}: ButtonLinkProps) {
  return (
    <Pressable
      onPress={(event) => {
        triggerSelectionHaptic();
        onPress?.(event);
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-full border font-medium active:opacity-90",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      <Text className={cn("font-medium", textVariantClasses[variant], textSizeClasses[size])}>
        {children}
      </Text>
    </Pressable>
  );
}
