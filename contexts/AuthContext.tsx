import createContextHook from "@nkzw/create-context-hook";
import { useMutation, useQuery } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import { useCallback, useMemo, useState } from "react";

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
                  const cookies = await ((schoolAppClient as any).httpClient.cookieJar as any).get((schoolAppClient as any).baseUrl);
                  const sessionIdMatch = cookies.match(/JSESSIONID=([^;]+)/);
                  if (sessionIdMatch) {
                    profileData.session_id = sessionIdMatch[1];
                  }

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

        const cookies = await ((schoolAppClient as any).httpClient.cookieJar as any).get((schoolAppClient as any).baseUrl);
        const sessionIdMatch = cookies.match(/JSESSIONID=([^;]+)/);
        if (sessionIdMatch) {
          profileData.session_id = sessionIdMatch[1];
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
     * Re-authenticate silently with saved credentials when possible.
     * Falls back to cached profile while offline.
     */
    const attemptSilentReauth = useCallback(async (): Promise<boolean> => {
      const credentials = await apiClient.getCredentials();
      if (!credentials) {
        return false;
      }

      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        console.log("[AuthContext] Offline - keeping cached session alive");
        return !!profile;
      }

      try {
        console.log("[AuthContext] Attempting silent re-authentication...");
        const success = await schoolAppClient.login(
          credentials.email,
          credentials.pass
        );

        if (!success) {
          return false;
        }

        const profileData =
          (await schoolAppClient.getProfile()) as UserProfile | null;

        if (!profileData) {
          return false;
        }

        const cookies = await ((schoolAppClient as any).httpClient.cookieJar as any).get((schoolAppClient as any).baseUrl);
        const sessionIdMatch = cookies.match(/JSESSIONID=([^;]+)/);
        if (sessionIdMatch) {
          profileData.session_id = sessionIdMatch[1];
        }

        await secureStorage.setItem(
          PROFILE_KEY,
          JSON.stringify(profileData)
        );

        setProfile(profileData);
        setIsAuthenticated(true);

        console.log("[AuthContext] Silent re-authentication succeeded");
        return true;
      } catch (error) {
        console.error("[AuthContext] Silent re-authentication failed:", error);
        return false;
      }
    }, [profile]);

    /**
     * Centralized UNAUTHORIZED handler.
     * While offline, stay authenticated on cached data.
     * When back online, try saved credentials before forcing logout.
     */
    const handleUnauthorized = useCallback(async () => {
      const net = await NetInfo.fetch();

      if (!net.isConnected) {
        console.warn(
          "[AuthContext] Ignoring UNAUTHORIZED while offline and keeping cached session"
        );
        return;
      }

      const recovered = await attemptSilentReauth();
      if (recovered) {
        return;
      }

      console.warn("[AuthContext] Session expired and silent re-auth failed - logging out");
      await logoutMutation.mutateAsync();
    }, [profile, logoutMutation, attemptSilentReauth]);

    const contextValue = useMemo(() => ({
      isAuthenticated,
      profile,
      isLoading: checkAuthQuery.isLoading,
      login: async (email: string, password: string) => {
        await loginMutation.mutateAsync({ email, password });
      },
      logout: async () => logoutMutation.mutateAsync(),
      handleUnauthorized,
      loginError,
      isLoggingIn: loginMutation.isPending,
      hasAttemptedAutoLogin:
        checkAuthQuery.data?.autoLoginAttempted ?? false,
    }), [
      isAuthenticated,
      profile,
      checkAuthQuery.isLoading,
      checkAuthQuery.data?.autoLoginAttempted,
      loginMutation,
      logoutMutation,
      handleUnauthorized,
      loginError,
    ]);

    return contextValue;
  });
