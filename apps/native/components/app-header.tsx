import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDrawer } from "./drawer-provider";
import { SITE } from "@/lib/site";

export function AppHeader() {
  const { openDrawer } = useDrawer();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="bg-base-100/90 border-b border-base-content/6"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable
          onPress={openDrawer}
          className="h-10 w-10 items-center justify-center rounded-xl active:bg-base-200"
          accessibilityLabel="Open menu"
        >
          <Ionicons name="menu" size={22} className="text-foreground" />
        </Pressable>

        <Pressable onPress={openDrawer}>
          <Text className="text-base font-semibold tracking-tight text-foreground">
            {SITE.name}
          </Text>
        </Pressable>

        {/* Right spacer to center the title */}
        <View className="w-10" />
      </View>
    </View>
  );
}
