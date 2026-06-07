import { createTheme, createBox, createText, ThemeProvider } from "@shopify/restyle";
import { palette } from "./palette";
import { spacing, radius, fontSize, lineHeight } from "./spacing";
import { breakpoints } from "./breakpoints";
import { shadow } from "./shadow";

export const theme = createTheme({
  colors: {
    background: palette.bg,
    cardBackground: palette.bgCard,
    primary: palette.primary,
    primaryDark: palette.primaryDark,
    primaryLight: palette.primaryLight,
    text: palette.text,
    textMuted: palette.textMuted,
    textInverse: palette.textInverse,
    border: palette.border,
    borderStrong: palette.borderStrong,
    bgMuted: palette.bgMuted,
    danger: palette.danger,
    success: palette.success,
    warning: palette.warning,
    info: palette.info,
    accent: palette.accent,
    white: palette.white,
  },
  spacing,
  borderRadii: radius,
  breakpoints,
  shadows: shadow,
  textVariants: {
    hero: { fontSize: fontSize.hero, fontWeight: "800", color: "text" },
    h1: { fontSize: fontSize.xxl, fontWeight: "800", color: "text" },
    h2: { fontSize: fontSize.xl, fontWeight: "700", color: "text" },
    h3: { fontSize: fontSize.lg, fontWeight: "700", color: "text" },
    body: { fontSize: fontSize.md, color: "text" },
    bodySmall: { fontSize: fontSize.sm, color: "textMuted" },
    caption: { fontSize: fontSize.xs, color: "textMuted" },
    button: { fontSize: fontSize.sm, fontWeight: "700", color: "textInverse" },
  },
});

export type Theme = typeof theme;
export const Box = createBox<Theme>();
export const Text = createText<Theme>();
export { palette, spacing, radius, fontSize, lineHeight, shadow, breakpoints };
export { ThemeProvider };