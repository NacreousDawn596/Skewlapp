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
  ChevronLeft,
  Book,
  Award,
  Layers,
  History,
  Calendar,
  Layers2
} from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { usePolling } from "@/contexts/PollingContext";
import { useQuery } from "@tanstack/react-query";
import { getCachedData } from "@/services/cache";

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

const NoteElementItem = ({ item, name, theme, styles, category }: any) => {
  const isPassing = (typeof item.noteVal === 'number' && item.noteVal >= 11) || item.gradeStr === "V";
  return (
    <View style={styles.dataCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dataTitle}>{name || item.code}</Text>
          <Text style={styles.dataMeta}>{item.code} {item.AU ? `• ${item.AU}` : ""}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.dataGrade, { color: isPassing ? "#6BCB77" : theme.accent, fontSize: category === "currentElems" ? 22 : 18 }]}>
            {item.gradeStr}
          </Text>
        </View>
      </View>

      {category === "currentElems" && (
        <View style={styles.gradeGrid}>
          {[
            { label: "CC", val: item.CC },
            { label: "EX", val: item.EX },
            { label: "TP", val: item.TP },
            { label: "SO", val: item.MoySO },
            { label: "RAT", val: item.RAT },
            { label: "MOY", val: item.Moy, bold: true }
          ].map((g, i) => (
            <View key={i} style={styles.gradeBox}>
              <Text style={styles.gradeLabel}>{g.label}</Text>
              <Text style={[styles.gradeVal, g.bold && { color: isPassing ? "#6BCB77" : theme.accent, fontWeight: '800' }]}>
                {g.val ?? "--"}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const NoteModuleItem = ({ item, name, theme, styles }: any) => {
  const isPassing = (typeof item.noteVal === 'number' && item.noteVal >= 11) || item.gradeStr === "V";
  return (
    <View style={styles.dataCard}>
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
    </View>
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
  const { profile } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const { lastPollTime, isPolling, poll } = usePolling();

  const dataQuery = useQuery({
    queryKey: ["notes_data", selectedCategory, lastPollTime],
    queryFn: () => (selectedCategory ? getCachedData(selectedCategory) : null),
    enabled: !!selectedCategory,
  });

  const handleCategoryPress = (category: Category) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedCategory(category);
  };

  const handleBack = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedCategory(null);
  };

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

  // Extract targets from data to use as stable cache key
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

  const { data: moduleMappings } = useQuery({
    queryKey: ["global_name_mappings", targets],
    queryFn: async () => {
      if (targets.length === 0) return {};
      const mapping: Record<string, string> = {};
      await Promise.all(targets.map(async (target) => {
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
    enabled: targets.length > 0,
    staleTime: Infinity,
    gcTime: Infinity,
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
    gradeVal: { fontSize: 14, fontWeight: '600', color: theme.text }
  });

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
      const props = { key: index, item: { ...item, noteVal, gradeStr, code: codeKey }, name: mappings[codeKey], theme, styles, category: selectedCategory };
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
    </View>
  );
}
