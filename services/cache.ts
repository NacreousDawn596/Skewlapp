import AsyncStorage from "@react-native-async-storage/async-storage";
import { PollEndpoint } from "./polling";

const CACHE_PREFIX = "skewl_cache_";
export const ACTIVITY_KEY = "skewl_activity";

export const getCacheKey = (endpoint: PollEndpoint): string => {
  return `${CACHE_PREFIX}${endpoint}`;
};

export const getCachedData = async (endpoint: PollEndpoint): Promise<unknown> => {
  try {
    const cached = await AsyncStorage.getItem(getCacheKey(endpoint));
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error(`Failed to get cached data for ${endpoint}:`, error);
    return null;
  }
};

export const cleanData = (data: any): any => {
    if (data === null || data === undefined) return data;
    if (Array.isArray(data)) return data.map(cleanData);
    if (typeof data === "object") {
        const cleaned: any = {};
        for (const key in data) {
            if (key === "client" || key === "_stats") continue;
            cleaned[key] = cleanData(data[key]);
        }
        return cleaned;
    }
    return data;
};

export const setCachedData = async (endpoint: PollEndpoint, data: unknown): Promise<void> => {
    try {
        const cleaned = cleanData(data);
        await AsyncStorage.setItem(getCacheKey(endpoint), JSON.stringify(cleaned));
    } catch (error) {
        console.error(`Failed to cache data for ${endpoint}:`, error);
    }
};

export const clearAllCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const skewlKeys = keys.filter(k => k.startsWith(CACHE_PREFIX) || k === ACTIVITY_KEY || k === "skewl_poll_settings" || k.startsWith("calc_storage_"));
    await AsyncStorage.multiRemove(skewlKeys);
    console.log("🧹 All app caches cleared");
  } catch (error) {
    console.error("Failed to clear cache:", error);
  }
};
