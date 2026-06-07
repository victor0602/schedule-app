import { ActivityIndicator, Pressable, ViewStyle } from "react-native";
import { Text, Box } from "../theme";
import type { Theme } from "../theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const variantMap: Record<string, { bg: keyof Theme["colors"]; fg: keyof Theme["colors"]; border?: keyof Theme["colors"] }> = {
  primary: { bg: "primary", fg: "white" },
  secondary: { bg: "white", fg: "primary", border: "border" },
  danger: { bg: "white", fg: "danger" },
  ghost: { bg: "white", fg: "textMuted" },
};

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  style,
  testID,
}: ButtonProps) {
  const v = variantMap[variant];
  const isDisabled = disabled || loading;
  const padV = size === "lg" ? 14 : 10;
  const padH = size === "lg" ? 20 : 16;
  const fontSz = size === "lg" ? 16 : 14;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      style={({ pressed }) => [
        {
          backgroundColor: v.bg as string,
          borderColor: v.border as string,
          borderWidth: v.border ? 1 : 0,
          paddingVertical: padV,
          paddingHorizontal: padH,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          opacity: isDisabled ? 0.5 : pressed ? 0.9 : 1,
          transform: pressed ? [{ scale: 0.98 }] : [],
        } as ViewStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#FFFFFF" : "#4F46E5"} />
      ) : (
        <Box flexDirection="row" alignItems="center" gap="sm">
          <Text variant="button" style={{ fontSize: fontSz, color: v.fg as string }}>
            {title}
          </Text>
        </Box>
      )}
    </Pressable>
  );
}

export type { ButtonProps };