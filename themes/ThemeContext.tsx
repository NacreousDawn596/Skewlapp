import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { DEFAULT_THEME, THEME_PALETTES, ThemePalette } from "./palettes";

export type FontSize = "small" | "normal" | "large" | "xl";

interface ThemeContextValue {
  theme: ThemePalette;
  fontSize: FontSize;
  setTheme: (theme: ThemePalette) => void;
  setFontSize: (size: FontSize) => void;
  isLoading: boolean;
}

const THEME_KEY = "skewl_theme";
const FONT_SIZE_KEY = "skewl_font_size";

export const [ThemeProvider, useTheme] = createContextHook<ThemeContextValue>(
  () => {
    const [theme, setThemeState] = useState<ThemePalette>(DEFAULT_THEME);
    const [fontSize, setFontSizeState] = useState<FontSize>("normal");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const loadTheme = async () => {
        try {
          const [savedTheme, savedFontSize] = await Promise.all([
            AsyncStorage.getItem(THEME_KEY),
            AsyncStorage.getItem(FONT_SIZE_KEY),
          ]);

          if (savedTheme) {
            const found = THEME_PALETTES.find((p) => p.name === savedTheme);
            if (found) {
              setThemeState(found);
            }
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

    const setTheme = async (newTheme: ThemePalette) => {
      setThemeState(newTheme);
      try {
        await AsyncStorage.setItem(THEME_KEY, newTheme.name);
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
