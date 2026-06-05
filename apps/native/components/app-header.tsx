import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColor } from "heroui-native";

import { useDrawer } from "./drawer-provider";

export function AppHeader() {
  const { openDrawer } = useDrawer();
  const foreground = useThemeColor("foreground");
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 pb-2 pt-2">
        <Pressable
          onPress={openDrawer}
          className="h-9 w-9 items-center justify-center rounded-lg active:bg-base-200"
          accessibilityLabel="Open menu"
        >
          <Ionicons name="menu" size={20} color={foreground} />
        </Pressable>
      </View>
    </View>
  );
}
