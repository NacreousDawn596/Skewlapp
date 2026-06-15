import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log("❌ Notification permissions denied");
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return true;
};

// In-memory cache to prevent duplicate notifications within a short window (e.g., 10 seconds)
const sentNotificationsCache = new Map<string, number>();
const DEDUPLICATION_WINDOW_MS = 10000;

export const scheduleNotification = async (
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> => {
  try {
    const now = Date.now();
    const hash = `${title}|${body}`;

    // Deduplication check
    const lastSent = sentNotificationsCache.get(hash);
    if (lastSent && now - lastSent < DEDUPLICATION_WINDOW_MS) {
        console.log(`[Notifications] Deduplicating identical notification: ${title}`);
        return;
    }
    sentNotificationsCache.set(hash, now);

    // Cleanup old cache entries periodically
    if (sentNotificationsCache.size > 50) {
        for (const [key, timestamp] of sentNotificationsCache.entries()) {
            if (now - timestamp > DEDUPLICATION_WINDOW_MS) {
                sentNotificationsCache.delete(key);
            }
        }
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: null,
    });
  } catch (error) {
    console.error("Failed to schedule notification:", error);
  }
};

export const addNotificationResponseListener = (
  callback: (response: Notifications.NotificationResponse) => void
) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};
