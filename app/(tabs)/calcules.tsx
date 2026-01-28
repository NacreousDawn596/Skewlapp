import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Dimensions,
  KeyboardAvoidingView,
  Animated
} from "react-native";
import { useTheme } from "@/themes/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Stack } from "expo-router";
import { schoolAppClient, secureStorage } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import { getCachedData, getCachedModules, setCachedModules } from "@/services/cache";
import { usePolling } from "@/contexts/PollingContext";
import { useNetInfo } from "@react-native-community/netinfo";
import {
  ChevronDown,
  ChevronUp,
  Calculator,
  Layers,
} from "lucide-react-native";
import { BlurView } from "expo-blur";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get("window");

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
  const { profile } = useAuth();
  const { lastPollTime, isPolling } = usePolling();
  const netInfo = useNetInfo();

  const [selNiveau, setSelNiveau] = useState("1A");
  const [selFiliere, setSelFiliere] = useState("");
  const [selSemestre, setSelSemestre] = useState("S1");
  const [userMarks, setUserMarks] = useState<Record<string, { CC?: string, TP?: string, EX?: string }>>({});
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  const filieresQuery = useQuery({
    queryKey: ["all_filieres"],
    queryFn: () => getCachedData("filieres"),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const modulesLookupQuery = useQuery({
    queryKey: ["lookup_modules_calc", selNiveau, selFiliere, selSemestre],
    queryFn: async () => {
      const cacheKey = `${selNiveau}_${selFiliere}_${selSemestre}`;
      console.log(`[Calcules] Loading modules for ${cacheKey}`);
      
      try {
        // Try to fetch fresh data first
        console.log(`[Calcules] Attempting fresh fetch for ${cacheKey}...`);
        const freshData = await schoolAppClient.getModules(selNiveau, selFiliere, selSemestre);
        const hasContent = freshData && ((Array.isArray(freshData) && freshData.length > 0) || (typeof freshData === 'object' && Object.keys(freshData).length > 0));
        
        if (hasContent) {
          console.log(`[Calcules] Got fresh data for ${cacheKey}`);
          // Only cache if we have internet and data is not empty
          if (netInfo.isConnected) {
            await setCachedModules(selNiveau, selFiliere, selSemestre, freshData);
            console.log(`[Calcules] Cached fresh data for ${cacheKey}`);
          } else {
            console.log(`[Calcules] Offline, not caching for ${cacheKey}`);
          }
          return freshData;
        }
      } catch (e) {
        console.log(`[Calcules] Fresh fetch failed for ${cacheKey}:`, e);
      }
      
      // Try cache as fallback
      console.log(`[Calcules] Trying cache for ${cacheKey}...`);
      const cachedData = await getCachedModules(selNiveau, selFiliere, selSemestre);
      const hasCachedContent = cachedData && ((Array.isArray(cachedData) && cachedData.length > 0) || (typeof cachedData === 'object' && Object.keys(cachedData).length > 0));
      
      if (hasCachedContent) {
        console.log(`[Calcules] Using cached data for ${cacheKey}`);
        return cachedData;
      }
      
      console.log(`[Calcules] No valid data found for ${cacheKey}`);
      return null;
    },
    enabled: !!selFiliere,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const currentElemsQuery = useQuery({
    queryKey: ["current_elems_calc"],
    queryFn: async () => {
      const cached = await getCachedData("currentElems");
      if (cached) {
        console.log("[Calcules] Using cached currentElems");
        return cached;
      }
      console.log("[Calcules] No cache for currentElems, triggering poll...");
      await poll(false);
      const refreshed = await getCachedData("currentElems");
      return refreshed || null;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const historyElemsQuery = useQuery({
    queryKey: ["history_elems_calc"],
    queryFn: async () => {
      const cached = await getCachedData("allElems");
      if (cached) {
        console.log("[Calcules] Using cached allElems");
        return cached;
      }
      console.log("[Calcules] No cache for allElems, triggering poll...");
      await poll(false);
      const refreshed = await getCachedData("allElems");
      return refreshed || null;
    },
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
      }
    }
  }, [profile, filieresQuery.data]);

  useEffect(() => {
    const loadState = async () => {
      const key = `calc_storage_${selNiveau}_${selFiliere}_${selSemestre}`;
      const saved = await secureStorage.getItem(key);
      if (saved) {
        try { setUserMarks(JSON.parse(saved)); } catch (e) { }
      } else {
        setUserMarks({});
      }
    };
    if (selFiliere) loadState();
  }, [selNiveau, selFiliere, selSemestre]);

  useEffect(() => {
    const saveState = async () => {
      const key = `calc_storage_${selNiveau}_${selFiliere}_${selSemestre}`;
      await secureStorage.setItem(key, JSON.stringify(userMarks));
    };
    if (Object.keys(userMarks).length > 0) saveState();
  }, [userMarks]);

  const toggleModule = (code: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedModules(prev => ({ ...prev, [code]: !prev[code] }));
  };

  const updateMark = (elemCode: string, type: 'CC' | 'TP' | 'EX', val: string) => {
    const num = parseFloat(val.replace(',', '.'));
    if (val !== "" && (isNaN(num) || num < 0 || num > 20)) return;
    setUserMarks(prev => ({ ...prev, [elemCode]: { ...prev[elemCode], [type]: val } }));
  };

  const calculatedData = useMemo(() => {
    const modules = modulesLookupQuery.data || {};
    const currentResults = (currentElemsQuery.data as any[]) || [];
    const historyResults = (historyElemsQuery.data as any[]) || [];
    let totalPoints = 0;
    let totalCoef = 0;

    const processedModules = Object.entries(modules).map(([modCode, mData]: [string, any]) => {
      let modSum = 0;
      let mCoefSum = 0;
      const elements = mData.elements?.map((elem: any) => {
        const res = currentResults.find(r => r.CodeElem === elem.code) || historyResults.find(r => r.CodeElem === elem.code);
        const u = userMarks[elem.code] || {};
        const cc = u.CC !== undefined ? u.CC : (res?.CC || "");
        const tp = u.TP !== undefined ? u.TP : (res?.TP || "");
        const ex = u.EX !== undefined ? u.EX : (res?.EX || "");
        let nCC = parseFloat(String(cc).replace(',', '.')) || 0;
        let nTP = parseFloat(String(tp).replace(',', '.')) || 0;
        let nEX = parseFloat(String(ex).replace(',', '.')) || 0;

        // Apply RATT logic if available and valid
        const nRATT = parseFloat(String(res?.RATT).replace(',', '.'));
        if (!isNaN(nRATT) && nRATT > 0) {
          if (nCC > 0) nCC = Math.max(nCC, nRATT);
          if (!isNaN(nEX) && nEX > 0) nEX = Math.max(nEX, nRATT);
          else nEX = nRATT;
          if (nTP > 0) nTP = Math.max(nTP, nRATT);
        }
        let eAvg = 0;
        const cCC = parseFloat(elem.coef_cc) || 0;
        const cEX = parseFloat(elem.coef_ex) || 0;
        const cTP = parseFloat(elem.coef_tp) || 0;
        const cEcrit = parseFloat(elem.coef_ecrit) || (cCC + cEX);
        const totalWeight = cEcrit + cTP;
        if (totalWeight > 0) {
          const writtenWeightSum = cCC + cEX;
          const writtenPartAvg = writtenWeightSum > 0 ? (nCC * cCC + nEX * cEX) / writtenWeightSum : 0;
          eAvg = (writtenPartAvg * cEcrit + nTP * cTP) / totalWeight;
        }
        const eCoef = parseFloat(elem.coef_elem) || 1;
        modSum += eAvg * eCoef;
        mCoefSum += eCoef;
        return { ...elem, cc, tp, ex, average: eAvg, baseline: res };
      });
      const mAvg = mCoefSum > 0 ? modSum / mCoefSum : 0;
      const mCoef = parseFloat(mData.coef) || 1;
      totalPoints += mAvg * mCoef;
      totalCoef += mCoef;
      return { ...mData, code: modCode, elements, average: mAvg };
    });
    const globalAvg = totalCoef > 0 ? totalPoints / totalCoef : 0;
    return { modules: processedModules, globalAvg };
  }, [modulesLookupQuery.data, userMarks, currentElemsQuery.data, historyElemsQuery.data]);

  const getStatusColor = (val: number) => {
    if (val >= 12) return "#6BCB77";
    if (val >= 10) return "#FFD93D";
    return "#FF6B6B";
  };

  const gpaAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(gpaAnim, { toValue: 1.2, duration: 150, useNativeDriver: true }),
      Animated.timing(gpaAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [calculatedData.globalAvg]);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scrollContent: { padding: 16, paddingBottom: 120 },
    selectorCard: { backgroundColor: theme.surface, borderRadius: 24, padding: 16, marginBottom: 20, elevation: 2 },
    selLabel: { fontSize: 11, fontWeight: '800', color: theme.muted, marginBottom: 8, textTransform: 'uppercase' },
    chipRow: { flexDirection: 'row', marginBottom: 12 },
    chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: theme.background, marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
    chipActive: { backgroundColor: theme.accent + '20', borderColor: theme.accent },
    chipText: { fontSize: 12, fontWeight: '700', color: theme.muted },
    chipActiveText: { color: theme.accent },
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

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <Calculator size={24} color={theme.accent} />
          <Text style={{ fontSize: 24, fontWeight: '800', color: theme.text, marginLeft: 10 }}>Simulateur</Text>
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
              <TouchableOpacity key={n} onPress={() => setSelNiveau(n)} style={[styles.chip, selNiveau === n && styles.chipActive]}>
                <Text style={[styles.chipText, selNiveau === n && styles.chipActiveText]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.chipRow}>
            {["S1", "S2"].map(s => (
              <TouchableOpacity key={s} onPress={() => setSelSemestre(s)} style={[styles.chip, selSemestre === s && styles.chipActive, { flex: 1 }]}>
                <Text style={[styles.chipText, selSemestre === s && styles.chipActiveText, { textAlign: 'center' }]}>{s === "S1" ? "Semestre 1" : "Semestre 2"}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.selLabel}>Filière</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(filieresQuery.data as any[])?.map(f => (
              <TouchableOpacity key={f.Code} onPress={() => setSelFiliere(f.Code)} style={[styles.chip, selFiliere === f.Code && styles.chipActive]}>
                <Text style={[styles.chipText, selFiliere === f.Code && styles.chipActiveText]}>{f.Code}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
        <BlurView intensity={80} tint={theme.name.toLowerCase().includes('dark') ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
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
