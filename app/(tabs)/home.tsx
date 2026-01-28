import { useNetInfo } from "@react-native-community/netinfo";
import { WifiOff } from "lucide-react-native";

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
import { useMutation, useQuery } from "@tanstack/react-query";
import { getActivityFeed, clearActivityFeed } from "@/services/activity";
import { getCachedData } from "@/services/cache";
import { getPollingSettings, savePollingSettings } from "@/services/polling";
import { ActivityItem } from "@/types/api";
import { Stack } from "expo-router";
import {
  Bell,
  BellOff,
  TrendingUp,
  BookOpen,
  GraduationCap,
  ShieldAlert,
  Clock,
  FileText,
  User,
  ChevronRight as ChevronRightIcon,
} from "lucide-react-native";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { withReactQueryAuthHandler } from "@/services/apiErrorHandler";

dayjs.extend(relativeTime);

const { width } = Dimensions.get("window");

const ActivityIcon = ({ type, accent, muted, scaled }: { type: ActivityItem["type"], accent: string, muted: string, scaled: (n: number) => number }) => {
  switch (type) {
    case "note":
      return <TrendingUp size={scaled(20)} color={accent} />;
    case "absence":
    case "sanction":
      return <Bell size={scaled(20)} color="#FF6B6B" />;
    default:
      return <Bell size={scaled(20)} color={muted} />;
  }
};

