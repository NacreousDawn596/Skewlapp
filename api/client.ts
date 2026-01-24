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

  async checkAuthOrRelogin(): Promise<boolean> {
    console.log("[ApiClient] Checking auth status...");

    // If the client thinks it's logged in, verify it
    if (this.client.auth.isLoggedIn()) {
      console.log("[ApiClient] Already logged in (valid session).");
      return true;
    }

    const creds = await this.getCredentials();
    if (creds) {
      console.log(`[ApiClient] Session lost or not started. Auto-logging in for ${creds.email}...`);
      const success = await this.client.login(creds.email, creds.pass);
      console.log(`[ApiClient] Auto-login SUCCESS: ${success}`);
      return success;
    }
    console.log("[ApiClient] No credentials found for auto-login.");
    return false;
  }
}

export const apiClient = new ApiClient();
export const schoolAppClient = apiClient.getClient();
