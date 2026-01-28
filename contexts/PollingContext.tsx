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
  resetFetchTimes,
} from "../services/polling";
import { useAuth } from "./AuthContext";
import { apiClient } from "@/api/client";
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
      await runSinglePoll(() => pollAllEndpoints(true));
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch {
      const auth = await apiClient.checkAuthOrRelogin();
      if (!auth.isAuthenticated) {
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }

      await runSinglePoll(() => pollAllEndpoints(true));
      return BackgroundFetch.BackgroundFetchResult.NewData;
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
    const { isAuthenticated } = useAuth();
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
          await pollAllEndpoints(silent);
          setLastPollTime(Date.now());
          setIsPolling(false);
        });
      },
      [isNetworkReady, isAuthenticated]
    );

    /* ---------------------------------------------------------------------- */
    /*                         BACKGROUND TASK SETUP                            */
    /* ---------------------------------------------------------------------- */

    const registerBackgroundTask = async () => {
      const settings = await getPollingSettings();
      const intervalSecs = Math.max(settings.interval * 60, 900);

      await BackgroundFetch.registerTaskAsync(BACKGROUND_POLL_TASK, {
        minimumInterval: intervalSecs,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    };

    const unregisterBackgroundTask = async () => {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_POLL_TASK);
    };

    /* ---------------------------------------------------------------------- */
    /*                           START / STOP POLLING                           */
    /* ---------------------------------------------------------------------- */

    const startPolling = useCallback(async () => {
      if (hasStartedRef.current) return;
      if (!isAuthenticated || !isNetworkReady) return;

      hasStartedRef.current = true;

      await poll(false);

      const settings = await getPollingSettings();
      const intervalMs = Math.max(settings.interval, 45) * 60 * 1000;

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

        const handleReconnect = async () => {
          resetFetchTimes();

          const auth = await apiClient.checkAuthOrRelogin();
          if (auth.isAuthenticated) {
            await poll(false);
          }
        };

        void handleReconnect();
      }
    }, [netInfo.isInternetReachable, poll]);

    /* ---------------------------------------------------------------------- */

    return {
      isPolling,
      lastPollTime,
      startPolling,
      stopPolling,
      poll,
    };
  });
