import { TextInput, TextInputProps, View, Text, StyleSheet } from "react-native";
import { colors, fontSize, radius, spacing } from "../theme";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...rest }: InputProps) {
  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors.textMuted}
        {...rest}
        style={[styles.input, error ? styles.inputError : null, style]}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: {
    color: colors.text,
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
    fontWeight: "600",
  },
  input: {
    backgroundColor: colors.bgMuted,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    fontSize: fontSize.md,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  inputError: { borderColor: colors.danger, backgroundColor: "#FEF2F2" },
  errorText: { color: colors.danger, fontSize: fontSize.xs, marginTop: 6, fontWeight: "500" },
});
