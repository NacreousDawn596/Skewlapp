import createContextHook from "@nkzw/create-context-hook";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import NetInfo from "@react-native-community/netinfo";
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

const PROFILE_KEY = "profile";

export const [AuthProvider, useAuth] =
  createContextHook<AuthContextValue>(() => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loginError, setLoginError] = useState<string | null>(null);

    /**
     * AUTH CHECK (app startup)
     * - First check if we have stored credentials
     * - If credentials exist, attempt auto-login
     * - If no credentials, check for stored profile (offline mode)
     */
    const checkAuthQuery = useQuery({
      queryKey: ["auth", "check"],
      queryFn: async () => {
        console.log("[AuthContext] Starting auth check...");
        
        // First, check if we have stored credentials
        const credentials = await apiClient.getCredentials();
        
        if (credentials) {
          console.log("[AuthContext] Found stored credentials, attempting auto-login...");
          
          // Check network connectivity
          const net = await NetInfo.fetch();
          
          if (net.isConnected) {
            // Online: attempt to login with stored credentials
            try {
              const success = await schoolAppClient.login(credentials.email, credentials.pass);
              
              if (success) {
                console.log("[AuthContext] Auto-login successful!");
                const profileData = await schoolAppClient.getProfile() as UserProfile | null;
                
                if (profileData) {
                  await secureStorage.setItem(PROFILE_KEY, JSON.stringify(profileData));
                  setProfile(profileData);
                  setIsAuthenticated(true);
                  
                  return {
                    isAuthenticated: true,
                    autoLoginAttempted: true,
                  };
                }
              }
              
              console.log("[AuthContext] Auto-login failed, credentials may be invalid");
            } catch (error) {
              console.error("[AuthContext] Auto-login error:", error);
            }
          } else {
            console.log("[AuthContext] Offline mode, checking for stored profile...");
          }
        }
        
        // Fallback: check for stored profile (offline mode or auto-login failed)
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

        console.log("[AuthContext] No stored credentials or profile found");
        return {
          isAuthenticated: false,
          autoLoginAttempted: false,
        };
      },
      retry: false,
    });

    /**
     * LOGIN (ONLINE ONLY)
     * Now stores credentials securely for auto-login
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

        // Store credentials securely for auto-login
        await apiClient.saveCredentials(email, password);
        
        // Store profile
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
     * Now clears credentials in addition to profile and cache
     */
    const logoutMutation = useMutation({
      mutationFn: async () => {
        console.log("[AuthContext] Logging out - clearing all user data...");
        
        await Promise.all([
          apiClient.clearCredentials(),  // Clear stored credentials
          secureStorage.removeItem(PROFILE_KEY),  // Clear profile
          clearAllCache(),  // Clear all cached data
        ]);
      },
      onSuccess: () => {
        setProfile(null);
        setIsAuthenticated(false);
        router.replace("/login");
        console.log("[AuthContext] Logout complete");
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