const ChevronRightComponent = ({ size, color }: { size: number; color: string }) => {
  return (
    <View style={{ transform: [{ rotate: '0deg' }] }}>
      <Text style={{ color, fontSize: size }}>›</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { theme } = useTheme();
  const scale = useFontScale();
  const scaled = (size: number) => size * scale;
  const { profile, handleUnauthorized } = useAuth();
  const { lastPollTime, isPolling, poll } = usePolling();
  const netInfo = useNetInfo();

  // 🔥 NEW: Wrapped with auth error handler
  const activityQuery = useQuery({
    queryKey: ["activity"],
    queryFn: withReactQueryAuthHandler(
      getActivityFeed,
      handleUnauthorized
    ),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // 🔥 NEW: Wrapped with auth error handler
  const absencesQuery = useQuery({
    queryKey: ["absences_summary"],
    queryFn: withReactQueryAuthHandler(
      () => getCachedData("absences"),
      handleUnauthorized
    ),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // 🔥 NEW: Wrapped with auth error handler
  const sanctionsQuery = useQuery({
    queryKey: ["sanctions_summary"],
    queryFn: withReactQueryAuthHandler(
      () => getCachedData("sanctions"),
      handleUnauthorized
    ),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      paddingBottom: 32,
    },
    headerGradient: {
      paddingTop: 20,
      paddingBottom: 30,
      paddingHorizontal: 20,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
    },
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
    },
    avatarContainer: {
      width: scaled(80),
      height: scaled(80),
      borderRadius: scaled(40),
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.3)",
      marginRight: 16,
      overflow: "hidden",
    },
    avatar: {
      width: "100%",
      height: "100%",
    },
    welcomeMsg: {
      fontSize: scaled(16),
      color: "rgba(255,255,255,0.8)",
      fontWeight: "500",
    },
    profileName: {
      fontSize: scaled(26),
      fontWeight: "800",
      color: "#FFFFFF",
      marginTop: 2,
    },
    statusBadge: {
      backgroundColor: "rgba(255,255,255,0.25)",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      alignSelf: "flex-start",
      marginTop: 8,
    },
    statusText: {
      color: "#FFFFFF",
      fontSize: scaled(12),
      fontWeight: "600",
    },
    statsContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      marginTop: -25,
    },
    statCard: {
      backgroundColor: theme.surface,
      width: (width - 48) / 3,
      padding: scaled(16),
      borderRadius: 20,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
    statValue: {
      fontSize: scaled(20),
      fontWeight: "800",
      color: theme.text,
      marginTop: 8,
    },
    statLabel: {
      fontSize: scaled(11),
      color: theme.muted,
      marginTop: 2,
      textAlign: "center",
    },
    section: {
      marginTop: 24,
      paddingHorizontal: 16,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: scaled(19),
      fontWeight: "700",
      color: theme.text,
    },
    viewAll: {
      fontSize: scaled(14),
      color: theme.accent,
      fontWeight: "600",
    },
    infoCard: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 20,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    infoIcon: {
      width: scaled(36),
      height: scaled(36),
      borderRadius: 18,
      backgroundColor: theme.background,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    infoLabel: {
      fontSize: scaled(12),
      color: theme.muted,
    },
    infoValue: {
      fontSize: scaled(15),
      fontWeight: "600",
      color: theme.text,
    },
    activityCard: {
      backgroundColor: theme.surface,
      padding: 16,
      borderRadius: 16,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
    },
    activityIcon: {
      width: scaled(44),
      height: scaled(44),
      borderRadius: 12,
      backgroundColor: theme.background,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    activityContent: {
      flex: 1,
    },
    activityTitle: {
      fontSize: scaled(15),
      fontWeight: "600",
      color: theme.text,
    },
    activityMeta: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 2,
    },
    activityTime: {
      fontSize: scaled(12),
      color: theme.muted,
    },
    emptyState: {
      backgroundColor: theme.surface,
      padding: 40,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyStateText: {
      fontSize: scaled(15),
      color: theme.muted,
      textAlign: "center",
      marginTop: 12,
    },
    offlineBanner: {
      padding: 12,
      backgroundColor: "#FF6B6B",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    offlineText: {
      color: "white",
      marginLeft: 8,
      fontSize: 12,
      fontWeight: "600",
    },
  });

  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.administrative_info?.Code) return;

    fetch(
      `https://schoolapp.ensam-umi.ac.ma/getphoto/${profile.administrative_info.Code}`,
      {
        headers: {
          Cookie: `JSESSIONID=${profile.session_id}`,
          Referer: "https://schoolapp.ensam-umi.ac.ma/index",
        },
      }
    )
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setAvatarUri(reader.result as string);
        };
        reader.readAsDataURL(blob);
      })
      .catch(err => console.log("Avatar fetch failed", err));
  }, [profile]);

  const getAbsenceCount = () => {
    if (absencesQuery.isLoading && !absencesQuery.data) return "--";
    const data = absencesQuery.data as any;
    if (data && data.details) {
      return data.details.length.toString();
    }
    return lastPollTime ? "0" : "--";
  };

  const getSanctionValue = () => {
    if (sanctionsQuery.isLoading && !sanctionsQuery.data) return "--";
    const data = sanctionsQuery.data as any;
    if (!data) return lastPollTime ? "None" : "--";
    return data.Sanction || "None";
  };

  const isOffline = netInfo.isInternetReachable === false;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      {isOffline && (
        <View style={styles.offlineBanner}>
          <WifiOff size={16} color="white" />
          <Text style={styles.offlineText}>Vous êtes hors ligne</Text>
        </View>
      )}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isPolling && !lastPollTime}
            onRefresh={() => poll(false)}
            tintColor={theme.accent}
          />
        }
      >
        <LinearGradient
          colors={[theme.accent, theme.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.profileRow}>
            <View style={styles.avatarContainer}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <User size={40} color="#FFFFFF" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.welcomeMsg}>Bonjour,</Text>
              <Text style={styles.profileName} numberOfLines={1}>
                {profile?.basic_info?.full_name?.split(" ")[0] || "Étudiant"}
              </Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {profile?.administrative_info?.Code || "Étudiant Actif"}
                </Text>
              </View>
              {lastPollTime && (
                <Text style={{ color: "white", fontSize: 12, marginTop: 4 }}>
                  Dernière mise à jour: {dayjs(lastPollTime).fromNow()}
                </Text>
              )}
            </View>
            <TouchableOpacity style={styles.avatarContainer} onPress={toggleNotifications}>
              {notificationIcon}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => {
              const url = profile?.download_links?.attestation_scolarite;
              if (url) {
                Linking.openURL(`https://schoolapp.ensam-umi.ac.ma${url}`);
              }
            }}
          >
            <FileText size={24} color="#4ECDC4" />
            <Text style={styles.statValue}>PDF</Text>
            <Text style={styles.statLabel}>Scolarité</Text>
          </TouchableOpacity>
          <View style={styles.statCard}>
            <Clock size={24} color="#FF6B6B" />
            <Text style={styles.statValue}>{getAbsenceCount()}</Text>
            <Text style={styles.statLabel}>Absences</Text>
          </View>
          <View style={styles.statCard}>
            <ShieldAlert size={24} color="#FFD93D" />
            <Text style={styles.statValue}>{getSanctionValue()}</Text>
            <Text style={styles.statLabel}>Sanctions</Text>
          </View>
        </View>

        {!lastPollTime && isPolling && (
          <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
            <View style={{ backgroundColor: theme.surface, padding: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={{ marginLeft: 10, color: theme.muted, fontSize: 13, fontWeight: '600' }}>Synchronisation initiale des données en cours...</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations académiques</Text>
          <View style={[styles.infoCard, { marginTop: 12 }]}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <GraduationCap size={20} color={theme.accent} />
              </View>
              <View>
                <Text style={styles.infoLabel}>Programme / Filière</Text>
                <Text style={styles.infoValue}>{profile?.administrative_info?.Filière || "N/A"}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <TrendingUp size={20} color={theme.accent} />
              </View>
              <View>
                <Text style={styles.infoLabel}>Niveau</Text>
                <Text style={styles.infoValue}>{profile?.administrative_info?.Niveau || "N/A"}</Text>
              </View>
            </View>
            <View style={[styles.infoRow, { marginBottom: 0 }]}>
              <View style={styles.infoIcon}>
                <BookOpen size={20} color={theme.accent} />
              </View>
              <View>
                <Text style={styles.infoLabel}>Section / Groupe</Text>
                <Text style={styles.infoValue}>
                  {profile?.administrative_info?.Section} - {profile?.administrative_info?.["Sous Groupe"] || "N/A"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mises à jour récentes</Text>
            <TouchableOpacity onPress={async () => { await clearActivityFeed(); activityQuery.refetch(); }}>
              <Text style={styles.viewAll}>Effacer</Text>
            </TouchableOpacity>
          </View>

          {activityQuery.data && activityQuery.data.length > 0 ? (
            activityQuery.data.slice(0, 5).map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={styles.activityCard}
                activeOpacity={0.7}
              >
                <View style={styles.activityIcon}>
                  <ActivityIcon
                    type={activity.type}
                    accent={theme.accent}
                    muted={theme.muted}
                    scaled={scaled}
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <View style={styles.activityMeta}>
                    <Text style={styles.activityTime}>
                      {dayjs(activity.timestamp).fromNow()}
                    </Text>
                  </View>
                </View>
                <ChevronRightComponent size={18} color={theme.muted} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Bell size={40} color={theme.muted} />
              <Text style={styles.emptyStateText}>
                Aucune activité récente. Les mises à jour apparaîtront ici.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}