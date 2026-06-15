import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Network from 'expo-network';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { schoolAppClient } from "../api/client";
import { ActivityItem } from "../types/api";
import { scheduleNotification } from "./notifications";
import { getCachedData, setCachedData, cleanData } from "./cache";
import { addActivity } from "./activity";
import { detectChanges } from "./changeDetection";

const KEEP_ALIVE_TASK = "background-keep-alive-task";

// Define the dummy task for the foreground service
if (!TaskManager.isTaskDefined(KEEP_ALIVE_TASK)) {
  TaskManager.defineTask(KEEP_ALIVE_TASK, async ({ data, error }) => {
    if (error) {
      console.error(`[KeepAlive] Task error: ${error.message}`);
      return;
    }
    // This task does nothing, just keeps the service alive
  });
}


export const POLL_ENDPOINTS = [
  "currentElems",
  "currentMods",
  "allElems",
  "allMods",
  "semestres",
  "annees",
  "absences",
  "sanctions",
  "filieres",
] as const;

export type PollEndpoint = (typeof POLL_ENDPOINTS)[number];

export interface PollSettings {
  interval: number;
  notifyNotes: boolean;
  notifyAbsences: boolean;
  notifySanctions: boolean;
  notificationsEnabled: boolean;
  enabled: boolean;
  useMockServer: boolean;
  biometricLock: boolean;
  gradePrivacy: boolean;
}

const DEFAULT_SETTINGS: PollSettings = {
  interval: 45,
  notifyNotes: true,
  notifyAbsences: true,
  notifySanctions: true,
  notificationsEnabled: true,
  enabled: true,
  useMockServer: false,
  biometricLock: false,
  gradePrivacy: false,
};

const lastFetchTime: Record<PollEndpoint, number> = {
  currentElems: 0,
  currentMods: 0,
  allElems: 0,
  allMods: 0,
  semestres: 0,
  annees: 0,
  absences: 0,
  sanctions: 0,
  filieres: 0,
};

const fetchOnceEndpoints: Set<PollEndpoint> = new Set([
  "allElems",
  "allMods",
  "semestres",
  "annees",
  "sanctions",
  "filieres",
]);

const fetchDependencies: Record<PollEndpoint, PollEndpoint[]> = {
  currentElems: [],
  currentMods: ["semestres"],
  allElems: [],
  allMods: [],
  semestres: ["annees"],
  annees: [],
  absences: ["sanctions"],
  sanctions: [],
  filieres: [],
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

// Reset fetch times to force refetch of all endpoints
export const resetFetchTimes = () => {
  console.log("[Polling] Resetting fetch times - forcing full refetch on reconnection");
  for (const endpoint of POLL_ENDPOINTS) {
    lastFetchTime[endpoint] = 0;
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
  filieres: () => schoolAppClient.getFilieres(),
};

/**
 * Uses expo-location to start a persistent process on Android
 */
let isForegroundServiceRunning = false;

export const startForegroundService = async () => {
  if (Platform.OS !== 'android' || isForegroundServiceRunning) return;

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[KeepAlive] Foreground permissions not granted');
      return;
    }

    await Location.startLocationUpdatesAsync(KEEP_ALIVE_TASK, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 1000,
      deferredUpdatesInterval: 60000,
      foregroundService: {
        notificationTitle: "SkewlApp est actif",
        notificationBody: "Actualisation de vos données en temps réel...",
        notificationColor: "#8A2BE2",
      },
    });
    isForegroundServiceRunning = true;
    console.log('[KeepAlive] Foreground service started');
  } catch (err) {
    console.error('[KeepAlive] Failed to start foreground service:', err);
  }
};

export const stopForegroundService = async () => {
  if (Platform.OS !== 'android') return;
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(KEEP_ALIVE_TASK);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(KEEP_ALIVE_TASK);
      isForegroundServiceRunning = false;
      console.log('[KeepAlive] Foreground service stopped');
    }
  } catch (err) {
    console.error('[KeepAlive] Failed to stop foreground service:', err);
  }
};

/**
 * Only polls essential data to save battery
 */
export const pollEssentialEndpoints = async (silent: boolean = true): Promise<void> => {
  const settings = await getPollingSettings();
  if (settings.enabled === false) return;

  // In background, we only care about real-time events
  const essential = ["currentElems", "absences"] as const;

  await Promise.all(
    essential.map((endpoint) => pollEndpoint(endpoint, settings, silent))
  );
};


// Check if endpoint should be fetched based on intelligent caching rules
const shouldFetchEndpoint = (
  endpoint: PollEndpoint,
  settings: PollSettings,
  force: boolean = false,
  dependentEndpointChanged: boolean = false
): boolean => {
  // Manual refresh forces a fetch for non-fetch-once endpoints
  if (force && !fetchOnceEndpoints.has(endpoint)) {
    return true;
  }

  // Always fetch regular endpoints on normal poll
  if (!fetchOnceEndpoints.has(endpoint)) {
    // currentMods polls 2x slower than currentElems
    if (endpoint === "currentMods") {
      const now = Date.now();
      const intervalMs = settings.interval * 60 * 1000 * 2;
      return now - lastFetchTime[endpoint] > intervalMs;
    }
    return true;
  }

  // Fetch-once endpoints only if dependent data changed or forced and not yet cached
  if (dependentEndpointChanged) {
    return true;
  }

  // Already fetched, don't fetch again
  const cached = lastFetchTime[endpoint] > 0;
  if (cached) {
    if (force) {
      console.log(`[Polling] ${endpoint} already cached, but forcing fetch anyway.`);
      return true;
    }
    console.log(`[Polling] ${endpoint} already cached forever, skipping fetch.`);
    return false;
  }

  return true;
};

