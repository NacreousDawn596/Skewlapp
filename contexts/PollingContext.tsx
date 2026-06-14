import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";
import * as Network from "expo-network";

import {
  getPollingSettings,
  pollAllEndpoints,
  pollEssentialEndpoints,
  resetFetchTimes,
  startForegroundService,
  stopForegroundService,
} from "../services/polling";
import { useAuth } from "./AuthContext";
import { runSinglePoll } from "@/services/pollExecutor";

const BACKGROUND_POLL_TASK = "background-poll-task";

/* -------------------------------------------------------------------------- */
/*                            BACKGROUND FETCH LOCK                            */
/* -------------------------------------------------------------------------- */

let backgroundPollRunning = false;

/* -------------------------------------------------------------------------- */
/*                            BACKGROUND FETCH TASK                            */
/* -------------------------------------------------------------------------- */

TaskManager.defineTask(BACKGROUND_POLL_TASK, async () => {
  if (backgroundPollRunning) {
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  backgroundPollRunning = true;

  try {
    const netState = await Network.getNetworkStateAsync();

    if (netState.isInternetReachable !== true) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    try {
      // For background tasks, we can use a lighter poll to be faster
      await runSinglePoll(() => pollEssentialEndpoints(true));
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") {
        console.log("[BackgroundFetch] Session expired - stopping background work");
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }
      
      console.error("[BackgroundFetch] Error:", e);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  } catch (e) {
    console.error("[BackgroundFetch] Fatal:", e);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  } finally {
    backgroundPollRunning = false;
  }
});

/* -------------------------------------------------------------------------- */
/*                              CONTEXT TYPES                                  */
/* -------------------------------------------------------------------------- */

interface PollingContextValue {
  isPolling: boolean;
  lastPollTime: number | null;
  startPolling: () => void;
  stopPolling: () => void;
  poll: (silent?: boolean) => Promise<void>;
}

/* -------------------------------------------------------------------------- */
/*                               CONTEXT HOOK                                  */
/* -------------------------------------------------------------------------- */

export const [PollingProvider, usePolling] =
  createContextHook<PollingContextValue>(() => {
    const { isAuthenticated, handleUnauthorized } = useAuth();
    const netInfo = useNetInfo();

    const [isPolling, setIsPolling] = useState(false);
    const [lastPollTime, setLastPollTime] = useState<number | null>(null);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const appState = useRef<AppStateStatus>(AppState.currentState);

    const hasStartedRef = useRef(false);
    const wasOfflineRef = useRef(false);

    /* ---------------------------------------------------------------------- */
    /*                         NETWORK SOURCE OF TRUTH                         */
    /* ---------------------------------------------------------------------- */

    const isNetworkReady =
      netInfo.isConnected === true &&
      netInfo.isInternetReachable === true;

    /* ---------------------------------------------------------------------- */
    /*                                POLLING                                  */
    /* ---------------------------------------------------------------------- */

    const poll = useCallback(
      async (silent = false) => {
        if (!isNetworkReady || !isAuthenticated) return;

        await runSinglePoll(async () => {
          setIsPolling(true);
          
          try {
            await pollAllEndpoints(silent);
            setLastPollTime(Date.now());
          } catch (e: any) {
            if (e.message === "UNAUTHORIZED") {
              console.warn("[Polling] Session expired during poll");
              stopPolling();
              await handleUnauthorized();
            } else {
              console.error("[Polling] Error:", e);
            }
          } finally {
            setIsPolling(false);
          }
        });
      },
      [isNetworkReady, isAuthenticated, handleUnauthorized]
    );

    /* ---------------------------------------------------------------------- */
    /*                         BACKGROUND TASK SETUP                            */
    /* ---------------------------------------------------------------------- */

    const registerBackgroundTask = async () => {
      const settings = await getPollingSettings();
      // On Android with unrestricted battery, we can try to push it
      // but BackgroundFetch itself is still limited by the OS to ~15m.
      // THE FOREGROUND SERVICE will keep the app process alive so setInterval works!
      const intervalSecs = Math.max(settings.interval * 60, 60); 

      try {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_POLL_TASK, {
          minimumInterval: intervalSecs,
          stopOnTerminate: false,
          startOnBoot: true,
        });
        
        // Android-only keep-alive
        await startForegroundService();
      } catch (e) {
        console.error("[PollingContext] Registration failed:", e);
      }
    };

    const unregisterBackgroundTask = async () => {
      try {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_POLL_TASK);
      } catch (e) {}
      await stopForegroundService();
    };

    /* ---------------------------------------------------------------------- */
    /*                           START / STOP POLLING                           */
    /* ---------------------------------------------------------------------- */

    const startPolling = useCallback(async () => {
      if (hasStartedRef.current) return;
      if (!isAuthenticated || !isNetworkReady) return;

      let settings = await getPollingSettings();
      if (settings.enabled === false) {
        console.log("[PollingContext] Polling is disabled in settings");
        return;
      }

      hasStartedRef.current = true;

      await poll(false);

      settings = await getPollingSettings();
      const intervalMs = settings.interval * 60 * 1000;

      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        poll(true);
      }, intervalMs);

      await registerBackgroundTask();
    }, [poll, isAuthenticated, isNetworkReady]);

    const stopPolling = useCallback(async () => {
      hasStartedRef.current = false;

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      setIsPolling(false);
      await unregisterBackgroundTask();
    }, []);

    /* ---------------------------------------------------------------------- */
    /*                         APP STATE (FOREGROUND)                           */
    /* ---------------------------------------------------------------------- */

    useEffect(() => {
      const sub = AppState.addEventListener("change", next => {
        if (
          appState.current.match(/inactive|background/) &&
          next === "active"
        ) {
          if (isAuthenticated && isNetworkReady) {
            startPolling();
          }
        }

        // When going background, ensure service is up if polling is active
        if (next === "background" || next === "inactive") {
            if (isAuthenticated && hasStartedRef.current) {
                startForegroundService();
            }
        }

        appState.current = next;
      });

      return () => sub.remove();
    }, [isAuthenticated, isNetworkReady, startPolling]);

    /* ---------------------------------------------------------------------- */
    /*                      AUTH + NETWORK GATED START                          */
    /* ---------------------------------------------------------------------- */

    useEffect(() => {
      if (!isAuthenticated) {
        stopPolling();
        return;
      }

      if (!isNetworkReady) return;

      startPolling();
    }, [isAuthenticated, isNetworkReady, startPolling, stopPolling]);

    /* ---------------------------------------------------------------------- */
    /*                         REAL RECONNECTION LOGIC                          */
    /* ---------------------------------------------------------------------- */

    useEffect(() => {
      if (netInfo.isInternetReachable === null) return;

      if (netInfo.isInternetReachable === false) {
        wasOfflineRef.current = true;
        return;
      }

      if (wasOfflineRef.current && netInfo.isInternetReachable === true) {
        wasOfflineRef.current = false;
        resetFetchTimes();
        
        if (isAuthenticated && isNetworkReady) {
          poll(false);
        }
      }
    }, [netInfo.isInternetReachable, poll, isAuthenticated, isNetworkReady]);

    /* ---------------------------------------------------------------------- */

    return {
      isPolling,
      lastPollTime,
      startPolling,
      stopPolling,
      poll,
    };
  });