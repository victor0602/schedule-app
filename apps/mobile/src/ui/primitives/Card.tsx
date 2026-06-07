import { ReactNode } from "react";
import { Box } from "../../theme";
import { shadow as shadowTokens } from "../../theme";
import type { Theme } from "../../theme";

interface CardProps {
  children: ReactNode;
  padded?: boolean;
  bordered?: boolean;
  elevated?: "sm" | "md" | "lg";
  mb?: keyof Theme["spacing"];
  mt?: keyof Theme["spacing"];
}

export function Card({ children, padded = true, bordered, elevated = "sm", mb, mt }: CardProps) {
  return (
    <Box
      backgroundColor="cardBackground"
      borderRadius="lg"
      padding={padded ? "lg" : undefined}
      borderWidth={bordered ? 1 : 0}
      borderColor="border"
      mb={mb}
      mt={mt}
      style={elevated ? (shadowTokens[elevated] as any) : undefined}
    >
      {children}
    </Box>
  );
}