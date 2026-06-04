import React, { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import * as SecureStore from "expo-secure-store";
import { Uniwind, useUniwind } from "uniwind";

type ThemeName = "light" | "dark";

const THEME_STORAGE_KEY = "app-theme";

type AppThemeContextType = {
  currentTheme: string;
  isLight: boolean;
  isDark: boolean;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
};

const AppThemeContext = createContext<AppThemeContextType | undefined>(undefined);

function persistTheme(theme: ThemeName) {
  SecureStore.setItemAsync(THEME_STORAGE_KEY, theme).catch(() => {});
}

export const AppThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { theme } = useUniwind();

  useEffect(() => {
    SecureStore.getItemAsync(THEME_STORAGE_KEY).then((saved) => {
      if (saved === "light" || saved === "dark") {
        Uniwind.setTheme(saved);
      } else {
        Uniwind.setTheme("dark");
      }
    });
  }, []);

  const isLight = useMemo(() => theme === "light", [theme]);
  const isDark = useMemo(() => theme === "dark", [theme]);

  const setTheme = useCallback((newTheme: ThemeName) => {
    Uniwind.setTheme(newTheme);
    persistTheme(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme: ThemeName = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({
      currentTheme: theme,
      isLight,
      isDark,
      setTheme,
      toggleTheme,
    }),
    [theme, isLight, isDark, setTheme, toggleTheme],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
};

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }
  return context;
}
