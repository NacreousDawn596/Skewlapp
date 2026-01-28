import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";
import { getPollingSettings, pollAllEndpoints, resetFetchTimes } from "../services/polling";
import { useAuth } from "./AuthContext";
import { apiClient } from "@/api/client";
import { runSinglePoll } from "@/services/pollExecutor";

import * as Network from "expo-network";

const BACKGROUND_POLL_TASK = "background-poll-task";

TaskManager.defineTask(BACKGROUND_POLL_TASK, async () => {
  try {
    console.log("[BackgroundFetch] Task triggered");

    const netState = await Network.getNetworkStateAsync();
    if (!netState.isConnected || !netState.isInternetReachable) {
      console.log("[BackgroundFetch] No internet, skipping poll");
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    try {
      await runSinglePoll(() => pollAllEndpoints(true));
      console.log("[BackgroundFetch] Poll success");
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (pollError) {
      console.warn("[BackgroundFetch] Poll failed, trying auto-login...");
    }

    const authResult = await apiClient.checkAuthOrRelogin();
    if (!authResult.isAuthenticated) {
      console.error("[BackgroundFetch] Auto-login failed");
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    console.log("[BackgroundFetch] Auto-login success, retrying poll");

    try {
      await runSinglePoll(() => pollAllEndpoints(true));
      console.log("[BackgroundFetch] Poll success after re-login");
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (retryError) {
      console.error("[BackgroundFetch] Poll failed after re-login", retryError);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

  } catch (fatalError) {
    console.error("[BackgroundFetch] Fatal error:", fatalError);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});



interface PollingContextValue {
  isPolling: boolean;
  lastPollTime: number | null;
  startPolling: () => void;
  stopPolling: () => void;
  poll: (silent?: boolean) => Promise<void>;
}

export const [PollingProvider, usePolling] =
  createContextHook<PollingContextValue>(() => {
    const { isAuthenticated } = useAuth();
    const netInfo = useNetInfo();
    const [isPolling, setIsPolling] = useState(false);
    const [lastPollTime, setLastPollTime] = useState<number | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const appState = useRef<AppStateStatus>(AppState.currentState);
    const wasOfflineRef = useRef(false);

    const isFirstPoll = useRef(true);

    // Add flag to track if polling already started
    const isPollingStartedRef = useRef(false);

    const poll = async (silent = false) => {
      await runSinglePoll(async () => {
        setIsPolling(true);
        await pollAllEndpoints(silent);
        setLastPollTime(Date.now());
        setIsPolling(false);
      });
    };


    const registerBackgroundTask = async () => {
      try {
        const settings = await getPollingSettings();
        const intervalSecs = Math.max(settings.interval * 60, 900); // Minutes to seconds, min 15 mins

        await BackgroundFetch.registerTaskAsync(BACKGROUND_POLL_TASK, {
          minimumInterval: intervalSecs,
          stopOnTerminate: false,
          startOnBoot: true,
        });
        console.log("[BackgroundFetch] Task registered");
      } catch (err) {
        console.error("[BackgroundFetch] Registration failed:", err);
      }
    };

    const unregisterBackgroundTask = async () => {
      try {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_POLL_TASK);
        console.log("[BackgroundFetch] Task unregistered");
      } catch (err) { }
    };

    const startPolling = useCallback(async () => {
      if (isPollingStartedRef.current) return; // Prevent duplicate startup
      isPollingStartedRef.current = true;

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      const wasFirst = isFirstPoll.current;
      if (wasFirst) {
        setIsPolling(true);
        isFirstPoll.current = false;
      }
      try {
        await poll(!wasFirst); // FIX: invert silent value - first poll NOT silent
      } finally {
        setIsPolling(false);
      }

      const settings = await getPollingSettings();
      const intervalMs = Math.max(settings.interval, 45) * 60 * 1000; // Minutes to ms

      intervalRef.current = setInterval(() => poll(true), intervalMs); // Subsequent polls silent
    }, []);

    const stopPolling = useCallback(() => {
      isPollingStartedRef.current = false; // Reset flag
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsPolling(false);
      void unregisterBackgroundTask();
    }, []);

    useEffect(() => {
      if (!isAuthenticated) {
        stopPolling();
        return;
      }

      const subscription = AppState.addEventListener("change", (nextAppState) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          if (isAuthenticated) {
            void startPolling();
          }
        }

        appState.current = nextAppState;
      });

      void startPolling();

      return () => {
        stopPolling();
        subscription.remove();
      };
    }, [isAuthenticated, startPolling, stopPolling]);

    // Handle network reconnection - reset fetch times and poll everything
    useEffect(() => {
      if (!netInfo.isConnected) {
        wasOfflineRef.current = true;
        return;
      }

      // Just came back online
      if (wasOfflineRef.current && netInfo.isConnected) {
        console.log("[PollingContext] Network reconnected - resetting fetch times and polling...");
        wasOfflineRef.current = false;

        const handleReconnection = async () => {
          try {
            // Reset fetch times to force refetch of all cached endpoints
            resetFetchTimes();

            // Check auth status and auto-login if needed
            const authStatus = await apiClient.checkAuthOrRelogin();
            console.log("[PollingContext] Auth status after reconnection:", authStatus.isAuthenticated);

            // If authenticated, poll all endpoints
            if (authStatus.isAuthenticated) {
              await poll(false);
            }
          } catch (e) {
            console.error("[PollingContext] Reconnection handler error:", e);
          }
        };

        void handleReconnection();
      }
    }, [netInfo.isConnected, poll]);

    return {
      isPolling,
      lastPollTime,
      startPolling,
      stopPolling,
      poll,
    };
  });