import { ReactNode, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Box } from "../../theme";
import { breakpoints } from "../../theme/breakpoints";

interface ScreenProps {
  scroll?: boolean;
  keyboardAvoid?: boolean;
  keyboardBehavior?: "padding" | "height" | "position";
  children: ReactNode;
}

export function Screen({
  scroll = true,
  keyboardAvoid = false,
  keyboardBehavior = Platform.OS === "ios" ? "padding" : "height",
  children,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [ready, setReady] = useState(false);

  useEffect(() => { setReady(true); }, []);

  let maxWidth: number;
  let pad: number;
  if (!ready) { maxWidth = 880; pad = 32; }
  else if (width < breakpoints.tablet) { maxWidth = width; pad = 16; }
  else if (width < breakpoints.desktop) { maxWidth = Math.min(720, width - 48); pad = 24; }
  else { maxWidth = Math.min(880, width - 64); pad = 32; }

  const inner = (
    <Box flex={1} alignSelf="center" width="100%" style={{ maxWidth, paddingTop: pad, paddingBottom: insets.bottom || pad, paddingHorizontal: pad }}>
      <Box flex={1}>{children}</Box>
    </Box>
  );

  let content: ReactNode;
  if (keyboardAvoid) {
    content = (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? keyboardBehavior : undefined} style={{ flex: 1 }}>
        {inner}
      </KeyboardAvoidingView>
    );
  } else {
    content = inner;
  }

  if (scroll) return <ScrollView contentContainerStyle={{ flexGrow: 1 }}>{content}</ScrollView>;
  return content;
}