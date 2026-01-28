import createContextHook from "@nkzw/create-context-hook";
import { useMutation, useQuery } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import { useState } from "react";

import { apiClient, schoolAppClient, secureStorage } from "../api/client";
import { clearAllCache } from "../services/cache";
import { UserProfile } from "../types/api";

interface AuthContextValue {
  isAuthenticated: boolean;
  profile: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  handleUnauthorized: () => Promise<void>;
  loginError: string | null;
  isLoggingIn: boolean;
  hasAttemptedAutoLogin: boolean;
}

const PROFILE_KEY = "profile";

export const [AuthProvider, useAuth] =
  createContextHook<AuthContextValue>(() => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loginError, setLoginError] = useState<string | null>(null);

    /**
     * AUTH CHECK (startup)
     * - Try stored credentials (online)
     * - Fallback to stored profile (offline)
     */
    const checkAuthQuery = useQuery({
      queryKey: ["auth", "check"],
      queryFn: async () => {
        console.log("[AuthContext] Checking auth state...");

        const credentials = await apiClient.getCredentials();

        if (credentials) {
          const net = await NetInfo.fetch();

          if (net.isConnected) {
            try {
              const success = await schoolAppClient.login(
                credentials.email,
                credentials.pass
              );

              if (success) {
                const profileData =
                  (await schoolAppClient.getProfile()) as UserProfile | null;

                if (profileData) {
                  await secureStorage.setItem(
                    PROFILE_KEY,
                    JSON.stringify(profileData)
                  );

                  setProfile(profileData);
                  setIsAuthenticated(true);

                  return {
                    isAuthenticated: true,
                    autoLoginAttempted: true,
                  };
                }
              }
            } catch (e: any) {
              // ⚠️ NEW: Don't auto-logout on startup errors
              // Let the user stay "logged in" with cached data
              console.error("[AuthContext] Auto-login failed:", e);
            }
          }
        }

        // Offline / fallback profile
        const storedProfile = await secureStorage.getItem(PROFILE_KEY);
        if (storedProfile) {
          const parsed = JSON.parse(storedProfile) as UserProfile;
          setProfile(parsed);
          setIsAuthenticated(true);

          return {
            isAuthenticated: true,
            autoLoginAttempted: !!credentials,
          };
        }

        setProfile(null);
        setIsAuthenticated(false);

        return {
          isAuthenticated: false,
          autoLoginAttempted: false,
        };
      },
      retry: false,
    });

    /**
     * LOGIN (online only)
     */
    const loginMutation = useMutation({
      mutationFn: async ({
        email,
        password,
      }: {
        email: string;
        password: string;
      }) => {
        setLoginError(null);

        const net = await NetInfo.fetch();
        if (!net.isConnected) {
          throw new Error(
            "No internet connection. Connect once to log in."
          );
        }

        const success = await schoolAppClient.login(email, password);
        if (!success) {
          throw new Error("Login failed. Please check your credentials.");
        }

        const profileData =
          (await schoolAppClient.getProfile()) as UserProfile | null;

        if (!profileData) {
          throw new Error("Login succeeded but profile fetch failed.");
        }

        await apiClient.saveCredentials(email, password);
        await secureStorage.setItem(
          PROFILE_KEY,
          JSON.stringify(profileData)
        );

        return profileData;
      },
      onSuccess: async (profileData) => {
        await clearAllCache();
        setProfile(profileData);
        setIsAuthenticated(true);
      },
      onError: (error: any) => {
        setLoginError(error?.message ?? "Login failed.");
      },
    });

    /**
     * LOGOUT
     */
    const logoutMutation = useMutation({
      mutationFn: async () => {
        await Promise.all([
          apiClient.clearCredentials(),
          secureStorage.removeItem(PROFILE_KEY),
          clearAllCache(),
        ]);
      },
      onSuccess: () => {
        setProfile(null);
        setIsAuthenticated(false);
      },
    });

    /**
     * 🔥 NEW: Centralized UNAUTHORIZED handler
     * This is called from ANYWHERE in the app when UNAUTHORIZED is caught
     * ONE PLACE ONLY - no scattered logout logic
     */
    const handleUnauthorized = async () => {
      console.warn("[AuthContext] Session expired - logging out");
      await logoutMutation.mutateAsync();
    };

    return {
      isAuthenticated,
      profile,
      isLoading: checkAuthQuery.isLoading,
      login: async (email, password) =>
        loginMutation.mutateAsync({ email, password }),
      logout: async () => logoutMutation.mutateAsync(),
      handleUnauthorized,
      loginError,
      isLoggingIn: loginMutation.isPending,
      hasAttemptedAutoLogin:
        checkAuthQuery.data?.autoLoginAttempted ?? false,
    };
  });