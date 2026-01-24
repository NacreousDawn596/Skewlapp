import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityItem } from "../types/api";

export const ACTIVITY_KEY = "skewl_activity";

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

export const addActivity = async (activity: Omit<ActivityItem, "id" | "timestamp">): Promise<void> => {
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
