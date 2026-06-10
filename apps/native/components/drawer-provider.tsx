import React, { createContext, useCallback, useContext, useState } from "react";
import { Pressable } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { DrawerContent } from "./drawer-content";
import { triggerSelectionHaptic } from "@/lib/haptics";
import { useAppTheme } from "@/contexts/app-theme-context";

const DRAWER_WIDTH = 280;

type DrawerContextType = {
  openDrawer: () => void;
  closeDrawer: () => void;
};

const DrawerContext = createContext<DrawerContextType | null>(null);

export function useDrawer() {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error("useDrawer must be used within DrawerProvider");
  return ctx;
}

export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const translateX = useSharedValue(-DRAWER_WIDTH);
  const overlayOpacity = useSharedValue(0);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { isDark } = useAppTheme();

  const openDrawer = useCallback(() => {
    triggerSelectionHaptic();
    setDrawerVisible(true);
    translateX.value = withSpring(0, { damping: 28, stiffness: 220 });
    overlayOpacity.value = withTiming(1, { duration: 220 });
  }, []);

  const closeDrawer = useCallback(() => {
    translateX.value = withSpring(-DRAWER_WIDTH, { damping: 28, stiffness: 220 });
    overlayOpacity.value = withTiming(0, { duration: 180 }, (finished) => {
      if (finished) runOnJS(setDrawerVisible)(false);
    });
  }, []);

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  return (
    <DrawerContext.Provider value={{ openDrawer, closeDrawer }}>
      {children}

      {/* Overlay backdrop */}
      {drawerVisible && (
        <Animated.View
          style={[
            {
              position: "absolute",
              inset: 0,
              backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.3)",
            },
            overlayStyle,
          ]}
        >
          <Pressable style={{ flex: 1 }} onPress={closeDrawer} />
        </Animated.View>
      )}

      {/* Drawer panel */}
      {drawerVisible && (
        <Animated.View
          style={[
            {
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: DRAWER_WIDTH,
            },
            drawerStyle,
          ]}
          className="bg-base-100 border-r border-base-300/60"
        >
          <DrawerContent onClose={closeDrawer} />
        </Animated.View>
      )}
    </DrawerContext.Provider>
  );
}
