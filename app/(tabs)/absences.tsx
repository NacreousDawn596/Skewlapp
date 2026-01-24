import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useTheme } from "@/themes/ThemeContext";
import { Stack } from "expo-router";
import { schoolAppClient } from "@/api/client";
import {
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  FileText,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Clock
} from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { usePolling } from "@/contexts/PollingContext";
import { useQuery } from "@tanstack/react-query";
import { getCachedData } from "@/services/cache";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get("window");

type Tab = "absences" | "sanctions";

const AbsenceItem = ({ item, name, theme, styles }: any) => {
  const isJustified = item.Justif === true || item.Justif === "true" || item.Justifiee === "OUI";

  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: isJustified ? '#6BCB7720' : '#FF6B6B20' }]}>
        {isJustified ? <CheckCircle2 size={22} color="#6BCB77" /> : <XCircle size={22} color="#FF6B6B" />}
      </View>
      <View style={styles.contentBox}>
        <Text style={styles.itemTitle}>{name || item.Element || "Unknown Course"}</Text>
        <Text style={styles.itemMeta}>{item.Element || ""} • {item.Date || item.date || "N/A"}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: isJustified ? '#6BCB7720' : '#FF6B6B20' }]}>
        <Text style={[styles.statusText, { color: isJustified ? '#6BCB77' : '#FF6B6B' }]}>
          {isJustified ? 'JUSTIFIÉE' : 'NON JUSTIFIÉE'}
        </Text>
      </View>
    </View>
  );
};

const SanctionHeader = ({ data, theme, styles }: any) => (
  <View style={[styles.card, { backgroundColor: '#FF6B6B10', borderColor: '#FF6B6B', borderWidth: 1 }]}>
    <View style={styles.iconBox}>
      <AlertCircle size={24} color="#FF6B6B" />
    </View>
    <View style={styles.contentBox}>
      <Text style={[styles.itemTitle, { color: '#FF6B6B' }]}>Statut actuel : {data.Sanction || "Aucune"}</Text>
      <Text style={styles.itemMeta}>Total non justifiées : {data.Absences_non_justifiees || 0}</Text>
    </View>
  </View>
);

const SanctionItem = ({ item, theme, styles }: any) => (
  <View style={styles.card}>
    <View style={[styles.iconBox, { backgroundColor: theme.primary + '20' }]}>
      <FileText size={22} color={theme.primary} />
    </View>
    <View style={styles.contentBox}>
      <Text style={styles.itemTitle}>{item.Type || "Sanction"}</Text>
      <Text style={styles.itemMeta}>{item.Date || "N/A"}</Text>
    </View>
  </View>
);

