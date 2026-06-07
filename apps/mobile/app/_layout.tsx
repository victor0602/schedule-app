import "../src/lib/socket";
import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { queryClient } from "../src/lib/query-client";
import { useAuth } from "../src/lib/auth-store";
import { setOnUnauthorized } from "../src/lib/api";
import { colors } from "../src/theme";
import { ActivityIndicator, View } from "react-native";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { ThemeProvider, theme } from "../src/theme";

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <SafeAreaProvider>
        <ErrorBoundary>
        <AuthGate>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
            }}
          />
        </AuthGate>
        </ErrorBoundary>
        </SafeAreaProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, hydrate, logout } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    hydrate();
    setOnUnauthorized(() => {
      logout();
    });
  }, [hydrate, logout]);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "(auth)";
    if (!user && !inAuth) {
      router.replace("/(auth)/login");
    } else if (user && inAuth) {
      router.replace("/(app)/schedules");
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  return <>{children}</>;
}
