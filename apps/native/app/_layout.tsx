import "@/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { HeroUINativeProvider, useThemeColor } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { AppThemeProvider, useAppTheme } from "@/contexts/app-theme-context";
import { DrawerProvider } from "@/components/drawer-provider";

export const unstable_settings = {
  initialRouteName: "index",
};

function StackLayout() {
  const background = useThemeColor("background");
  const foreground = useThemeColor("foreground");
  const { isDark } = useAppTheme();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: background },
          headerTintColor: foreground,
          headerTitleStyle: {
            fontWeight: "600",
            color: foreground,
          },
          headerBackTitleStyle: {
            fontFamily: undefined,
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="explore" options={{ headerShown: false }} />
        <Stack.Screen name="about" options={{ headerShown: false }} />
        <Stack.Screen name="posts/[slug]" options={{ title: "Post", headerBackTitle: "Back" }} />
        <Stack.Screen name="tags/[tag]" options={{ title: "Tag", headerBackTitle: "Back" }} />
        <Stack.Screen
          name="category/[category]"
          options={{ title: "Category", headerBackTitle: "Back" }}
        />
        <Stack.Screen name="contact" options={{ title: "Contact", headerBackTitle: "Back" }} />
        <Stack.Screen name="privacy" options={{ title: "Privacy", headerBackTitle: "Back" }} />
        <Stack.Screen name="terms" options={{ title: "Terms", headerBackTitle: "Back" }} />
      </Stack>
    </>
  );
}

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <AppThemeProvider>
          <HeroUINativeProvider>
            <DrawerProvider>
              <StackLayout />
            </DrawerProvider>
          </HeroUINativeProvider>
        </AppThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
