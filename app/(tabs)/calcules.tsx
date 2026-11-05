import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
  ActivityIndicator,
  KeyboardAvoidingView,
  Animated,
  RefreshControl,
  Alert,
} from "react-native";
import { useTheme, useFontScale } from "@/themes/ThemeContext";
import { isDarkPalette } from "@/themes/palettes";
import { useAuth } from "@/contexts/AuthContext";
import { Stack } from "expo-router";
import { schoolAppClient, secureStorage } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import {
  buildCalculatorElementNames,
  getCalculatorCacheState,
  getCalculatorSelectionCache,
  getCachedData,
  getCachedModules,
  setCachedModules,
  updateCalculatorSelectionCache,
} from "@/services/cache";
import {
  computeSimulatorResult,
  requiredExamScore,
  getPassingThreshold,
  GoalSeekResult,
  BaselineResult,
  ModuleLookup,
} from "@/services/grades";
import { hapticImpact, hapticSelection } from "@/services/haptics";
import { usePolling } from "@/contexts/PollingContext";
import { useNetInfo } from "@react-native-community/netinfo";
import { withReactQueryAuthHandler, isUnauthorizedError } from "@/services/apiErrorHandler";
import {
  ChevronDown,
  ChevronUp,
  Calculator,
  Layers,
  RotateCcw,
  Target,
} from "lucide-react-native";
import { BlurView } from "expo-blur";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ElementRow = ({ elem, theme, styles, updateMark, getStatusColor }: any) => {
  return (
    <View style={styles.elemCard}>
      <Text style={styles.elemName}>{elem.intitule}</Text>
      <Text style={styles.elemMeta}>{elem.code} • Coef: {elem.coef_elem}</Text>

      <View style={styles.inputRow}>
        {parseFloat(elem.coef_cc) > 0 && (
          <View style={styles.inputBox}>
            <Text style={styles.inputLabel}>CC ({elem.coef_cc})</Text>
            <TextInput
              style={styles.input}
              value={String(elem.cc)}
              onChangeText={(v) => updateMark(elem.code, 'CC', v)}
              keyboardType="numeric"
              placeholder="--"
              placeholderTextColor={theme.muted}
            />
          </View>
        )}
        {parseFloat(elem.coef_tp) > 0 && (
          <View style={styles.inputBox}>
            <Text style={styles.inputLabel}>TP ({elem.coef_tp})</Text>
            <TextInput
              style={styles.input}
              value={String(elem.tp)}
              onChangeText={(v) => updateMark(elem.code, 'TP', v)}
              keyboardType="numeric"
              placeholder="--"
              placeholderTextColor={theme.muted}
            />
          </View>
        )}
        {parseFloat(elem.coef_ex) > 0 && (
          <View style={styles.inputBox}>
            <Text style={styles.inputLabel}>EX ({elem.coef_ex})</Text>
            <TextInput
              style={styles.input}
              value={String(elem.ex)}
              onChangeText={(v) => updateMark(elem.code, 'EX', v)}
              keyboardType="numeric"
              placeholder="--"
              placeholderTextColor={theme.muted}
            />
          </View>
        )}

        <View style={styles.elemAvgBox}>
          <Text style={styles.inputLabel}>MOY</Text>
          <Text style={[styles.elemAvgText, { color: getStatusColor(elem.average) }]}>{elem.average.toFixed(1)}</Text>
        </View>
      </View>
    </View>
  );
};

