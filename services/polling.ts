import AsyncStorage from "@react-native-async-storage/async-storage";
import deepEqual from "deep-equal";
import * as Network from 'expo-network';
import { apiClient, schoolAppClient } from "../api/client";
import { ActivityItem } from "../types/api";
import { scheduleNotification } from "./notifications";

const POLL_ENDPOINTS = [
  "currentElems",
  "currentMods",
  "allElems",
  "allMods",
  "semestres",
  "annees",
  "absences",
  "sanctions",
] as const;

type PollEndpoint = (typeof POLL_ENDPOINTS)[number];

const CACHE_PREFIX = "skewl_cache_";
const ACTIVITY_KEY = "skewl_activity";

export interface PollSettings {
  interval: number;
  notifyNotes: boolean;
  notifyAbsences: boolean;
  notifySanctions: boolean;
}

const DEFAULT_SETTINGS: PollSettings = {
  interval: 45,
  notifyNotes: true,
  notifyAbsences: true,
  notifySanctions: true,
};

export const getPollingSettings = async (): Promise<PollSettings> => {
  try {
    const stored = await AsyncStorage.getItem("skewl_poll_settings");
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error("Failed to load polling settings:", error);
  }
  return DEFAULT_SETTINGS;
};

export const savePollingSettings = async (settings: Partial<PollSettings>): Promise<void> => {
  try {
    const current = await getPollingSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem("skewl_poll_settings", JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save polling settings:", error);
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

const getCacheKey = (endpoint: PollEndpoint): string => {
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

const cleanData = (data: any): any => {
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

const setCachedData = async (endpoint: PollEndpoint, data: unknown): Promise<void> => {
  try {
    const cleaned = cleanData(data);
    await AsyncStorage.setItem(getCacheKey(endpoint), JSON.stringify(cleaned));
  } catch (error) {
    console.error(`Failed to cache data for ${endpoint}:`, error);
  }
};

export const getActivityFeed = async (): Promise<ActivityItem[]> => {
  try {
    const stored = await AsyncStorage.getItem(ACTIVITY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load activity feed:", error);
    return [];
  }
};

export const clearActivityFeed = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ACTIVITY_KEY);
    console.log("🗑️ Activity feed cleared");
  } catch (error) {
    console.error("Failed to clear activity feed:", error);
  }
};

const addActivity = async (activity: Omit<ActivityItem, "id" | "timestamp">): Promise<void> => {
  try {
    const feed = await getActivityFeed();
    const newActivity: ActivityItem = {
      ...activity,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    const updated = [newActivity, ...feed].slice(0, 50);
    await AsyncStorage.setItem(ACTIVITY_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to add activity:", error);
  }
};

const detectChanges = (
  endpoint: PollEndpoint,
  oldData: unknown,
  newData: unknown,
  settings: PollSettings
): ActivityItem[] => {
  if (deepEqual(oldData, newData)) {
    return [];
  }

  const activities: ActivityItem[] = [];

  const getVal = (item: any) => {
    const v = item.note ?? item.Moy ?? item.Note ?? item.Moyenne ?? item["Moy SEM"] ?? item["Moy Annee"];
    if (v === null || v === undefined || v === "" || v === "--") return null;
    return typeof v === 'string' ? parseFloat(v) : v;
  };

  if (endpoint === "currentElems" || endpoint === "allElems" || endpoint === "currentMods" || endpoint === "allMods") {
    if (Array.isArray(oldData) && Array.isArray(newData)) {
      if (newData.length > oldData.length) {
        activities.push({
          id: "",
          timestamp: 0,
          type: "note",
          title: endpoint.includes("Elem") ? "New Element Added" : "New Module Added",
          description: `${newData.length - oldData.length} new items detected`,
          route: "/notes",
        });
      }

      for (const newItem of newData) {
        const itemKey = (newItem as any).CodeElem || (newItem as any).CodeMod;
        if (!itemKey) continue;

        const oldItem = (oldData as any[]).find(
          (o) => (o.CodeElem === itemKey) || (o.CodeMod === itemKey)
        );

        const oldVal = getVal(oldItem || {});
        const newVal = getVal(newItem);

        if (oldItem && oldVal !== newVal) {
          const itemName = (newItem as any).Intitule || itemKey;

          activities.push({
            id: "",
            timestamp: 0,
            type: "note",
            title: `Grade Updated: ${itemName}`,
            description: `${oldVal ?? "N/A"} → ${newVal ?? "N/A"}`,
            route: "/notes",
          });
        }
      }
    }
  }

  if (endpoint === "absences") {
    const oldList = (oldData as any)?.details || (Array.isArray(oldData) ? oldData : []);
    const newList = (newData as any)?.details || (Array.isArray(newData) ? newData : []);

    if (Array.isArray(oldList) && Array.isArray(newList)) {
      if (newList.length > oldList.length) {
        const newAbsences = newList.slice(oldList.length);
        for (const absence of newAbsences) {
          activities.push({
            id: "",
            timestamp: 0,
            type: "absence",
            title: "New Absence Recorded",
            description: `${(absence as { module?: string; Element?: string }).module || (absence as { Element?: string }).Element || "Unknown module"} - ${(absence as { date?: string; Date?: string }).date || (absence as { Date?: string }).Date || ""}`,
            route: "/absences",
          });
        }
      }
    }
  }

  if (endpoint === "sanctions") {
    if (!deepEqual(oldData, newData)) {
      activities.push({
        id: "",
        timestamp: 0,
        type: "sanction",
        title: "Sanctions Updated",
        description: "Your sanctions status has changed",
        route: "/absences",
      });
    }
  }

  if (
    endpoint === "semestres" ||
    endpoint === "annees" ||
    endpoint === "currentMods" ||
    endpoint === "allMods"
  ) {
    activities.push({
      id: "",
      timestamp: 0,
      type: "update",
      title: "Data Updated",
      description: `${endpoint} information has been updated`,
      route: "/notes",
    });
  }

  return activities;
};

const fetchMap: Record<PollEndpoint, () => Promise<any>> = {
  currentElems: () => schoolAppClient.getCurrentElemNote(),
  currentMods: () => schoolAppClient.getCurrentModNote(),
  allElems: () => schoolAppClient.getElemNote(),
  allMods: () => schoolAppClient.getModNote(),
  semestres: () => schoolAppClient.getSemestre(),
  annees: () => schoolAppClient.getAnnee(),
  absences: () => schoolAppClient.getAbsences(),
  sanctions: () => schoolAppClient.getSanctions(),
};

export const pollEndpoint = async (
  endpoint: PollEndpoint,
  settings: PollSettings,
  silent: boolean = false
): Promise<void> => {
  try {
    const netState = await Network.getNetworkStateAsync();
    if (!netState.isConnected || !netState.isInternetReachable) {
      console.log(`[Polling] Offline, skipping poll for ${endpoint}`);
      return;
    }

    console.log(`[Polling] Fetching ${endpoint}${silent ? ' (Silent)' : ''}...`);
    const fetchData = fetchMap[endpoint];
    if (!fetchData) {
      console.error(`No fetch handler for ${endpoint}`);
      return;
    }

    const freshData = await fetchData();
    if (!freshData) {
      console.warn(`[Polling] No data returned for ${endpoint}. Possible network/session error.`);
      return;
    }

    const newData = cleanData(freshData);
    const oldData = await getCachedData(endpoint);

    const oldItemsCount = Array.isArray(oldData) ? oldData.length : (oldData as any)?.details?.length || 0;
    const newItemsCount = Array.isArray(newData) ? newData.length : (newData as any)?.details?.length || 0;

    if (oldItemsCount > 0 && newItemsCount === 0) {
      console.warn(`[Polling] ${endpoint} returned empty but cache has ${oldItemsCount} items. Skipping cache update to prevent data loss.`);
      return;
    }

    console.log(`[Polling] ${endpoint} update check. Silent: ${silent}`);

    if (!silent) {
      const changes = detectChanges(endpoint, oldData || (Array.isArray(newData) ? [] : {}), newData, settings);

      for (const activity of changes) {
        await addActivity(activity);

        const shouldNotify =
          (activity.type === "note" && settings.notifyNotes) ||
          (activity.type === "absence" && settings.notifyAbsences) ||
          (activity.type === "sanction" && settings.notifySanctions);

        if (shouldNotify) {
          await scheduleNotification(activity.title, activity.description, {
            route: activity.route,
          });
        }
      }
    }

    await setCachedData(endpoint, newData);
  } catch (error) {
    console.error(`Failed to poll ${endpoint}:`, error);
  }
};

export const pollAllEndpoints = async (silent: boolean = false): Promise<void> => {
  const settings = await getPollingSettings();

  const isAuth = await apiClient.checkAuthOrRelogin();
  if (!isAuth) {
    console.log("[Polling] Not authenticated and auto-login failed. Skipping poll.");
    return;
  }

  await Promise.all(
    [...POLL_ENDPOINTS].map((endpoint) => pollEndpoint(endpoint, settings, silent))
  );
  if (silent) {
    await new Promise(r => setTimeout(r, 2000));
    await pollEndpoint("absences", settings, true);
    await pollEndpoint("currentElems", settings, true);
  }
};
