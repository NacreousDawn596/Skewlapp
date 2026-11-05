import { Stack, useRouter, useRootNavigationState } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ThemeProvider, useTheme } from "@/themes/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PollingProvider } from "@/contexts/PollingContext";
import {
  requestNotificationPermissions,
  addNotificationResponseListener,
} from "@/services/notifications";
import {
  parseNotificationRoute,
  NotificationDestination,
} from "@/services/notificationNavigation";
import { configureHaptics } from "@/services/haptics";
import { getPollingSettings } from "@/services/polling";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Lock } from "lucide-react-native";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { theme } = useTheme();
  const { isLocked, unlock } = useAuth();
  const router = useRouter();
  const rootNavState = useRootNavigationState();
  const [isAuthenticating, setIsAuthenticating] = React.useState(false);

  const isLockedRef = useRef(isLocked);
  const navigatorReadyRef = useRef(false);
  const pendingDestinationRef = useRef<NotificationDestination | null>(null);
  const handledNotificationIdsRef = useRef<Set<string>>(new Set());

  const navigatorReady = !!rootNavState?.key;
  navigatorReadyRef.current = navigatorReady;

  const navigateToDestination = React.useCallback(
    (dest: NotificationDestination) => {
      if (dest.pathname === "/notes") {
        router.push("/notes");
      } else if (dest.pathname === "/absences") {
        router.push({
          pathname: "/absences",
          params: dest.tab ? { tab: dest.tab } : {},
        });
      }
    },
    [router]
  );

  const navigateRef = useRef(navigateToDestination);
  navigateRef.current = navigateToDestination;

  // Keep a ref of the lock state so the notification listener never captures a
  // stale closure.
  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  const handleNotificationResponse = React.useCallback(
    (response: Notifications.NotificationResponse) => {
      const identifier = response?.notification?.request?.identifier;
      if (identifier && handledNotificationIdsRef.current.has(identifier)) {
        return;
      }
      if (identifier) handledNotificationIdsRef.current.add(identifier);

      const dest = parseNotificationRoute(
        response?.notification?.request?.content?.data
      );
      if (!dest) return;

      if (isLockedRef.current || !navigatorReadyRef.current) {
        pendingDestinationRef.current = dest;
        return;
      }

      navigateRef.current(dest);
    },
    []
  );

  // Register the notification response listener (foreground + background).
  useEffect(() => {
    const subscription = addNotificationResponseListener(
      handleNotificationResponse
    );

    // Cold-start: handle the notification that launched a terminated app.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) handleNotificationResponse(response);
      })
      .catch(() => {});

    return () => subscription.remove();
  }, [handleNotificationResponse]);

  // Navigate to a pending destination once unlocked and the navigator is ready.
  useEffect(() => {
    if (!isLocked && navigatorReady && pendingDestinationRef.current) {
      const dest = pendingDestinationRef.current;
      pendingDestinationRef.current = null;
      navigateToDestination(dest);
    }
  }, [isLocked, navigatorReady, navigateToDestination]);

  const handleUnlock = React.useCallback(async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    await unlock();
    setIsAuthenticating(false);
  }, [unlock, isAuthenticating]);

  // Auto-trigger biometric prompt when locked
  useEffect(() => {
    if (isLocked) {
      handleUnlock();
    }
  }, [isLocked, handleUnlock]);

  if (isLocked) {
    return (
      <View style={[styles.lockContainer, { backgroundColor: theme.background }]}>
        <View style={[styles.lockCircle, { backgroundColor: theme.surface }]}>
          <Lock size={48} color={theme.accent} />
        </View>
        <Text style={[styles.lockTitle, { color: theme.text }]}>Application Verrouillée</Text>
        <Text style={[styles.lockSubtitle, { color: theme.muted }]}>
          L&apos;accès est protégé par biométrie
        </Text>
        <TouchableOpacity
          style={[styles.unlockButton, { backgroundColor: theme.accent }]}
          onPress={handleUnlock}
          disabled={isAuthenticating}
          activeOpacity={0.8}
        >
          <Text style={styles.unlockButtonText}>
            {isAuthenticating ? 'Authentification...' : 'Déverrouiller'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack screenOptions={{ headerBackTitle: "Retour" }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  lockContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  lockCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  lockTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  lockSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 40,
  },
  unlockButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    elevation: 3,
  },
  unlockButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
    requestNotificationPermissions();

    // Load persisted haptics preferences into the global haptics module.
    getPollingSettings()
      .then((settings) => {
        configureHaptics(settings.hapticsEnabled, settings.hapticsIntensity);
      })
      .catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <PollingProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <RootLayoutNav />
              </GestureHandlerRootView>
            </PollingProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
