import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Network from 'expo-network';
import { apiClient, schoolAppClient } from "../api/client";
import { ActivityItem } from "../types/api";
import { scheduleNotification } from "./notifications";
import { getCachedData, setCachedData, cleanData } from "./cache";
import { addActivity } from "./activity";
import { detectChanges } from "./changeDetection";

export const POLL_ENDPOINTS = [
  "currentElems",
  "currentMods",
  "allElems",
  "allMods",
  "semestres",
  "annees",
  "absences",
  "sanctions",
] as const;

export type PollEndpoint = (typeof POLL_ENDPOINTS)[number];

export interface PollSettings {
  interval: number;
  notifyNotes: boolean;
  notifyAbsences: boolean;
  notifySanctions: boolean;
  notificationsEnabled: boolean;
}

const DEFAULT_SETTINGS: PollSettings = {
  interval: 45,
  notifyNotes: true,
  notifyAbsences: true,
  notifySanctions: true,
  notificationsEnabled: true,
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
      const cachedData = await getCachedData(endpoint);
      if (cachedData) {
        return;
      }
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
        if (!settings.notificationsEnabled) {
          console.log("[Polling] Notifications are globally disabled. Skipping notifications.");
          await setCachedData(endpoint, newData);
          return;
        }

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