export default function AbsencesScreen() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("absences");
  const { lastPollTime, isPolling, poll } = usePolling();

  const absencesQuery = useQuery({
    queryKey: ["absences_data", lastPollTime],
    queryFn: () => getCachedData("absences"),
  });

  const sanctionsQuery = useQuery({
    queryKey: ["sanctions_data", lastPollTime],
    queryFn: () => getCachedData("sanctions"),
  });

  const getNiveauFromSemestre = (S: string): string => {
    const sNum = parseInt(S.replace("S", ""), 10);
    if (sNum <= 2) return "1A";
    if (sNum <= 4) return "2A";
    if (sNum <= 6) return "3A";
    if (sNum <= 8) return "4A";
    return "5A";
  };

  const getSemesterFromCode = (code: string): string => {
    if (!code) return "S1";
    const reversed = code.split("").reverse();
    const digit = reversed.length >= 3 ? reversed[2] : reversed[1];
    return `S${digit}`;
  };

  const { data: moduleMappings } = useQuery({
    queryKey: ["absence_name_mappings", absencesQuery.data, sanctionsQuery.data, profile?.administrative_info],
    queryFn: async () => {
      const absences = (absencesQuery.data as any)?.details || [];
      const sanctions = Array.isArray(sanctionsQuery.data) ? sanctionsQuery.data : ((sanctionsQuery.data as any)?.details || []);
      if (!profile?.administrative_info) return {};
      const targets = new Set<string>();
      [...absences, ...sanctions].forEach(item => {
        const code = item.Element || item.Module || item.Type;
        if (code && code.length >= 4) {
          const S = getSemesterFromCode(code);
          const N = getNiveauFromSemestre(S);
          const admin = profile.administrative_info;
          const F = admin.Filière || admin.Filiere;
          if (N && F && S) targets.add(`${N}|${F}|${S}`);
        }
      });
      const mapping: Record<string, string> = {};
      await Promise.all([...targets].map(async (target) => {
        const [N, F, S] = target.split("|");
        try {
          const modulesObj = await schoolAppClient.getModules(N, F, S);
          if (modulesObj && typeof modulesObj === 'object') {
            Object.entries(modulesObj).forEach(([modCode, modData]: [string, any]) => {
              mapping[modCode] = modData.intitule;
              if (Array.isArray(modData.elements)) {
                modData.elements.forEach((elem: any) => {
                  if (elem.code) mapping[elem.code] = elem.intitule;
                });
              }
            });
          }
        } catch (e) { }
      }));
      return mapping;
    },
    enabled: (!!absencesQuery.data || !!sanctionsQuery.data) && !!profile?.administrative_info,
    staleTime: Infinity,
  });

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { padding: 20, backgroundColor: theme.surface, paddingBottom: 0 },
    title: { fontSize: 24, fontWeight: "800", color: theme.text, marginBottom: 20 },
    tabs: { flexDirection: "row", marginBottom: 2 },
    tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 3, borderBottomColor: "transparent" },
    activeTab: { borderBottomColor: theme.accent },
    tabText: { fontSize: 15, fontWeight: "600", color: theme.muted },
    activeTabText: { color: theme.accent },
    scrollContent: { padding: 16 },
    card: { backgroundColor: theme.surface, borderRadius: 20, padding: 16, marginBottom: 12, flexDirection: "row", alignItems: "center" },
    iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 14 },
    contentBox: { flex: 1 },
    itemTitle: { fontSize: 15, fontWeight: "600", color: theme.text },
    itemMeta: { fontSize: 12, color: theme.muted, marginTop: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
    statusText: { fontSize: 10, fontWeight: "700" },
    emptyContainer: { padding: 40, alignItems: "center" },
    emptyText: { color: theme.muted, textAlign: "center", fontSize: 15, marginTop: 12 }
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Text style={styles.title}>Absences et Sanctions</Text>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "absences" && styles.activeTab]}
            onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setActiveTab("absences"); }}
          >
            <Text style={[styles.tabText, activeTab === "absences" && styles.activeTabText]}>ABSENCES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "sanctions" && styles.activeTab]}
            onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setActiveTab("sanctions"); }}
          >
            <Text style={[styles.tabText, activeTab === "sanctions" && styles.activeTabText]}>SANCTIONS</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => poll(false)}
            tintColor={theme.accent}
          />
        }
      >
        {!lastPollTime && isPolling && (
          <View style={{ marginBottom: 16 }}>
            <View style={{ backgroundColor: theme.surface, padding: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={{ marginLeft: 10, color: theme.muted, fontSize: 13, fontWeight: '600' }}>Accès aux dossiers...</Text>
            </View>
          </View>
        )}

        {activeTab === "absences" ? (
          (() => {
            const data = absencesQuery.data as any;
            const items = data?.details || [];

            if (absencesQuery.isLoading && items.length === 0) {
              return <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />;
            }

            if (items.length === 0) {
              return (
                <View style={styles.emptyContainer}>
                  <Clock size={48} color={theme.muted} style={{ opacity: 0.5 }} />
                  <Text style={styles.emptyText}>Aucune absence enregistrée pour la session en cours.</Text>
                </View>
              );
            }

            return items.map((item: any, index: number) => (
              <AbsenceItem key={index} item={item} name={moduleMappings?.[item.Element] || item.Element} theme={theme} styles={styles} />
            ));
          })()
        ) : (
          (() => {
            const data = sanctionsQuery.data as any;
            const items = Array.isArray(data) ? data : (data?.details || []);

            if (sanctionsQuery.isLoading && items.length === 0 && !data?.Sanction) {
              return <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />;
            }

            if (items.length === 0 && !data?.Sanction && !data?.Elements_non_autorises?.length) {
              return (
                <View style={styles.emptyContainer}>
                  <ShieldAlert size={48} color={theme.muted} style={{ opacity: 0.5 }} />
                  <Text style={styles.emptyText}>Vous n'avez pas de sanctions académiques. Continuez comme ça !</Text>
                </View>
              );
            }

            return (
              <View>
                {data?.Sanction && <SanctionHeader data={data} theme={theme} styles={styles} />}
                {data?.Elements_non_autorises?.map((code: string, idx: number) => (
                  <View key={`unauth-${idx}`} style={[styles.card, { backgroundColor: '#FF6B6B10' }]}>
                    <View style={styles.iconBox}><XCircle size={22} color="#FF6B6B" /></View>
                    <View style={styles.contentBox}>
                      <Text style={[styles.itemTitle, { color: '#FF6B6B' }]}>Non autorisé : {moduleMappings?.[code] || code}</Text>
                      <Text style={styles.itemMeta}>• {code} •</Text>
                    </View>
                  </View>
                ))}
                {items.map((item: any, index: number) => (
                  <SanctionItem key={index} item={item} theme={theme} styles={styles} />
                ))}
              </View>
            );
          })()
        )}
      </ScrollView>
    </View >
  );
}