/**
 * Throws UNAUTHORIZED if auth fails - caller must handle
 */
export const pollEndpoint = async (
  endpoint: PollEndpoint,
  settings: PollSettings,
  silent: boolean = false,
  dependentEndpointChanged: boolean = false
): Promise<boolean> => {
  // Check if we should even fetch this endpoint
  const force = !silent;
  if (!shouldFetchEndpoint(endpoint, settings, force, dependentEndpointChanged)) {
    return false;
  }

  const netState = await Network.getNetworkStateAsync();
  if (!netState.isConnected || !netState.isInternetReachable) {
    console.log(`[Polling] Offline, skipping poll for ${endpoint}`);
    const cachedData = await getCachedData(endpoint);
    if (cachedData) {
      return false;
    }
  }

  console.log(`[Polling] Fetching ${endpoint}${silent ? ' (Silent)' : ''}...`);
  const fetchData = fetchMap[endpoint];
  if (!fetchData) {
    console.error(`No fetch handler for ${endpoint}`);
    return false;
  }

  const freshData = await fetchData();

  if (!freshData) {
    console.warn(`[Polling] No data returned for ${endpoint}. Possible network/session error.`);
    return false;
  }

  const newData = cleanData(freshData);
  const oldData = await getCachedData(endpoint);

  const oldItemsCount = Array.isArray(oldData) ? oldData.length : (oldData as any)?.details?.length || 0;
  const newItemsCount = Array.isArray(newData) ? newData.length : (newData as any)?.details?.length || 0;

  if (oldItemsCount > 0 && newItemsCount === 0) {
    console.warn(`[Polling] ${endpoint} returned empty but cache has ${oldItemsCount} items. Skipping cache update to prevent data loss.`);
    return false;
  }

  console.log(`[Polling] ${endpoint} update check. Silent: ${silent}`);

  // 🔥 OPTIMIZATION: Quick length check before heavy stringification
  let dataChanged = false;
  if (!oldData) {
    dataChanged = true;
  } else {
    const oldItemsCount = Array.isArray(oldData) ? oldData.length : Object.keys(oldData).length;
    const newItemsCount = Array.isArray(newData) ? newData.length : Object.keys(newData).length;

    if (oldItemsCount !== newItemsCount) {
      dataChanged = true;
    } else {
      const oldDataStr = JSON.stringify(oldData);
      const newDataStr = JSON.stringify(newData);
      dataChanged = oldDataStr !== newDataStr;
    }
  }
  const hasBaselineCache = oldData !== null;

  if (dataChanged && hasBaselineCache) {
    // 🔥 OPTIMIZATION: We already know data changed from the caller.
    // Don't do a full deepEqual on huge objects again here.
    const activities: ActivityItem[] = detectChanges(
      endpoint,
      oldData || (Array.isArray(newData) ? [] : {}),
      newData,
      settings
    );

    // Only notify and add to activity feed for "real-time" endpoints
    // This prevents duplicate notifications from 'allElems' and 'currentElems'
    const isRealTimeEndpoint = 
        endpoint === "currentElems" || 
        endpoint === "currentMods" || 
        endpoint === "absences" || 
        endpoint === "sanctions";

    if (isRealTimeEndpoint) {
        for (const activity of activities) {
            await addActivity(activity);

            const shouldNotify =
                settings.notificationsEnabled &&
                ((activity.type === "note" && settings.notifyNotes) ||
                (activity.type === "absence" && settings.notifyAbsences) ||
                (activity.type === "sanction" && settings.notifySanctions));

            if (shouldNotify) {
                await scheduleNotification(activity.title, activity.description, {
                    route: activity.route,
                });
            }
        }
    }
  }

  await setCachedData(endpoint, newData);
  lastFetchTime[endpoint] = Date.now();
  return dataChanged;
};

/**
 * Throws UNAUTHORIZED if any endpoint fails auth
 * @returns true if any data changed
 */
export const pollAllEndpoints = async (silent: boolean = false): Promise<boolean> => {
  const settings = await getPollingSettings();

  // 🚫 REMOVED: No more auth check here
  // The package will throw UNAUTHORIZED if session is invalid
  // The caller (PollingContext) must catch and handle it

  const regularEndpoints = ["currentElems", "currentMods", "absences"] as const;

  let anyChanged = false;
  const results: boolean[] = [];

  // 🔥 OPTIMIZATION: Process regular endpoints sequentially with "breathers"
  // This prevents saturating the JS thread with multiple JSON stringifications at once.
  for (const endpoint of regularEndpoints) {
    const changed = await pollEndpoint(endpoint, settings, silent);
    results.push(changed);
    if (changed) anyChanged = true;

    // Give the JS thread a tiny 30ms breather to process UI events (like scroll/back)
    await new Promise(resolve => setTimeout(resolve, 30));
  }

  const currentModsChanged = results[1]; // currentMods index
  const absencesChanged = results[2]; // absences index

  await pollEndpoint("semestres", settings, silent, currentModsChanged);
  const semestresChanged = currentModsChanged || (lastFetchTime.semestres === 0);

  await pollEndpoint("annees", settings, silent, semestresChanged);
  await pollEndpoint("sanctions", settings, silent, absencesChanged);

  // Fetch once on first run (fetch-once endpoints)
  const onceEndpoints = ["allElems", "allMods", "filieres"] as const;
  for (const endpoint of onceEndpoints) {
    const changed = await pollEndpoint(endpoint, settings, silent, false);
    if (changed) anyChanged = true;
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  return anyChanged || semestresChanged;
};
