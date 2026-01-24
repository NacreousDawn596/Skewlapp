import createContextHook from "@nkzw/create-context-hook";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { apiClient, schoolAppClient, secureStorage } from "../api/client";
import { clearAllCache } from "../services/polling";
import { UserProfile } from "../types/api";

interface AuthContextValue {
  isAuthenticated: boolean;
  profile: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginError: string | null;
  isLoggingIn: boolean;
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
      const isAuth = await apiClient.checkAuthOrRelogin();
      const storedProfile = await secureStorage.getItem(PROFILE_KEY);

      if (isAuth && storedProfile) {
        const profileData = JSON.parse(storedProfile) as UserProfile;
        setProfile(profileData);
        setIsAuthenticated(true);
        return { isAuthenticated: true, profile: profileData };
      }

      return { isAuthenticated: false, profile: null };
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
    if (!checkAuthQuery.isLoading && !isAuthenticated) {
      if (!checkAuthQuery.data?.isAuthenticated) {
        router.replace("/login");
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
  };
});
