import React, { useState, useEffect } from "react";
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
  ActivityIndicator
} from "react-native";
import { useTheme } from "@/themes/ThemeContext";
import { Stack } from "expo-router";
import { schoolAppClient } from "@/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNetInfo } from "@react-native-community/netinfo";
import {
  ChevronRight,
  ChevronLeft,
  BookOpen,
  GraduationCap,
  Search,
  Library,
  Network,
  Activity,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  ChevronDown
} from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { getCachedData, getCachedModules, setCachedModules } from "@/services/cache";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get("window");

type Utility = "filieres" | "modules" | "status";

export default function UtilsScreen() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const [activeUtil, setActiveUtil] = useState<Utility | null>(null);

  const [selNiveau, setSelNiveau] = useState("1A");
  const [selFiliere, setSelFiliere] = useState("");
  const [selSemestre, setSelSemestre] = useState("S1");
  const netInfo = useNetInfo();

  const filieresQuery = useQuery({
    queryKey: ["all_filieres"],
    queryFn: () => getCachedData("filieres"),
    staleTime: Infinity,
    refetchOnReconnect: false,
  });

  const modulesLookupQuery = useQuery({
    queryKey: ["lookup_modules", selNiveau, selFiliere, selSemestre],
    queryFn: async () => {
      const cacheKey = `${selNiveau}_${selFiliere}_${selSemestre}`;
      console.log(`[Utils] Loading modules for ${cacheKey}`);
      
      try {
        // Try to fetch fresh data first
        console.log(`[Utils] Attempting fresh fetch for ${cacheKey}...`);
        const freshData = await schoolAppClient.getModules(selNiveau, selFiliere, selSemestre);
        const hasContent = freshData && ((Array.isArray(freshData) && freshData.length > 0) || (typeof freshData === 'object' && Object.keys(freshData).length > 0));
        
        if (hasContent) {
          console.log(`[Utils] Got fresh data for ${cacheKey}`);
          // Only cache if we have internet and data is not empty
          if (netInfo.isConnected) {
            await setCachedModules(selNiveau, selFiliere, selSemestre, freshData);
            console.log(`[Utils] Cached fresh data for ${cacheKey}`);
          } else {
            console.log(`[Utils] Offline, not caching for ${cacheKey}`);
          }
          return freshData;
        }
      } catch (e) {
        console.log(`[Utils] Fresh fetch failed for ${cacheKey}:`, e);
      }
      
      // Try cache as fallback
      console.log(`[Utils] Trying cache for ${cacheKey}...`);
      const cachedData = await getCachedModules(selNiveau, selFiliere, selSemestre);
      const hasCachedContent = cachedData && ((Array.isArray(cachedData) && cachedData.length > 0) || (typeof cachedData === 'object' && Object.keys(cachedData).length > 0));
      
      if (hasCachedContent) {
        console.log(`[Utils] Using cached data for ${cacheKey}`);
        return cachedData;
      }
      
      console.log(`[Utils] No valid data found for ${cacheKey}`);
      return null;
    },
    enabled: activeUtil === "modules" && !!selFiliere,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const platformStatusQuery = useQuery({
    queryKey: ["platform_status"],
    queryFn: async () => {
      const start = Date.now();
      try {
        const res = await fetch("https://schoolapp.ensam-umi.ac.ma/", {
          method: 'HEAD',
          cache: 'no-store',
        });
        return {
          online: res.ok || res.status < 500,
          latency: Date.now() - start,
          time: new Date().toLocaleTimeString()
        };
      } catch (e) {
        return { online: false, latency: 0, time: new Date().toLocaleTimeString() };
      }
    },
    enabled: activeUtil === "status",
    refetchInterval: 15000,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (filieresQuery.data && Array.isArray(filieresQuery.data) && !selFiliere) {
      const admin = profile?.administrative_info;
      const userF = admin?.Filière || admin?.Filiere;
      const data = filieresQuery.data as any[];
      const match = data.find((f: any) => f.Code === userF);
      setSelFiliere(match?.Code || data[0]?.Code || "");
    }
  }, [filieresQuery.data, profile, selFiliere]);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { flexDirection: "row", alignItems: "center", padding: 20, backgroundColor: theme.surface },
    headerTitle: { fontSize: 22, fontWeight: "800", color: theme.text, marginLeft: activeUtil ? 12 : 0 },
    scrollContent: { padding: 16 },
    menuCard: { backgroundColor: theme.surface, borderRadius: 24, padding: 20, marginBottom: 16, flexDirection: "row", alignItems: "center", elevation: 2 },
    iconBg: { width: 52, height: 52, borderRadius: 16, backgroundColor: theme.background, alignItems: "center", justifyContent: "center", marginRight: 16 },
    textContainer: { flex: 1 },
    menuTitle: { fontSize: 17, fontWeight: "700", color: theme.text },
    menuSub: { fontSize: 13, color: theme.muted, marginTop: 2 },

    selectorContainer: { marginBottom: 20, backgroundColor: theme.surface, borderRadius: 24, padding: 16, elevation: 1 },
    selectorLabel: { fontSize: 11, fontWeight: '800', color: theme.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    pickerRow: { flexDirection: 'row', marginBottom: 16 },
    chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, backgroundColor: theme.background, marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
    chipActive: { backgroundColor: theme.accent + '20', borderColor: theme.accent },
    chipText: { fontSize: 13, fontWeight: '600', color: theme.muted },
    chipTextActive: { color: theme.accent },

    modCard: { backgroundColor: theme.surface, borderRadius: 24, padding: 20, marginBottom: 16, elevation: 2, borderLeftWidth: 4, borderLeftColor: theme.accent },
    modTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 4 },
    modCode: { fontSize: 11, color: theme.accent, fontWeight: '800', marginBottom: 2 },
    modMeta: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.background },
    metaItem: { flex: 1, alignItems: 'center' },
    metaLabel: { fontSize: 9, color: theme.muted, textTransform: 'uppercase', marginBottom: 2 },
    metaVal: { fontSize: 13, fontWeight: '700', color: theme.text },

    elemRow: { marginTop: 12, padding: 12, backgroundColor: theme.background, borderRadius: 16 },
    elemTitle: { fontSize: 13, fontWeight: '700', color: theme.text },
    elemMeta: { fontSize: 10, color: theme.muted, marginTop: 2 },
    statusCard: { backgroundColor: theme.surface, borderRadius: 32, padding: 32, alignItems: 'center', elevation: 3 },
    statusIndicator: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    statusTitle: { fontSize: 28, fontWeight: '900', marginBottom: 8 },
    statusSub: { fontSize: 15, color: theme.muted, textAlign: 'center' },

    listItem: { backgroundColor: theme.surface, borderRadius: 20, padding: 18, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 1 },
    itemTitle: { fontSize: 16, fontWeight: "700", color: theme.text },
    emptyContainer: { padding: 60, alignItems: 'center' },
    emptyText: { color: theme.muted, textAlign: "center", fontSize: 15, marginTop: 16, fontWeight: '500' }
  });

  const handleBack = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveUtil(null);
  };

  const renderModuleLibrary = () => {
    const niveaus = ["1A", "2A", "3A", "4A", "5A"];
    const semestres = ["S1", "S2"];
    const filieres = (filieresQuery.data?.map((i: any) => ({
      name: i.Intitule,
      code: i.Code,
      acc: i.Accreditation,
      dept: i.Departement,
      desc: i.Descriptif,
    })) || []) as any[];

    return (
      <View>
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorLabel}>Niveau académique</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
            {niveaus.map(n => (
              <TouchableOpacity key={`niv-${n}`} onPress={() => setSelNiveau(n)} style={[styles.chip, selNiveau === n && styles.chipActive]}>
                <Text style={[styles.chipText, selNiveau === n && styles.chipTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.selectorLabel}>Semestre</Text>
          <View style={styles.pickerRow}>
            {semestres.map(s => (
              <TouchableOpacity key={`sem-${s}`} onPress={() => setSelSemestre(s)} style={[styles.chip, selSemestre === s && styles.chipActive]}>
                <Text style={[styles.chipText, selSemestre === s && styles.chipTextActive]}>{s === "S1" ? "Semestre 1" : "Semestre 2"}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.selectorLabel}>Programme (Filière)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filieres.map((f: any, idx: number) => (
              <TouchableOpacity key={`filiere-sel-${f.code || idx}`} onPress={() => setSelFiliere(f.code)} style={[styles.chip, selFiliere === f.code && styles.chipActive]}>
                <Text style={[styles.chipText, selFiliere === f.code && styles.chipTextActive]}>{f.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {modulesLookupQuery.isLoading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={{ color: theme.muted, marginTop: 12, fontWeight: '600' }}>Chargement des modules...</Text>
          </View>
        ) : (
          Object.entries(modulesLookupQuery.data || {}).length > 0 ? (
            Object.entries(modulesLookupQuery.data || {}).map(([code, mData]: [string, any]) => (
              <View key={`mod-${code}`} style={styles.modCard}>
                <Text style={styles.modCode}>{code}</Text>
                <Text style={styles.modTitle}>{mData.intitule}</Text>

                <View style={styles.modMeta}>
                  <View style={styles.metaItem}><Text style={styles.metaLabel}>VH</Text><Text style={styles.metaVal}>{mData.vhmod}h</Text></View>
                  <View style={styles.metaItem}><Text style={styles.metaLabel}>Coef</Text><Text style={styles.metaVal}>{mData.coef}</Text></View>
                  <View style={styles.metaItem}><Text style={styles.metaLabel}>Seuil</Text><Text style={styles.metaVal}>{mData.seuil}</Text></View>
                  <View style={styles.metaItem}><Text style={styles.metaLabel}>Elim</Text><Text style={[styles.metaVal, { color: theme.accent }]}>{mData.eliminatoire}</Text></View>
                </View>

                {mData.elements?.map((elem: any, eIdx: number) => (
                  <View key={`elem-${elem.code || eIdx}`} style={styles.elemRow}>
                    <Text style={styles.elemTitle}>{elem.intitule}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                      <Text style={styles.elemMeta}>{elem.code} • Coef: {elem.coef_elem}</Text>
                      <Text style={[styles.elemMeta, { marginLeft: 8 }]}>• CC: {elem.coef_cc} | EX: {elem.coef_ex} | TP: {elem.coef_tp}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Library size={48} color={theme.muted} style={{ opacity: 0.3 }} />
              <Text style={styles.emptyText}>Aucun module disponible pour cette sélection.</Text>
            </View>
          )
        )}
      </View>
    );
  };

  const renderFilieres = () => {
    if (filieresQuery.isLoading) return <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} />;
    const data = filieresQuery.data as any[];
    return data?.map((item: any, index: number) => (
      <View key={`filiere-item-${item.Code || index}`} style={styles.listItem}>
        <View style={[styles.iconBg, { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.accent + '15' }]}>
          <GraduationCap size={20} color={theme.accent} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.itemTitle}>{item.Intitule}</Text>
          <Text style={[styles.menuSub, { fontWeight: '700', color: theme.accent }]}>{item.Code}</Text>
        </View>
        <ChevronRight size={16} color={theme.muted} style={{ opacity: 0.5 }} />
      </View>
    ));
  };

  const renderStatus = () => {
    const status = platformStatusQuery.data;
    if (!status && platformStatusQuery.isLoading) {
      return (
        <View style={styles.statusCard}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={{ color: theme.muted, marginTop: 16 }}>Vérification de la disponibilité de la plateforme...</Text>
        </View>
      );
    }

    const isOnline = status?.online;

    return (
      <View style={styles.statusCard}>
        <View style={[styles.statusIndicator, { backgroundColor: isOnline ? '#6BCB7720' : '#FF6B6B20' }]}>
          {isOnline ? <CheckCircle2 size={48} color="#6BCB77" /> : <XCircle size={48} color="#FF6B6B" />}
        </View>
        <Text style={[styles.statusTitle, { color: isOnline ? '#6BCB77' : '#FF6B6B' }]}>
          {isOnline ? "Opérationnel" : "Problème de service"}
        </Text>
        <Text style={styles.statusSub}>La plateforme SchoolApp est {isOnline ? 'accessible' : 'inaccessible'} depuis votre réseau.</Text>

        <View style={[styles.modMeta, { width: '100%', marginTop: 40 }]}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Temps de réponse</Text>
            <Text style={styles.metaVal}>{status?.latency || 0}ms</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Dernière vérification</Text>
            <Text style={styles.metaVal}>{status?.time || "--:--:--"}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={{ marginTop: 32, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 16, backgroundColor: theme.background }}
          onPress={() => platformStatusQuery.refetch()}
        >
          <Text style={[styles.chipText, { color: theme.text }]}>Vérifier à nouveau</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        {activeUtil && (
          <TouchableOpacity onPress={handleBack}>
            <ChevronLeft size={24} color={theme.text} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>
          {activeUtil === "filieres" ? "Filières" : activeUtil === "modules" ? "Plan d'Étude" : activeUtil === "status" ? "État du système" : "Utilitaires"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!activeUtil ? (
          <View>
            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setActiveUtil("modules"); }}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBg, { backgroundColor: '#4D96FF20' }]}><Library size={24} color="#4D96FF" /></View>
              <View style={styles.textContainer}>
                <Text style={styles.menuTitle}>Plan d'étude</Text>
                <Text style={styles.menuSub}>Seuils détaillés et informations sur le programme</Text>
              </View>
              <ChevronRight size={20} color={theme.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setActiveUtil("filieres"); }}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBg, { backgroundColor: '#6BCB7720' }]}><GraduationCap size={24} color="#6BCB77" /></View>
              <View style={styles.textContainer}>
                <Text style={styles.menuTitle}>Filières</Text>
                <Text style={styles.menuSub}>Parcourir toutes les filières d'ingénierie</Text>
              </View>
              <ChevronRight size={20} color={theme.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setActiveUtil("status"); }}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBg, { backgroundColor: '#FFD93D20' }]}><Activity size={24} color="#FFD93D" /></View>
              <View style={styles.textContainer}>
                <Text style={styles.menuTitle}>État de la plateforme</Text>
                <Text style={styles.menuSub}>Connectivité serveur en temps réel</Text>
              </View>
              <ChevronRight size={20} color={theme.muted} />
            </TouchableOpacity>
          </View>
        ) : (
          activeUtil === "modules" ? renderModuleLibrary() :
            activeUtil === "filieres" ? renderFilieres() :
              renderStatus()
        )}
      </ScrollView>
    </View>
  );
}