import { Text, Box } from "../theme";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Box flex={1} alignItems="center" justifyContent="center" padding="xl">
      {icon && <Text variant="hero" marginBottom="lg">{icon}</Text>}
      <Text variant="h3" textAlign="center" marginBottom="sm">{title}</Text>
      {subtitle && <Text variant="bodySmall" textAlign="center" marginBottom="lg">{subtitle}</Text>}
      {actionLabel && onAction && <Button title={actionLabel} onPress={onAction} />}
    </Box>
  );
}