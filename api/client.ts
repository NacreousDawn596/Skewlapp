import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { SchoolAppClient } from "schoolapp";

const CREDENTIALS_KEY = "schoolapp_credentials";

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

class ApiClient {
  public client: SchoolAppClient;

  constructor() {
    this.client = new SchoolAppClient();
  }

  getClient(): SchoolAppClient {
    return this.client;
  }

  async saveCredentials(email: string, pass: string): Promise<void> {
    await secureStorage.setItem(CREDENTIALS_KEY, JSON.stringify({ email, pass }));
  }

  async getCredentials(): Promise<{ email: string; pass: string } | null> {
    const stored = await secureStorage.getItem(CREDENTIALS_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  async clearCredentials(): Promise<void> {
    await secureStorage.removeItem(CREDENTIALS_KEY);
  }

  /**
   * NEW: Simplified auth check - no auto-relogin
   * The package now throws UNAUTHORIZED on auth failures
   * The app must handle this error and decide what to do
   */
  async isAuthenticated(): Promise<boolean> {
    return this.client.auth.isLoggedIn();
  }
}

export const apiClient = new ApiClient();
export const schoolAppClient = apiClient.getClient();