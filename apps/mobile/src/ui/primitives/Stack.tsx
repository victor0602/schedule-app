import { ReactNode } from "react";
import { FlexAlignType } from "react-native";
import { Box } from "../../theme";
import type { Theme } from "../../theme";

interface StackProps {
  children: ReactNode;
  gap?: keyof Theme["spacing"];
  direction?: "column" | "row";
  alignItems?: FlexAlignType;
  flexWrap?: "wrap" | "nowrap";
  mt?: keyof Theme["spacing"];
  mb?: keyof Theme["spacing"];
}

export function Stack({ children, gap = "md", direction = "column", alignItems, flexWrap, mt, mb }: StackProps) {
  return <Box flexDirection={direction} gap={gap} alignItems={alignItems} flexWrap={flexWrap} mt={mt} mb={mb}>{children}</Box>;
}