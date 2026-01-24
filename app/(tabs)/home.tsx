import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useTheme, useFontScale } from "@/themes/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePolling } from "@/contexts/PollingContext";
import { useQuery } from "@tanstack/react-query";
import { getActivityFeed, getCachedData, clearActivityFeed } from "@/services/polling";
import { ActivityItem } from "@/types/api";
import { Stack } from "expo-router";
import {
  Bell,
  TrendingUp,
  BookOpen,
  GraduationCap,
  ShieldAlert,
  Clock,
  FileText,
  User,
  ChevronRight as ChevronRightIcon
} from "lucide-react-native";
import { Bell, BellOff, BellRing } from "lucide-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getPollingSettings, savePollingSettings } from "@/services/polling";

// ... (rest of the file)

export default function HomeScreen() {
  const { theme } = useTheme();
  const scale = useFontScale();
  const scaled = (size: number) => size * scale;
  const { profile } = useAuth();
  const { lastPollTime, isPolling, poll } = usePolling();

  const pollingSettingsQuery = useQuery({
    queryKey: ["pollingSettings"],
    queryFn: getPollingSettings,
  });

  const updatePollingSettingsMutation = useMutation({
    mutationFn: savePollingSettings,
    onSuccess: () => {
      pollingSettingsQuery.refetch();
    },
  });

  const toggleNotifications = () => {
    const currentStatus = pollingSettingsQuery.data?.notificationsEnabled ?? true;
    updatePollingSettingsMutation.mutate({ notificationsEnabled: !currentStatus });
  };

  const notificationIcon = pollingSettingsQuery.data?.notificationsEnabled ? (
    <Bell size={24} color="#FFFFFF" />
  ) : (
    <BellOff size={24} color="#FFFFFF" />
  );

  // ... (rest of the file)

            <TouchableOpacity style={styles.avatarContainer} onPress={toggleNotifications}>
              {notificationIcon}
            </TouchableOpacity>

