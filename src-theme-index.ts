@'
import { MD3LightTheme as DefaultTheme } from "react-native-paper";

export const colors = {
  primary: "#2563eb",
  background: "#ffffff",
  surface: "#ffffff",
  text: "#111827",
  error: "#ef4444",
} as const;

export const paperTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    surface: colors.surface,
    onSurface: colors.text,
    error: colors.error,
  },
};
'@ | Out-File -Encoding utf8 .\src\theme\index.ts
