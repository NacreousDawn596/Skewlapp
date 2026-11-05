import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { SYSTEM_THEME, resolveTheme, ThemePalette } from "./palettes";

export type FontSize = "small" | "normal" | "large" | "xl";

interface ThemeContextValue {
  /** Resolved palette (already follows system when "system" is selected). */
  theme: ThemePalette;
  /** Selected preference: a palette name or "system". */
  themeName: string;
  fontSize: FontSize;
  setTheme: (name: string) => void;
  setFontSize: (size: FontSize) => void;
  isLoading: boolean;
}

const THEME_KEY = "skewl_theme";
const FONT_SIZE_KEY = "skewl_font_size";

export const [ThemeProvider, useTheme] = createContextHook<ThemeContextValue>(
  () => {
    const systemScheme = useColorScheme();
    const [themeName, setThemeName] = useState<string>(SYSTEM_THEME);
    const [fontSize, setFontSizeState] = useState<FontSize>("normal");
    const [isLoading, setIsLoading] = useState(true);

    const theme = useMemo(
      () => resolveTheme(themeName, systemScheme),
      [themeName, systemScheme]
    );

    useEffect(() => {
      const loadTheme = async () => {
        try {
          const [savedTheme, savedFontSize] = await Promise.all([
            AsyncStorage.getItem(THEME_KEY),
            AsyncStorage.getItem(FONT_SIZE_KEY),
          ]);

          if (savedTheme) {
            setThemeName(savedTheme);
          }

          if (savedFontSize && ["small", "normal", "large", "xl"].includes(savedFontSize)) {
            setFontSizeState(savedFontSize as FontSize);
          }
        } catch (error) {
          console.error("Failed to load theme:", error);
        } finally {
          setIsLoading(false);
        }
      };

      loadTheme();
    }, []);

    const setTheme = async (name: string) => {
      setThemeName(name);
      try {
        await AsyncStorage.setItem(THEME_KEY, name);
      } catch (error) {
        console.error("Failed to save theme:", error);
      }
    };

    const setFontSize = async (size: FontSize) => {
      setFontSizeState(size);
      try {
        await AsyncStorage.setItem(FONT_SIZE_KEY, size);
      } catch (error) {
        console.error("Failed to save font size:", error);
      }
    };

    return {
      theme,
      themeName,
      fontSize,
      setTheme,
      setFontSize,
      isLoading,
    };
  }
);

export const useFontScale = () => {
  const { fontSize } = useTheme();

  switch (fontSize) {
    case "small":
      return 0.85;
    case "normal":
      return 1;
    case "large":
      return 1.15;
    case "xl":
      return 1.3;
    default:
      return 1;
  }
};

export const useScaledSize = (size: number) => {
  const scale = useFontScale();
  return size * scale;
};
