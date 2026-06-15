import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ThemeProvider, useTheme } from "@/themes/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PollingProvider } from "@/contexts/PollingContext";
import { requestNotificationPermissions } from "@/services/notifications";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Lock } from "lucide-react-native";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { theme } = useTheme();
  const { isLocked, unlock } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = React.useState(false);

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
          L'accès est protégé par biométrie
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
