import { Ionicons } from "@expo/vector-icons";
import { Linking, Text, View } from "react-native";
import { useThemeColor } from "heroui-native";

import { ButtonLink } from "./button-link";
import { absoluteUrl } from "@/lib/site";

export function InlineNewsletter() {
  const link = useThemeColor("link");

  return (
    <View className="relative overflow-hidden rounded-2xl border border-base-content/8 bg-base-200/70 p-6">
      <View className="gap-6">
        <View className="gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Ionicons name="mail-outline" size={20} color={link} />
          </View>
          <View>
            <Text className="text-lg font-semibold tracking-tight text-foreground">
              Subscribe to the Newsletter
            </Text>
            <Text className="mt-1 max-w-md text-sm leading-relaxed text-base-content/65">
              Get notified when new posts are published. No spam, unsubscribe anytime.
            </Text>
          </View>
        </View>
        <ButtonLink
          variant="primary"
          size="md"
          className="self-start"
          onPress={() => Linking.openURL(absoluteUrl("/newsletter")).catch(() => {})}
        >
          Subscribe on the web
        </ButtonLink>
      </View>
    </View>
  );
}
