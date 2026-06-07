// @deprecated 迁移到 @/theme
import { palette } from "./theme/palette";
import { spacing, radius, fontSize } from "./theme/spacing";
import { shadow } from "./theme/shadow";
export const colors = palette;
export const courseColors = palette.courseColors;
export { spacing, radius, fontSize, shadow };
export { theme, ThemeProvider, Box, Text } from "./theme/index";
export type { Theme } from "./theme/index";