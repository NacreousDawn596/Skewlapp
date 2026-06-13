import React, { useState, useEffect, useCallback } from "react";
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
  Modal,
  BackHandler,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "@/themes/ThemeContext";
import { Stack } from "expo-router";
import { schoolAppClient } from "@/api/client";
import {
  ChevronLeft,
  Book,
  Award,
  Layers,
  History,
  Calendar,
  Layers2,
  X,
} from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { usePolling } from "@/contexts/PollingContext";
import { useQuery } from "@tanstack/react-query";
import { getCachedData, getCachedElementNames, setCachedElementNames } from "@/services/cache";
import { withReactQueryAuthHandler } from "@/services/apiErrorHandler";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get("window");

type Category = "currentElems" | "currentMods" | "allElems" | "allMods" | "semestres" | "annees";

interface MenuItem {
  id: Category;
  title: string;
  iconName: string;
  color: string;
}

const NoteElementItem = ({ item, name, theme, styles, category, onStatsPress }: any) => {
  const isPassing = (typeof item.noteVal === 'number' && item.noteVal >= 11) || item.gradeStr === "V";
  return (
    <View style={styles.dataCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dataTitle}>{name || item.code}</Text>
          <Text style={styles.dataMeta}>{item.code} {item.AU ? `• ${item.AU}` : ""}</Text>
        </View>
        <TouchableOpacity style={{ alignItems: 'flex-end' }} onPress={() => onStatsPress("element", item)}>
          <Text style={[styles.dataGrade, { color: isPassing ? "#6BCB77" : theme.accent, fontSize: category === "currentElems" ? 22 : 18 }]}>
            {item.gradeStr}
          </Text>
        </TouchableOpacity>
      </View>

      {category === "currentElems" && (
        <View style={styles.gradeGrid}>
          {[
            { label: "CC", val: item.CC, type: "cc" },
            { label: "EX", val: item.EX, type: "ex" },
            { label: "TP", val: item.TP, type: "tp" },
            { label: "SO", val: item.MoySO, type: null },
            { label: "RAT", val: item.RAT, type: null },
            { label: "MOY", val: item.Moy, bold: true, type: "moy" }
          ].map((g, i) => (
            <TouchableOpacity key={i} style={styles.gradeBox} onPress={() => g.type ? onStatsPress("element", item, g.type) : null}>
              <Text style={styles.gradeLabel}>{g.label}</Text>
              <Text style={[styles.gradeVal, g.bold && { color: isPassing ? "#6BCB77" : theme.accent, fontWeight: '800' }]}>
                {g.val ?? "--"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const NoteModuleItem = ({ item, name, theme, styles, onStatsPress }: any) => {
  const isPassing = (typeof item.noteVal === 'number' && item.noteVal >= 11) || item.gradeStr === "V";
  return (
    <TouchableOpacity style={styles.dataCard} onPress={() => onStatsPress("module", item)}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dataTitle}>{name || item.code}</Text>
          <Text style={styles.dataMeta}>{item.code} {item.AU ? `• ${item.AU}` : ""}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.dataGrade, { color: isPassing ? "#6BCB77" : theme.accent }]}>
            {item.gradeStr}
          </Text>
          {item.Dec && <Text style={styles.dataMeta}>{item.Dec}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const NoteSummaryItem = ({ item, theme, styles }: any) => {
  const isPassing = (typeof item.noteVal === 'number' && item.noteVal >= 11) || item.gradeStr === "V";
  return (
    <View style={[styles.dataCard, { borderLeftWidth: 4, borderLeftColor: isPassing ? "#6BCB77" : theme.accent }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.dataTitle}>{item.Semestre || item.Niveau}</Text>
        <Text style={styles.dataMeta}>{item.AU} • {item.Statut || "Résultat de la Session"}</Text>
        {item.Decision && <Text style={[styles.dataMeta, { fontWeight: '700', color: theme.text }]}>{item.Decision}</Text>}
        {item.Classement && <Text style={styles.dataMeta}>Rang: {item.Classement}</Text>}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.dataGrade, { color: isPassing ? "#6BCB77" : theme.accent, fontSize: 24 }]}>
          {item.gradeStr}
        </Text>
        {item.PJ && <Text style={styles.dataMeta}>PJ: {item.PJ}</Text>}
      </View>
    </View>
  );
};

const MENU_ITEMS: MenuItem[] = [
  { id: "currentElems", title: "Elements en cours", iconName: "Book", color: "#4D96FF" },
  { id: "currentMods", title: "Modules en cours", iconName: "Layers", color: "#6BCB77" },
  { id: "allElems", title: "Elements", iconName: "History", color: "#FFD93D" },
  { id: "allMods", title: "Modules", iconName: "Layers2", color: "#FF6B6B" },
  { id: "semestres", title: "Semestres", iconName: "Calendar", color: "#F97316" },
  { id: "annees", title: "Années", iconName: "Award", color: "#92A9BD" },
];

export default function NotesScreen() {
  const { theme } = useTheme();
  const { profile, handleUnauthorized } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [statsType, setStatsType] = useState<"cc" | "ex" | "tp" | "moy">("moy");
  const [itemType, setItemType] = useState<"element" | "module" | "semester" | "year">("element");
  const { lastPollTime, isPolling, poll } = usePolling();
  const [hasPolledCategory, setHasPolledCategory] = useState<Set<Category>>(new Set());

  useEffect(() => {
    if (!selectedCategory || hasPolledCategory.has(selectedCategory)) {
      return;
    }
    
    const checkAndPoll = async () => {
      const cached = await getCachedData(selectedCategory);
      if (!cached) {
        console.log(`[Notes] No cache for ${selectedCategory}, triggering poll...`);
        await poll(false);
        setHasPolledCategory(prev => new Set([...prev, selectedCategory]));
      }
    };
    
    void checkAndPoll();
  }, [selectedCategory, poll, hasPolledCategory]);

  const dataQuery = useQuery({
    queryKey: ["notes_data", selectedCategory],
    queryFn: withReactQueryAuthHandler(
      () => (selectedCategory ? getCachedData(selectedCategory) : null),
      handleUnauthorized
    ),
    enabled: !!selectedCategory,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const handleCategoryPress = (category: Category) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedCategory(category);
  };

  const handleBack = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedCategory(null);
  };

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (statsModalVisible) {
          setStatsModalVisible(false);
          return true;
        }

        if (selectedCategory) {
          handleBack();
          return true;
        }

        return false;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => subscription.remove();
    }, [selectedCategory, statsModalVisible])
  );

  const getNiveauFromSemestre = (S: string): string => {
    const sNum = parseInt(S.replace("S", ""), 10);
    if (sNum <= 2) return "1A";
    if (sNum <= 4) return "2A";
    if (sNum <= 6) return "3A";
    if (sNum <= 8) return "4A";
    return "5A";
  };

  const getSemesterFromCode = (code: string, isElem: boolean): string => {
    if (!code) return "S1";
    const reversed = code.split("").reverse();
    const digit = isElem ? reversed[2] : reversed[1];
    if (code.endsWith("10")) return "S10";
    return `S${digit}`;
  };

  const getVal = (item: any) => {
    const v = item.note ?? item.Moy ?? item.Note ?? item.Moyenne ?? item["Moy SEM"] ?? item["Moy Année"] ?? item["Moy Annee"];
    if (v === null || v === undefined || v === "" || v === "--") return null;
    return typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v;
  };

  const getDisplayName = (item: any, mappedName?: string) => {
    const candidates = [
      mappedName,
      item?.Intitule,
      item?.intitule,
      item?.Intitulé,
      item?.name,
      item?.Name,
      item?.Libelle,
      item?.Libellé,
      item?.Module,
      item?.Element,
      item?.Semestre,
      item?.Niveau,
      item?.code,
    ];

    const found = candidates.find(
      (value) => typeof value === "string" && value.trim().length > 0
    );

    return found || "Unknown";
  };

  const getTargets = (): string[] => {
    const data = dataQuery.data as any[];
    if (!data || !Array.isArray(data) || !profile?.administrative_info) return [];
    const targets = new Set<string>();
    data.forEach(item => {
      const code = item.CodeElem || item.CodeMod;
      if (code) {
        const S = getSemesterFromCode(code, !!item.CodeElem);
        const N = getNiveauFromSemestre(S);
        const admin = profile.administrative_info;
        const F = admin.Filière || admin.Filiere;
        if (N && F && S) targets.add(`${N}|${F}|${S}`);
      }
    });
    return Array.from(targets).sort();
  };

  const targets = getTargets();
  const targetsKey = targets.join("|");

  const { data: moduleMappings } = useQuery({
    queryKey: ["global_name_mappings", targetsKey],
    queryFn: withReactQueryAuthHandler(
      async () => {
        const cachedNames = await getCachedElementNames();
        const mapping: Record<string, string> = { ...cachedNames };

        if (targets.length === 0) {
          return mapping;
        }

        await Promise.all(targets.map(async (target) => {
          const [N, F, S] = target.split("|");
          try {
            const modulesObj = await schoolAppClient.getModules(N, F, S);
            if (modulesObj && typeof modulesObj === 'object') {
              Object.entries(modulesObj).forEach(([modCode, modData]: [string, any]) => {
                const moduleName = modData.intitule || modData.Intitule || modData.name || modData.Name;
                if (moduleName) {
                  mapping[modCode] = moduleName;
                }
                if (Array.isArray(modData.elements)) {
                  modData.elements.forEach((elem: any) => {
                    const elementName = elem.intitule || elem.Intitule || elem.name || elem.Name;
                    if (elem.code && elementName) mapping[elem.code] = elementName;
                  });
                }
              });
            }
          } catch (e) { }
        }));

        if (Object.keys(mapping).length > 0) {
          await setCachedElementNames(mapping);
        }

        return mapping;
      },
      handleUnauthorized
    ),
    enabled: targets.length > 0,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: theme.surface },
    headerTitle: { fontSize: 20, fontWeight: "700", color: theme.text, marginLeft: selectedCategory ? 12 : 0 },
    scrollContent: { padding: 16 },
    menuGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    menuCard: { backgroundColor: theme.surface, width: (width - 48) / 2, padding: 20, borderRadius: 24, marginBottom: 16, alignItems: "center", elevation: 2 },
    iconBg: { width: 50, height: 50, borderRadius: 15, alignItems: "center", justifyContent: "center", marginBottom: 12 },
    menuTitle: { fontSize: 15, fontWeight: "600", color: theme.text, textAlign: "center" },
    dataCard: { backgroundColor: theme.surface, borderRadius: 20, padding: 16, marginBottom: 12, elevation: 2 },
    dataTitle: { fontSize: 16, fontWeight: "700", color: theme.text, marginBottom: 2 },
    dataGrade: { fontSize: 18, fontWeight: "800", color: theme.accent },
    dataMeta: { fontSize: 12, color: theme.muted, marginTop: 2 },
    emptyContainer: { padding: 40, alignItems: "center" },
    emptyText: { color: theme.muted, textAlign: "center", fontSize: 16 },
    gradeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.background, justifyContent: 'space-between' },
    gradeBox: { width: '30%', marginBottom: 8, alignItems: 'center' },
    gradeLabel: { fontSize: 10, fontWeight: '700', color: theme.muted, textTransform: 'uppercase', marginBottom: 2 },
    gradeVal: { fontSize: 14, fontWeight: '600', color: theme.text },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
    statsModal: { backgroundColor: theme.surface, borderRadius: 24, padding: 24, width: "85%", maxHeight: "80%", elevation: 10 },
    statsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    statsTitle: { fontSize: 18, fontWeight: "800", color: theme.text, flex: 1 },
    statsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.background },
    statsLabel: { fontSize: 13, fontWeight: "600", color: theme.muted, flex: 1 },
    statsValue: { fontSize: 14, fontWeight: "700", color: theme.accent, textAlign: "right" },
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["element_stats", selectedItem?.CodeElem || selectedItem?.CodeMod, statsType, itemType],
    queryFn: withReactQueryAuthHandler(
      async () => {
        if (!selectedItem) return null;
        
        try {
          const code = selectedItem.CodeElem || selectedItem.CodeMod;
          console.log("🔍 Stats Query - code:", code, "type:", statsType, "itemType:", itemType);
          
          if (!code) return null;

          let stats = null;

          if (itemType === "element") {
            console.log("🔍 Fetching current element notes...");
            const elems = await schoolAppClient.getCurrentElemNote();
            console.log("🔍 Got", elems?.length || 0, "current element notes");
            
            const elem = Array.isArray(elems) ? elems.find((e: any) => e.CodeElem === code) : null;
            console.log("🔍 Element found?", !!elem);
            
            if (elem) {
              console.log("🔍 Element type:", elem.constructor.name);
              console.log("🔍 Element methods:", {
                ccStats: typeof elem.ccStats,
                exStats: typeof elem.exStats,
                tpStats: typeof elem.tpStats,
                moyStats: typeof elem.moyStats
              });

              if (statsType === "cc" && typeof elem.ccStats === "function") {
                console.log("🔍 Calling ccStats()");
                stats = await elem.ccStats();
              } else if (statsType === "ex" && typeof elem.exStats === "function") {
                console.log("🔍 Calling exStats()");
                stats = await elem.exStats();
              } else if (statsType === "tp" && typeof elem.tpStats === "function") {
                console.log("🔍 Calling tpStats()");
                stats = await elem.tpStats();
              } else if (statsType === "moy" && typeof elem.moyStats === "function") {
                console.log("🔍 Calling moyStats()");
                stats = await elem.moyStats();
              }
            }
          } else if (itemType === "module") {
            console.log("🔍 Fetching current module notes...");
            const mods = await schoolAppClient.getCurrentModNote();
            console.log("🔍 Got", mods?.length || 0, "current module notes");
            
            const mod = Array.isArray(mods) ? mods.find((m: any) => m.CodeMod === code) : null;
            console.log("🔍 Module found?", !!mod, "has stats?", mod?.stats ? "yes" : "no");
            
            if (mod && typeof mod.stats === "function") {
              console.log("🔍 Calling module stats()");
              stats = await mod.stats();
            }
          }

          console.log("🔍 Final stats:", stats);
          return stats || null;
        } catch (e) {
          console.error("❌ Failed to fetch stats:", e);
          return null;
        }
      },
      handleUnauthorized
    ),
    enabled: statsModalVisible && !!selectedItem,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const handleStatsPress = (type: "element" | "module" | "semester" | "year", item: any, subType?: "cc" | "ex" | "tp" | "moy") => {
    setSelectedItem(item);
    setItemType(type);
    setStatsType(subType || "moy");
    setStatsModalVisible(true);
  };

  const renderContent = () => {
    const data = (dataQuery.data as any[]) || [];

    if (dataQuery.isLoading && data.length === 0) {
      return <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />;
    }

    if (data.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucun relevé trouvé pour cette catégorie.</Text>
        </View>
      );
    }

    const mappings = (moduleMappings && typeof moduleMappings === 'object') ? moduleMappings : {};

    return data.map((item, index) => {
      const codeKey = item.CodeElem || item.CodeMod || item.Semestre || item.Niveau || "Unknown";
      const noteVal = getVal(item);
      const gradeStr = item.note || item.Moy || item.Moy_Annee || item.Moy_SEM || "--";
      const displayName = getDisplayName(item, mappings[codeKey]);
      const props = { key: index, item: { ...item, noteVal, gradeStr, code: codeKey }, name: displayName, theme, styles, category: selectedCategory, onStatsPress: handleStatsPress };
      if (selectedCategory === "currentElems" || selectedCategory === "allElems") return <NoteElementItem {...props} />;
      if (selectedCategory === "currentMods" || selectedCategory === "allMods") return <NoteModuleItem {...props} />;
      return <NoteSummaryItem {...props} />;
    });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        {selectedCategory && (
          <TouchableOpacity onPress={handleBack}>
            <ChevronLeft size={24} color={theme.text} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>
          {selectedCategory ? MENU_ITEMS.find(i => i.id === selectedCategory)?.title : "Relevés de Notes"}
        </Text>
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
              <Text style={{ marginLeft: 10, color: theme.muted, fontSize: 13, fontWeight: '600' }}>Synchronisation initiale en cours...</Text>
            </View>
          </View>
        )}

        {!selectedCategory ? (
          <View style={styles.menuGrid}>
            {MENU_ITEMS.map((item) => (
              <TouchableOpacity key={item.id} style={styles.menuCard} onPress={() => handleCategoryPress(item.id)} activeOpacity={0.7}>
                <View style={[styles.iconBg, { backgroundColor: item.color + "15" }]}>
                  {(() => {
                    const iconProps = { size: 22, color: item.color };
                    if (item.iconName === "Book") return <Book {...iconProps} />;
                    if (item.iconName === "Layers") return <Layers {...iconProps} />;
                    if (item.iconName === "History") return <History {...iconProps} />;
                    if (item.iconName === "Layers2") return <Layers2 {...iconProps} />;
                    if (item.iconName === "Calendar") return <Calendar {...iconProps} />;
                    return <Award {...iconProps} />;
                  })()}
                </View>
                <Text style={styles.menuTitle}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : renderContent()}
      </ScrollView>

      <Modal visible={statsModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.statsModal}>
            <ScrollView>
              <View style={styles.statsHeader}>
                <Text style={styles.statsTitle}>{getDisplayName(selectedItem, moduleMappings?.[selectedItem?.code])} ({selectedItem?.code})</Text>
                <TouchableOpacity onPress={() => setStatsModalVisible(false)}>
                  <X size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              {statsLoading ? (
                <ActivityIndicator color={theme.accent} style={{ marginVertical: 20 }} />
              ) : statsData ? (
                <View>
                  {Object.entries(statsData).map(([key, value]: [string, any], index) => {
                    const keyLower = key.toLowerCase();
                    const isImportantMetric = keyLower === "votre_note" || keyLower === "moyenne_promo" || keyLower === "min" || keyLower === "max";
                    const numValue = typeof value === 'number' ? value : null;
                    let valueColor = theme.accent;
                    
                    if (isImportantMetric && numValue !== null) {
                      valueColor = numValue < 11 ? "#FF6B6B" : "#6BCB77";
                    }
                    
                    return (
                      <View key={index} style={styles.statsRow}>
                        <Text style={styles.statsLabel}>{key}</Text>
                        <Text style={[styles.statsValue, { color: valueColor }]}>
                          {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(2)) : value || "N/A"}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={[styles.dataMeta, { marginVertical: 20, textAlign: "center" }]}>Aucune statistique disponible</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
