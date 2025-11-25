import { useThemeContext } from "@/contexts/ThemeContext";

export function useTheme() {
  const { theme, isDark, mode, setMode } = useThemeContext();

  return {
    theme,
    isDark,
    mode,
    setMode,
  };
}
