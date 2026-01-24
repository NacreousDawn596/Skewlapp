import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { getPollingSettings, pollAllEndpoints } from "../services/polling";
import { useAuth } from "./AuthContext";

const BACKGROUND_POLL_TASK = "background-poll-task";

TaskManager.defineTask(BACKGROUND_POLL_TASK, async () => {
  try {
    console.log("[BackgroundFetch] Task triggered");
    await pollAllEndpoints();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("[BackgroundFetch] Task failed:", error);
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
    const [isPolling, setIsPolling] = useState(false);
    const [lastPollTime, setLastPollTime] = useState<number | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const appState = useRef<AppStateStatus>(AppState.currentState);

    const isFirstPoll = useRef(true);

    const poll = async (silent: boolean = false) => {
      console.log(`[PollingContext] Starting poll (Silent: ${silent})...`);
      try {
        await pollAllEndpoints(silent);
        console.log(`[PollingContext] Poll complete.`);
        setLastPollTime(Date.now());
      } catch (e) {
        console.error(`[PollingContext] Poll failed:`, e);
      }
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
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      setIsPolling(true);
      const wasFirst = isFirstPoll.current;
      if (wasFirst) isFirstPoll.current = false;
      await poll(wasFirst);

      const settings = await getPollingSettings();
      const intervalMs = Math.max(settings.interval, 45) * 60 * 1000; // Minutes to ms

      intervalRef.current = setInterval(poll, intervalMs);

      void registerBackgroundTask();
    }, []);

    const stopPolling = useCallback(() => {
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

    return {
      isPolling,
      lastPollTime,
      startPolling,
      stopPolling,
      poll,
    };
  });
