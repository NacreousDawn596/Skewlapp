import AsyncStorage from "@react-native-async-storage/async-storage";
import { PollEndpoint } from "./polling";

const CACHE_PREFIX = "skewl_cache_";
const MODULES_CACHE_PREFIX = "skewl_modules_";
const NAMES_CACHE_KEY = "skewl_element_names_forever";
export const ACTIVITY_KEY = "skewl_activity";

export const getCacheKey = (endpoint: PollEndpoint): string => {
  return `${CACHE_PREFIX}${endpoint}`;
};

export const getModulesCacheKey = (niveau: string, filiere: string, semestre: string): string => {
  return `${MODULES_CACHE_PREFIX}${niveau}_${filiere}_${semestre}`;
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

export const getCachedModules = async (niveau: string, filiere: string, semestre: string): Promise<unknown> => {
  try {
    const cached = await AsyncStorage.getItem(getModulesCacheKey(niveau, filiere, semestre));
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error(`Failed to get cached modules:`, error);
    return null;
  }
};

export const setCachedModules = async (niveau: string, filiere: string, semestre: string, data: unknown): Promise<void> => {
  try {
    const cleaned = cleanData(data);
    await AsyncStorage.setItem(getModulesCacheKey(niveau, filiere, semestre), JSON.stringify(cleaned));
    console.log(`[Cache] Cached modules for ${niveau} ${filiere} ${semestre}`);
  } catch (error) {
    console.error(`Failed to cache modules:`, error);
  }
};

export const getCachedElementNames = async (): Promise<Record<string, string>> => {
  try {
    const cached = await AsyncStorage.getItem(NAMES_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (error) {
    console.error(`Failed to get element names cache:`, error);
    return {};
  }
};

export const setCachedElementNames = async (names: Record<string, string>): Promise<void> => {
  try {
    await AsyncStorage.setItem(NAMES_CACHE_KEY, JSON.stringify(names));
    console.log(`[Cache] Cached ${Object.keys(names).length} element names permanently`);
  } catch (error) {
    console.error(`Failed to cache element names:`, error);
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