export default function CalculesScreen() {
  const { theme } = useTheme();
  const scale = useFontScale();
  const scaled = useCallback((n: number) => n * scale, [scale]);
  const styles = useMemo(() => createStyles(theme, scaled), [theme, scaled]);
  const { profile, handleUnauthorized } = useAuth();
  const { lastPollTime, isPolling, poll } = usePolling();
  const netInfo = useNetInfo();

  useEffect(() => {
    if (!lastPollTime) return;
    void modulesLookupQuery.refetch();
    void currentElemsQuery.refetch();
    void historyElemsQuery.refetch();
  }, [lastPollTime]);

  const [selNiveau, setSelNiveau] = useState("1A");
  const [selFiliere, setSelFiliere] = useState("");
  const [selSemestre, setSelSemestre] = useState("S1");
  const [userMarks, setUserMarks] = useState<Record<string, { CC?: string, TP?: string, EX?: string }>>({});
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const marksLoadedRef = useRef(false);

  // Goal-seek state
  const [targetInput, setTargetInput] = useState("");
  const [goalResult, setGoalResult] = useState<GoalSeekResult | null>(null);

  const calculatorSelection = useMemo(
    () => ({
      niveau: selNiveau,
      filiere: selFiliere,
      semestre: selSemestre,
    }),
    [selNiveau, selFiliere, selSemestre]
  );

  const filieresQuery = useQuery({
    queryKey: ["all_filieres"],
    queryFn: withReactQueryAuthHandler(
      async () => {
        const cached = await getCachedData("filieres");
        if (cached) {
          await updateCalculatorSelectionCache(calculatorSelection, {
            filieres: cached,
          });
          return cached;
        }

        const calculatorCache = await getCalculatorCacheState();
        if (calculatorCache?.filieres) {
          return calculatorCache.filieres;
        }

        if (netInfo.isInternetReachable !== false) {
          await poll(false);
          const refreshed = await getCachedData("filieres");
          if (refreshed) {
            await updateCalculatorSelectionCache(calculatorSelection, {
              filieres: refreshed,
            });
            return refreshed;
          }
        }

        return null;
      },
      handleUnauthorized
    ),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const modulesLookupQuery = useQuery({
    queryKey: ["lookup_modules_calc", selNiveau, selFiliere, selSemestre],
    queryFn: withReactQueryAuthHandler(
      async () => {
        const cacheKey = `${selNiveau}_${selFiliere}_${selSemestre}`;
        console.log(`[Calcules] Loading modules for ${cacheKey}`);

        try {
          const freshData = await schoolAppClient.getModules(selNiveau, selFiliere, selSemestre);
          const hasContent = freshData && ((Array.isArray(freshData) && freshData.length > 0) || (typeof freshData === 'object' && Object.keys(freshData).length > 0));

          if (hasContent) {
            if (!(netInfo.isInternetReachable === false)) {
              await setCachedModules(selNiveau, selFiliere, selSemestre, freshData);
              await updateCalculatorSelectionCache(calculatorSelection, {
                modulesLookup: freshData,
                elementNames: buildCalculatorElementNames(freshData),
              });
            }
            return freshData;
          }
        } catch (e: any) {
          if (isUnauthorizedError(e)) {
            throw e;
          }
        }

        const cachedData = await getCachedModules(selNiveau, selFiliere, selSemestre);
        const hasCachedContent = cachedData && ((Array.isArray(cachedData) && cachedData.length > 0) || (typeof cachedData === 'object' && Object.keys(cachedData).length > 0));

        if (hasCachedContent) {
          await updateCalculatorSelectionCache(calculatorSelection, {
            modulesLookup: cachedData,
            elementNames: buildCalculatorElementNames(cachedData),
          });
          return cachedData;
        }

        const calculatorCache = await getCalculatorSelectionCache(
          selNiveau,
          selFiliere,
          selSemestre
        );

        if (calculatorCache?.modulesLookup) {
          return calculatorCache.modulesLookup;
        }

        const calculatorState = await getCalculatorCacheState();

        if (calculatorState?.modulesLookup) {
          await updateCalculatorSelectionCache(calculatorSelection, {
            modulesLookup: calculatorState.modulesLookup,
            elementNames:
              calculatorState.elementNames ||
              buildCalculatorElementNames(calculatorState.modulesLookup),
          });
          return calculatorState.modulesLookup;
        }

        return null;
      },
      handleUnauthorized
    ),
    enabled: !!selFiliere,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const currentElemsQuery = useQuery({
    queryKey: ["current_elems_calc"],
    queryFn: withReactQueryAuthHandler(
      async () => {
        const cached = await getCachedData("currentElems");
        if (cached) {
          await updateCalculatorSelectionCache(calculatorSelection, {
            currentElems: cached,
          });
          return cached;
        }

        const calculatorCache = await getCalculatorSelectionCache(
          selNiveau,
          selFiliere,
          selSemestre
        );

        if (calculatorCache?.currentElems) {
          return calculatorCache.currentElems;
        }

        const calculatorState = await getCalculatorCacheState();

        if (calculatorState?.currentElems) {
          await updateCalculatorSelectionCache(calculatorSelection, {
            currentElems: calculatorState.currentElems,
          });
          return calculatorState.currentElems;
        }

        if (netInfo.isInternetReachable !== false) {
          await poll(false);
        }
        const refreshed = await getCachedData("currentElems");
        if (refreshed) {
          await updateCalculatorSelectionCache(calculatorSelection, {
            currentElems: refreshed,
          });
        }
        return refreshed || null;
      },
      handleUnauthorized
    ),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const historyElemsQuery = useQuery({
    queryKey: ["history_elems_calc"],
    queryFn: withReactQueryAuthHandler(
      async () => {
        const cached = await getCachedData("allElems");
        if (cached) {
          await updateCalculatorSelectionCache(calculatorSelection, {
            historyElems: cached,
          });
          return cached;
        }

        const calculatorCache = await getCalculatorSelectionCache(
          selNiveau,
          selFiliere,
          selSemestre
        );

        if (calculatorCache?.historyElems) {
          return calculatorCache.historyElems;
        }

        const calculatorState = await getCalculatorCacheState();

        if (calculatorState?.historyElems) {
          await updateCalculatorSelectionCache(calculatorSelection, {
            historyElems: calculatorState.historyElems,
          });
          return calculatorState.historyElems;
        }

        if (netInfo.isInternetReachable !== false) {
          await poll(false);
        }
        const refreshed = await getCachedData("allElems");
        if (refreshed) {
          await updateCalculatorSelectionCache(calculatorSelection, {
            historyElems: refreshed,
          });
        }
        return refreshed || null;
      },
      handleUnauthorized
    ),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (profile?.administrative_info) {
      const admin = profile.administrative_info;
      setSelNiveau(admin.Niveau || "1A");
      const userF = admin.Filière || admin.Filiere;
      if (filieresQuery.data) {
        const match = (filieresQuery.data as any[]).find(f => f.Code === userF || f.Intitule === userF);
        setSelFiliere(match?.Code || (filieresQuery.data as any[])[0]?.Code || "");
      } else if (userF) {
        setSelFiliere(userF);
      }
    }
  }, [profile, filieresQuery.data]);

  useEffect(() => {
    marksLoadedRef.current = false;

    const loadState = async () => {
      const key = `calc_storage_${selNiveau}_${selFiliere}_${selSemestre}`;
      const saved = await secureStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setUserMarks(parsed);
          marksLoadedRef.current = true;
          await updateCalculatorSelectionCache(calculatorSelection, {
            userMarks: parsed,
          });
          return;
        } catch (e) {
          console.log("[Calcules] Failed to parse persisted marks, falling back to snapshot", e);
        }
      }

      const calculatorCache = await getCalculatorSelectionCache(
        selNiveau,
        selFiliere,
        selSemestre
      );

      if (calculatorCache?.userMarks) {
        setUserMarks(calculatorCache.userMarks);
        await secureStorage.setItem(key, JSON.stringify(calculatorCache.userMarks));
      } else {
        setUserMarks({});
      }

      marksLoadedRef.current = true;
    };
    if (selFiliere) loadState();
  }, [calculatorSelection, selNiveau, selFiliere, selSemestre]);

  useEffect(() => {
    if (!marksLoadedRef.current || !selFiliere) return;

    const saveState = async () => {
      const key = `calc_storage_${selNiveau}_${selFiliere}_${selSemestre}`;
      await secureStorage.setItem(key, JSON.stringify(userMarks));
      await updateCalculatorSelectionCache(calculatorSelection, {
        userMarks,
      });
    };
    void saveState();
  }, [userMarks, calculatorSelection, selNiveau, selFiliere, selSemestre]);

  const toggleModule = (code: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedModules(prev => ({ ...prev, [code]: !prev[code] }));
    hapticSelection();
  };

  const updateMark = (elemCode: string, type: 'CC' | 'TP' | 'EX', val: string) => {
    const num = parseFloat(val.replace(',', '.'));
    if (val !== "" && (isNaN(num) || num < 0 || num > 20)) return;
    setUserMarks(prev => ({ ...prev, [elemCode]: { ...prev[elemCode], [type]: val } }));
  };

  // Reset the current selection's marks back to the portal baseline.
  const resetMarks = () => {
    Alert.alert(
      "Réinitialiser le simulateur",
      "Vos notes personnalisées seront effacées et remplacées par les notes du portail.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Réinitialiser",
          style: "destructive",
          onPress: () => {
            setUserMarks({});
            setGoalResult(null);
            hapticImpact();
          },
        },
      ]
    );
  };

  const resultsMap = useMemo(() => {
    const map = new Map<string, BaselineResult>();
    const historyResults = (historyElemsQuery.data as any[]) || [];
    const currentResults = (currentElemsQuery.data as any[]) || [];
    for (const r of historyResults) {
      if (r?.CodeElem) map.set(r.CodeElem, r);
    }
    for (const r of currentResults) {
      if (r?.CodeElem) map.set(r.CodeElem, r);
    }
    return map;
  }, [historyElemsQuery.data, currentElemsQuery.data]);

  const modulesLookup = (modulesLookupQuery.data as ModuleLookup) || {};

  const calculatedData = useMemo(() => {
    return computeSimulatorResult(modulesLookup, resultsMap, userMarks);
  }, [modulesLookup, resultsMap, userMarks]);

  const getStatusColor = (val: number) => {
    const threshold = getPassingThreshold(selNiveau);
    if (val >= threshold) return "#6BCB77";
    if (val >= 10) return "#FFD93D";
    return "#FF6B6B";
  };

  const gpaAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(gpaAnim, { toValue: 1.2, duration: 150, useNativeDriver: true }),
      Animated.timing(gpaAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [calculatedData.globalAvg, gpaAnim]);

  const runGoalSeek = () => {
    const target = parseFloat(targetInput.replace(',', '.'));
    if (!Number.isFinite(target) || target < 0 || target > 20) {
      setGoalResult(null);
      Alert.alert("Objectif invalide", "Veuillez entrer une moyenne entre 0 et 20.");
      return;
    }
    const result = requiredExamScore(target, modulesLookup, resultsMap, userMarks);
    setGoalResult(result);
    hapticImpact();
  };

  const goalSeekMessage = goalResult
    ? (() => {
        switch (goalResult.status) {
          case "already-achieved":
            return `Objectif déjà atteint (moyenne actuelle: ${goalResult.current.toFixed(2)}/20).`;
          case "required":
            return `Il vous faut au minimum ${goalResult.required.toFixed(2)}/20 à l'examen.`;
          case "impossible":
            return `Objectif impossible, même avec 20/20 (meilleur résultat: ${goalResult.best.toFixed(2)}/20).`;
          case "no-missing-exams":
            return "Toutes les notes d'examen sont déjà publiées. Rien à simuler.";
          default:
            return null;
        }
      })()
    : null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isPolling}
            onRefresh={() => poll(false)}
            tintColor={theme.accent}
          />
        }
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <Calculator size={24} color={theme.accent} />
          <Text style={{ fontSize: 24, fontWeight: '800', color: theme.text, marginLeft: 10 }}>Simulateur</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.resetButton} onPress={resetMarks} activeOpacity={0.7}>
            <RotateCcw size={scaled(16)} color={theme.accent} />
            <Text style={styles.resetButtonText}>Réinitialiser</Text>
          </TouchableOpacity>
        </View>

        {!lastPollTime && isPolling && (
          <View style={{ marginBottom: 16 }}>
            <View style={{ backgroundColor: theme.surface, padding: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={{ marginLeft: 10, color: theme.muted, fontSize: 13, fontWeight: '600' }}>Récupération des règles académiques...</Text>
            </View>
          </View>
        )}

        <View style={styles.selectorCard}>
          <Text style={styles.selLabel}>Période Académique</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {["1A", "2A", "3A", "4A", "5A"].map(n => (
              <TouchableOpacity
                key={n}
                onPress={() => { setSelNiveau(n); hapticSelection(); }}
                style={[styles.chip, selNiveau === n && styles.chipActive]}
              >
                <Text style={[styles.chipText, selNiveau === n && styles.chipActiveText]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.chipRow}>
            {["S1", "S2"].map(s => (
              <TouchableOpacity
                key={s}
                onPress={() => { setSelSemestre(s); hapticSelection(); }}
                style={[styles.chip, selSemestre === s && styles.chipActive, { flex: 1 }]}
              >
                <Text style={[styles.chipText, selSemestre === s && styles.chipActiveText, { textAlign: 'center' }]}>{s === "S1" ? "Semestre 1" : "Semestre 2"}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.selLabel}>Filière</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(filieresQuery.data as any[])?.map(f => (
              <TouchableOpacity
                key={f.Code}
                onPress={() => { setSelFiliere(f.Code); hapticSelection(); }}
                style={[styles.chip, selFiliere === f.Code && styles.chipActive]}
              >
                <Text style={[styles.chipText, selFiliere === f.Code && styles.chipActiveText]}>{f.Code}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.goalCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Target size={scaled(18)} color={theme.accent} />
            <Text style={styles.goalTitle}>Objectif de moyenne</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              style={styles.goalInput}
              value={targetInput}
              onChangeText={setTargetInput}
              keyboardType="numeric"
              placeholder="ex: 14"
              placeholderTextColor={theme.muted}
            />
            <TouchableOpacity style={styles.goalButton} onPress={runGoalSeek} activeOpacity={0.7}>
              <Text style={styles.goalButtonText}>Calculer</Text>
            </TouchableOpacity>
          </View>
          {goalSeekMessage && (
            <Text style={styles.goalResultText}>{goalSeekMessage}</Text>
          )}
        </View>

        {modulesLookupQuery.isLoading ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
        ) : calculatedData.modules.length > 0 ? (
          calculatedData.modules.map(mod => (
            <View key={mod.code} style={styles.modCard}>
              <TouchableOpacity style={styles.modHeader} onPress={() => toggleModule(mod.code)} activeOpacity={0.7}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modTitle} numberOfLines={1}>{mod.intitule}</Text>
                  <Text style={{ fontSize: 11, color: theme.muted }}>{mod.code} • Coef: {mod.coef}</Text>
                </View>
                <View style={[styles.modAvgBadge, { backgroundColor: getStatusColor(mod.average) + '20' }]}>
                  <Text style={[styles.modAvgText, { color: getStatusColor(mod.average) }]}>{mod.average.toFixed(2)}</Text>
                </View>
                {expandedModules[mod.code] ? <ChevronUp size={20} color={theme.muted} style={{ marginLeft: 10 }} /> : <ChevronDown size={20} color={theme.muted} style={{ marginLeft: 10 }} />}
              </TouchableOpacity>
              {expandedModules[mod.code] && mod.elements?.map((elem: any) => (
                <ElementRow key={elem.code} elem={elem} theme={theme} styles={styles} updateMark={updateMark} getStatusColor={getStatusColor} />
              ))}
            </View>
          ))
        ) : (
          <View style={styles.empty}>
            <Layers size={48} color={theme.muted} style={{ opacity: 0.3 }} />
            <Text style={styles.emptyText}>Aucune donnée trouvée pour cette sélection.</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <BlurView intensity={80} tint={isDarkPalette(theme) ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={styles.footerContent}>
          <View>
            <Text style={styles.footerLabel}>Moyenne Générale</Text>
            <Text style={{ fontSize: 11, color: theme.muted }}>Résultat estimé du simulateur</Text>
          </View>
          <Animated.Text style={[styles.footerValue, { color: getStatusColor(calculatedData.globalAvg), transform: [{ scale: gpaAnim }] }]}>
            {calculatedData.globalAvg.toFixed(3)}
          </Animated.Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: any, scaled: (n: number) => number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scrollContent: { padding: 16, paddingBottom: 120 },
    resetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: theme.accent + '15',
    },
    resetButtonText: {
      fontSize: scaled(13),
      fontWeight: '700',
      color: theme.accent,
      marginLeft: 6,
    },
    selectorCard: { backgroundColor: theme.surface, borderRadius: 24, padding: 16, marginBottom: 16, elevation: 2 },
    selLabel: { fontSize: 11, fontWeight: '800', color: theme.muted, marginBottom: 8, textTransform: 'uppercase' },
    chipRow: { flexDirection: 'row', marginBottom: 12 },
    chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: theme.background, marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
    chipActive: { backgroundColor: theme.accent + '20', borderColor: theme.accent },
    chipText: { fontSize: 12, fontWeight: '700', color: theme.muted },
    chipActiveText: { color: theme.accent },
    goalCard: { backgroundColor: theme.surface, borderRadius: 24, padding: 16, marginBottom: 16, elevation: 2 },
    goalTitle: { fontSize: scaled(15), fontWeight: '800', color: theme.text, marginLeft: 8 },
    goalInput: {
      flex: 1,
      backgroundColor: theme.background,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      fontSize: scaled(16),
      fontWeight: '700',
      color: theme.text,
      marginRight: 10,
    },
    goalButton: {
      backgroundColor: theme.accent,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    goalButtonText: { fontSize: scaled(14), fontWeight: '800', color: '#FFFFFF' },
    goalResultText: { fontSize: scaled(13), fontWeight: '600', color: theme.text, marginTop: 12 },
    modCard: { backgroundColor: theme.surface, borderRadius: 24, marginBottom: 16, overflow: 'hidden', elevation: 2 },
    modHeader: { padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    modTitle: { fontSize: 16, fontWeight: '700', color: theme.text, flex: 1 },
    modAvgBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginLeft: 12 },
    modAvgText: { fontSize: 14, fontWeight: '800' },
    elemCard: { padding: 16, borderTopWidth: 1, borderTopColor: theme.background },
    elemName: { fontSize: 15, fontWeight: '600', color: theme.text, marginBottom: 4 },
    elemMeta: { fontSize: 11, color: theme.muted, marginBottom: 12 },
    inputRow: { flexDirection: 'row', alignItems: 'center' },
    inputBox: { flex: 1, marginRight: 10 },
    inputLabel: { fontSize: 10, fontWeight: '800', color: theme.muted, marginBottom: 4, textAlign: 'center' },
    input: { backgroundColor: theme.background, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 4, textAlign: 'center', fontSize: 16, fontWeight: '700', color: theme.text, borderWidth: 1, borderColor: theme.background },
    elemAvgBox: { width: 45, alignItems: 'center', justifyContent: 'center' },
    elemAvgText: { fontSize: 14, fontWeight: '800' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 90, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
    footerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
    footerLabel: { fontSize: 14, fontWeight: '600', color: theme.text },
    footerValue: { fontSize: 32, fontWeight: '900', color: theme.accent },
    empty: { padding: 40, alignItems: 'center' },
    emptyText: { color: theme.muted, textAlign: 'center', marginTop: 12 }
  });
