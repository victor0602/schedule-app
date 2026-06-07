import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, spacing, radius } from "../theme";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>💥</Text>
          <Text style={styles.title}>出错了</Text>
          <Text style={styles.message}>{this.state.error?.message}</Text>
          <Pressable
            style={styles.button}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.buttonText}>重试</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  emoji: { fontSize: 48, marginBottom: spacing.lg },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.md,
  },
  message: {
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "700" },
});