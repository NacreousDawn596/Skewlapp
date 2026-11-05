import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { SchoolAppClient } from "schoolapp";

const CREDENTIALS_KEY = "schoolapp_credentials";
export const PRODUCTION_HOST = "https://schoolapp.ensam-umi.ac.ma";

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
   * Simplified auth check - no auto-relogin.
   * The package now throws UNAUTHORIZED on auth failures.
   */
  async isAuthenticated(): Promise<boolean> {
    return this.client.auth.isLoggedIn();
  }
}

export const apiClient = new ApiClient();

/**
 * Robust delegation object that always points to the active client.
 * This replaces the Proxy which can be unstable in minified Release builds.
 */
export const schoolAppClient: SchoolAppClient = {
  get auth() {
    return apiClient.client.auth;
  },
  get grades() {
    return apiClient.client.grades;
  },
  get attendance() {
    return apiClient.client.attendance;
  },
  get profile() {
    return apiClient.client.profile;
  },
  get courses() {
    return apiClient.client.courses;
  },
  get httpClient() {
    return apiClient.client.httpClient;
  },
  get baseUrl() {
    return apiClient.client.baseUrl;
  },

  login: (email: string, password: string) => apiClient.client.login(email, password),
  logout: () => apiClient.client.logout(),
  resetSession: () => apiClient.client.resetSession(),
  getProfile: () => apiClient.client.getProfile(),
  getFilieres: () => apiClient.client.getFilieres(),
  getAbsences: () => apiClient.client.getAbsences(),
  getSanctions: () => apiClient.client.getSanctions(),
  getElemNote: () => apiClient.client.getElemNote(),
  getCurrentElemNote: () => apiClient.client.getCurrentElemNote(),
  getModNote: () => apiClient.client.getModNote(),
  getCurrentModNote: () => apiClient.client.getCurrentModNote(),
  getAnnee: () => apiClient.client.getAnnee(),
  getSemestre: () => apiClient.client.getSemestre(),
  getModules: (niveau: string, filiere: string, semestre: string, refreshCsrf?: boolean) =>
    apiClient.client.getModules(niveau, filiere, semestre, refreshCsrf),
};
