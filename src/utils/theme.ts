import { useColorScheme } from "react-native";

export interface ThemeColors {
  background: {
    primary: string;
    secondary: string;
    card: string;
    button: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  border: string;
  shadow: {
    color: string;
    opacity: number;
  };
}

const lightTheme: ThemeColors = {
  background: {
    primary: "#FFFFFF",
    secondary: "#F9FAFB",
    card: "#FFFFFF",
    button: "#F3F4F6",
  },
  text: {
    primary: "#111827",
    secondary: "#6B7280",
    muted: "#9CA3AF",
  },
  border: "#E5E7EB",
  shadow: {
    color: "#000000",
    opacity: 0.1,
  },
};

const darkTheme: ThemeColors = {
  background: {
    primary: "#000000",
    secondary: "#1F2937",
    card: "#1F2937",
    button: "#374151",
  },
  text: {
    primary: "#F9FAFB",
    secondary: "#D1D5DB",
    muted: "#9CA3AF",
  },
  border: "#374151",
  shadow: {
    color: "#000000",
    opacity: 0.3,
  },
};

/**
 * Get theme colors for a given color scheme
 */
export function getThemeColors(colorScheme: "light" | "dark" | null): ThemeColors {
  return colorScheme === "dark" ? darkTheme : lightTheme;
}

/**
 * Hook to get current theme colors based on system color scheme
 */
export function useTheme(): ThemeColors {
  const colorScheme = useColorScheme();
  return getThemeColors(colorScheme);
}

