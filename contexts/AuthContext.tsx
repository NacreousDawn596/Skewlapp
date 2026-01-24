import createContextHook from "@nkzw/create-context-hook";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { apiClient, schoolAppClient, secureStorage } from "../api/client";
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

const CREDENTIALS_KEY = "credentials";
const PROFILE_KEY = "profile";

export const [AuthProvider, useAuth] = createContextHook<AuthContextValue>(() => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  const checkAuthQuery = useQuery({
    queryKey: ["checkAuth"],
    queryFn: async () => {
      const authStatus = await apiClient.checkAuthOrRelogin(); // New return type

      let profileData: UserProfile | null = null;
      if (authStatus.isAuthenticated) {
        const storedProfile = await secureStorage.getItem(PROFILE_KEY);
        if (storedProfile) {
          profileData = JSON.parse(storedProfile) as UserProfile;
          setProfile(profileData);
          setIsAuthenticated(true);
        } else {
          // If authenticated but no profile, something is wrong, force re-login
          return { isAuthenticated: false, autoLoginAttempted: true, error: "Profile missing after successful auto-login." };
        }
      }

      return {
        isAuthenticated: authStatus.isAuthenticated,
        profile: profileData,
        autoLoginAttempted: authStatus.autoLoginAttempted,
        error: authStatus.error,
      };
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      setLoginError(null);

      const success = await schoolAppClient.login(email, password);

      if (!success) {
        throw new Error("Login failed. Please check your credentials.");
      }

      const profileData = (await schoolAppClient.getProfile()) as UserProfile;

      if (!profileData) {
        throw new Error("Login successful but failed to fetch profile.");
      }

      await Promise.all([
        apiClient.saveCredentials(email, password),
        secureStorage.setItem(PROFILE_KEY, JSON.stringify(profileData)),
      ]);

      return profileData;
    },
    onSuccess: async (profileData) => {
      await clearAllCache();
      setProfile(profileData);
      setIsAuthenticated(true);
      router.replace("/(tabs)/home");
    },
    onError: (error: Error) => {
      console.error("Login error:", error);
      setLoginError(error.message || "Failed to login.");
    },
  });

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
      router.replace("/login");
    },
  });

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  useEffect(() => {
    if (!checkAuthQuery.isLoading) {
      if (!isAuthenticated) {
        if (checkAuthQuery.data?.autoLoginAttempted && checkAuthQuery.data?.error) {
          // Auto-login attempted and failed, display error
          setLoginError(checkAuthQuery.data.error);
          router.replace("/login");
        } else if (!checkAuthQuery.data?.autoLoginAttempted) {
          // No auto-login attempted (no credentials found), go to login
          router.replace("/login");
        }
        // If isAuthenticated is true, do nothing (stay on current page or navigate to home)
      }
    }
  }, [checkAuthQuery.isLoading, isAuthenticated, checkAuthQuery.data]);

  return {
    isAuthenticated,
    profile,
    isLoading: checkAuthQuery.isLoading,
    login,
    logout,
    loginError,
    isLoggingIn: loginMutation.isPending,
    hasAttemptedAutoLogin: checkAuthQuery.data?.autoLoginAttempted ?? false,
  };
});
