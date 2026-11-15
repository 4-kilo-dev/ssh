import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { focusManager, QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/api/queryClient";
import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import { LocaleProvider, useLocale } from "@/i18n";
import { colors } from "@/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Refetch stale data when the app comes back to the foreground.
function useAppFocusRefetch() {
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (Platform.OS !== "web") focusManager.setFocused(state === "active");
    });
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  useAppFocusRefetch();
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootStack />
        </AuthProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
}

function RootStack() {
  const { ready: authReady } = useAuth();
  const { ready: localeReady, t } = useLocale();
  const ready = authReady && localeReady;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  const modal = { presentation: "modal" as const };

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.teal,
        headerTitleStyle: { color: colors.ink, fontWeight: "700" },
        headerStyle: { backgroundColor: colors.paper },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.paper },
      }}
    >
      {/* One area per role. Each group's layout sends people to their own home. */}
      <Stack.Screen name="(customer)" options={{ headerShown: false }} />
      <Stack.Screen name="(manager)" options={{ headerShown: false }} />
      <Stack.Screen name="(vendor)" options={{ headerShown: false }} />
      <Stack.Screen name="(admin)" options={{ headerShown: false }} />

      {/* Shared screens */}
      <Stack.Screen name="venue/[id]" options={{ title: "" }} />
      <Stack.Screen name="vendor/[id]" options={{ title: "" }} />
      <Stack.Screen name="booking/[id]" options={{ title: t("details") }} />
      <Stack.Screen name="chat/[id]" options={{ title: "" }} />
      <Stack.Screen name="chat/new" options={{ title: "" }} />
      <Stack.Screen name="me" options={{ title: t("meTitle") }} />
      <Stack.Screen name="support" options={{ title: t("supportTitle") }} />

      {/* Sheets */}
      <Stack.Screen name="book" options={{ ...modal, headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ ...modal, headerShown: false }} />
      <Stack.Screen name="sign-up" options={{ ...modal, headerShown: false }} />
      <Stack.Screen name="set-password" options={{ ...modal, headerShown: false }} />
      <Stack.Screen name="block" options={{ ...modal, headerShown: false }} />
      <Stack.Screen name="venue-edit" options={{ ...modal, headerShown: false }} />
      <Stack.Screen name="hall-edit" options={{ ...modal, headerShown: false }} />
    </Stack>
  );
}
