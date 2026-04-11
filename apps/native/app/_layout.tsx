import "@/global.css";
import { Stack } from "expo-router";
import { HeroUINativeProvider, useThemeColor } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { AppThemeProvider } from "@/contexts/app-theme-context";
import { ThemeToggle } from "@/components/theme-toggle";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function StackLayout() {
  const background = useThemeColor("background");
  const foreground = useThemeColor("foreground");

  return (
    <Stack
      screenOptions={{
        headerRight: () => <ThemeToggle />,
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
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="posts/[slug]"
        options={{ title: "Post", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="tags/[tag]"
        options={{ title: "Tag", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="category/[category]"
        options={{ title: "Category", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="contact"
        options={{ title: "Contact", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="privacy"
        options={{ title: "Privacy", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="terms"
        options={{ title: "Terms", headerBackTitle: "Back" }}
      />
    </Stack>
  );
}

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <AppThemeProvider>
          <HeroUINativeProvider>
            <StackLayout />
          </HeroUINativeProvider>
        </AppThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
