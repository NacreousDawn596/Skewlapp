import createContextHook from "@nkzw/create-context-hook";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

import { schoolAppClient, secureStorage } from "../api/client";
import { clearAllCache } from "../services/cache";
import { UserProfile } from "../types/api";

interface AuthContextValue {
  isAuthenticated: boolean;
  profile: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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
     * AUTH CHECK (app startup)
     * - offline: restore session from secureStorage
     * - online: still restore locally (no forced validation)
     * - NEVER re-login automatically
     */
    const checkAuthQuery = useQuery({
      queryKey: ["auth", "check"],
      queryFn: async () => {
        const storedProfile = await secureStorage.getItem(PROFILE_KEY);

        if (storedProfile) {
          const parsed = JSON.parse(storedProfile) as UserProfile;
          setProfile(parsed);
          setIsAuthenticated(true);

          return {
            isAuthenticated: true,
            autoLoginAttempted: true,
          };
        }

        return {
          isAuthenticated: false,
          autoLoginAttempted: false,
        };
      },
      retry: false,
    });

    /**
     * LOGIN (ONLINE ONLY)
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
        router.replace("/(tabs)/home");
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
          secureStorage.removeItem(PROFILE_KEY),
          clearAllCache(),
        ]);
      },
      onSuccess: () => {
        setProfile(null);
        setIsAuthenticated(false);
        router.replace("/login");
      },
    });

    const login = async (email: string, password: string) => {
      await loginMutation.mutateAsync({ email, password });
    };

    const logout = async () => {
      await logoutMutation.mutateAsync();
    };

    /**
     * ROUTING LOGIC
     */
    useEffect(() => {
      if (checkAuthQuery.isLoading) return;

      if (isAuthenticated) {
        router.replace("/(tabs)/home");
        return;
      }

      router.replace("/login");
    }, [checkAuthQuery.isLoading, isAuthenticated]);

    return {
      isAuthenticated,
      profile,
      isLoading: checkAuthQuery.isLoading,
      login,
      logout,
      loginError,
      isLoggingIn: loginMutation.isPending,
      hasAttemptedAutoLogin:
        checkAuthQuery.data?.autoLoginAttempted ?? false,
    };
  });
