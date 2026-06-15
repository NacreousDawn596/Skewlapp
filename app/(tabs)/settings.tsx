import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  Linking,
} from "react-native";
import { useTheme, FontSize, useFontScale } from "@/themes/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Stack } from "expo-router";
import { THEME_PALETTES } from "@/themes/palettes";
import {
  LogOut,
  Palette,
  Bell,
  Timer,
  Type,
  ChevronRight,
  Github,
  Heart,
  Terminal,
  Globe,
  Lock,
  EyeOff,
  Contact,
  ShieldCheck,
} from "lucide-react-native";
import {
  getPollingSettings,
  savePollingSettings,
} from "@/services/polling";
import { usePolling } from "@/contexts/PollingContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, MOCK_HOST, PRODUCTION_HOST } from "@/api/client";
import StudentCardModal from "@/components/StudentCardModal";

export default function SettingsScreen() {
  const { theme, setTheme, fontSize, setFontSize } = useTheme();
  const scale = useFontScale();
  const scaled = React.useCallback((size: number) => size * scale, [scale]);
  const styles = React.useMemo(() => createStyles(theme, scaled), [theme, scaled]);
  const { logout, setIsGradePrivacyEnabled, setIsBiometricLockEnabled } = useAuth();
  const { startPolling, stopPolling } = usePolling();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: getPollingSettings,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: savePollingSettings,
    onSuccess: () => {
      settingsQuery.refetch();
    },
  });

  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [showStudentCard, setShowStudentCard] = useState(false);
  const [intervalInput, setIntervalInput] = useState("45");
  const [mockHostInput, setMockHostInput] = useState(MOCK_HOST);
  const [devModeVisible, setDevModeVisible] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  const handleDevModeTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    if (newCount >= 7) {
      setDevModeVisible(true);
      if (newCount === 7) {
        Alert.alert("Mode Développeur", "Vous avez débloqué les paramètres expérimentaux.");
      }
    }
  };

  // Sync input with loaded settings
  React.useEffect(() => {
    if (settingsQuery.data?.useMockServer) {
        setDevModeVisible(true);
    }
  }, [settingsQuery.data?.useMockServer]);

  // Sync input with loaded settings
  React.useEffect(() => {
    if (settingsQuery.data?.interval) {
      setIntervalInput(settingsQuery.data.interval.toString());
    }
  }, [settingsQuery.data?.interval]);

  const handleLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Êtes-vous sûr de vouloir vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Se déconnecter",
          style: "destructive",
          onPress: () => logout(),
        },
      ]
    );
  };

  const handleIntervalChange = () => {
    const interval = parseInt(intervalInput, 10);
    if (interval >= 1 && interval <= 360) {
      updateSettingsMutation.mutate({ interval });
    } else {
      Alert.alert("Intervalle invalide", "Veuillez entrer une valeur entre 1 et 360 minutes");
    }
  };

  const fontSizes: { value: FontSize; label: string }[] = [
    { value: "small", label: "Petit" },
    { value: "normal", label: "Normal" },
    { value: "large", label: "Grand" },
    { value: "xl", label: "XL" },
  ];


  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false
        }}
      />

      <View style={{ padding: 24, paddingTop: 40 }}>
        <TouchableOpacity activeOpacity={1} onPress={handleDevModeTap}>
            <Text style={{ fontSize: scaled(32), fontWeight: '900', color: theme.text }}>Paramètres</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Apparence</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setShowThemePicker(!showThemePicker)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Palette size={scaled(20)} color={theme.accent} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Couleur du Thème</Text>
                <Text style={styles.settingSubtitle}>{theme.name}</Text>
              </View>
              <ChevronRight size={scaled(20)} color={theme.muted} />
            </TouchableOpacity>

            {showThemePicker && (
              <View style={styles.themeGrid}>
                {THEME_PALETTES.map((palette) => (
                  <TouchableOpacity
                    key={palette.name}
                    style={[
                      styles.themeOption,
                      { backgroundColor: palette.surface },
                      theme.name === palette.name &&
                      styles.themeOptionSelected,
                    ]}
                    onPress={() => {
                      setTheme(palette);
                      setShowThemePicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.themeOptionName,
                        { color: palette.text },
                      ]}
                    >
                      {palette.name}
                    </Text>
                    <View style={styles.themeOptionColors}>
                      <View style={[styles.colorSwatch, { backgroundColor: palette.primary }]} />
                      <View style={[styles.colorSwatch, { backgroundColor: palette.accent }]} />
                      <View style={[styles.colorSwatch, { backgroundColor: palette.text }]} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.settingItem, styles.settingItemLast]}
              onPress={() => setShowFontSizePicker(!showFontSizePicker)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Type size={scaled(20)} color={theme.accent} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Taille de Police</Text>
                <Text style={styles.settingSubtitle}>
                  {fontSize.charAt(0).toUpperCase() + fontSize.slice(1)}
                </Text>
              </View>
              <ChevronRight size={scaled(20)} color={theme.muted} />
            </TouchableOpacity>

            {showFontSizePicker && (
              <View style={styles.fontSizeGrid}>
                {fontSizes.map((size) => (
                  <TouchableOpacity
                    key={size.value}
                    style={[
                      styles.fontSizeOption,
                      fontSize === size.value &&
                      styles.fontSizeOptionSelected,
                    ]}
                    onPress={() => {
                      setFontSize(size.value);
                      setShowFontSizePicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.fontSizeLabel}>{size.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vie Privée et Utilitaires</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setShowStudentCard(true)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Contact size={scaled(20)} color={theme.accent} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Carte d&apos;Étudiant Virtuelle</Text>
                <Text style={styles.settingSubtitle}>Votre identité académique</Text>
              </View>
              <ChevronRight size={scaled(20)} color={theme.muted} />
            </TouchableOpacity>

            <View style={styles.settingItem}>
              <View style={styles.iconContainer}>
                <ShieldCheck size={scaled(20)} color={theme.accent} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Verrouillage Biométrique</Text>
                <Text style={styles.settingSubtitle}>Sécuriser l&apos;accès à l&apos;application</Text>
              </View>
              <Switch
                value={settingsQuery.data?.biometricLock ?? false}
                onValueChange={(value) => {
                  updateSettingsMutation.mutate({ biometricLock: value });
                  setIsBiometricLockEnabled(value);
                }}
                trackColor={{ false: theme.muted, true: theme.accent }}
              />
            </View>

            <View style={[styles.settingItem, styles.settingItemLast]}>
              <View style={styles.iconContainer}>
                <EyeOff size={scaled(20)} color={theme.accent} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Mode Confidentialité</Text>
                <Text style={styles.settingSubtitle}>Masquer les notes sur l&apos;écran d&apos;accueil</Text>
              </View>
              <Switch
                value={settingsQuery.data?.gradePrivacy ?? false}
                onValueChange={(value) => {
                  updateSettingsMutation.mutate({ gradePrivacy: value });
                  setIsGradePrivacyEnabled(value);
                }}
                trackColor={{ false: theme.muted, true: theme.accent }}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actualisation</Text>
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.iconContainer}>
                <Timer size={scaled(20)} color={theme.accent} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Actualisation automatique</Text>
                <Text style={styles.settingSubtitle}>Mises à jour des données en arrière-plan</Text>
              </View>
              <Switch
                value={settingsQuery.data?.enabled ?? true}
                onValueChange={async (value) => {
                  await updateSettingsMutation.mutateAsync({ enabled: value });
                  if (value) {
                    startPolling();
                  } else {
                    stopPolling();
                  }
                }}
                trackColor={{ false: theme.muted, true: theme.accent }}
              />
            </View>
            <View style={styles.settingItem}>
              <View style={styles.iconContainer}>
                <Timer size={scaled(20)} color={theme.accent} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Intervalle d&apos;actualisation (mins)</Text>
                <Text style={styles.settingSubtitle}>Fréquence des mises à jour</Text>
              </View>
              <TextInput
                style={styles.intervalInput}
                value={intervalInput}
                onChangeText={setIntervalInput}
                onBlur={handleIntervalChange}
                keyboardType="number-pad"
                editable={settingsQuery.data?.enabled ?? true}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.iconContainer}>
                <Bell size={scaled(20)} color={theme.accent} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Toutes les notifications</Text>
                <Text style={styles.settingSubtitle}>Activer ou désactiver toutes les notifications</Text>
              </View>
              <Switch
                value={settingsQuery.data?.notificationsEnabled ?? true}
                onValueChange={(value) =>
                  updateSettingsMutation.mutate({ notificationsEnabled: value })
                }
                trackColor={{ false: theme.muted, true: theme.accent }}
              />
            </View>
            <View style={styles.settingItem}>
              <View style={styles.iconContainer}>
                <Bell size={scaled(20)} color={theme.accent} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Mises à jour des notes</Text>
                <Text style={styles.settingSubtitle}>Nouvelles notes et modifications</Text>
              </View>
              <Switch
                value={settingsQuery.data?.notifyNotes ?? true}
                onValueChange={(value) =>
                  updateSettingsMutation.mutate({ notifyNotes: value })
                }
                trackColor={{ false: theme.muted, true: theme.accent }}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.iconContainer}>
                <Bell size={scaled(20)} color={theme.accent} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Absences</Text>
                <Text style={styles.settingSubtitle}>Alertes de nouvelles absences</Text>
              </View>
              <Switch
                value={settingsQuery.data?.notifyAbsences ?? true}
                onValueChange={(value) =>
                  updateSettingsMutation.mutate({ notifyAbsences: value })
                }
                trackColor={{ false: theme.muted, true: theme.accent }}
              />
            </View>

            <View style={[styles.settingItem, styles.settingItemLast]}>
              <View style={styles.iconContainer}>
                <Bell size={scaled(20)} color={theme.accent} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Sanctions officielles</Text>
                <Text style={styles.settingSubtitle}>Annonces administratives</Text>
              </View>
              <Switch
                value={settingsQuery.data?.notifySanctions ?? true}
                onValueChange={(value) =>
                  updateSettingsMutation.mutate({ notifySanctions: value })
                }
                trackColor={{ false: theme.muted, true: theme.accent }}
              />
            </View>
          </View>
        </View>

        {devModeVisible && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={styles.sectionTitle}>Mode Développement</Text>
                <View style={{ backgroundColor: '#FFD93D', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: '900', color: '#000' }}>EXPERIMENTAL ONLY</Text>
                </View>
            </View>
            <View style={styles.card}>
              <View style={styles.settingItem}>
                <View style={styles.iconContainer}>
                  <Terminal size={scaled(20)} color={theme.accent} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Utiliser le Serveur Mock</Text>
                  <Text style={styles.settingSubtitle}>Redirection vers le backend de test</Text>
                </View>
                <Switch
                  value={settingsQuery.data?.useMockServer ?? false}
                  onValueChange={async (value) => {
                    await updateSettingsMutation.mutateAsync({ useMockServer: value });
                    apiClient.setBaseUrl(value ? mockHostInput : PRODUCTION_HOST);
                    // Clear queries to force fresh fetch from the new environment
                    queryClient.clear();
                    Alert.alert(
                      "Environnement changé",
                      `L'application utilise désormais le serveur ${value ? "MOCK" : "PRODUCTION"}.`
                    );
                  }}
                  trackColor={{ false: theme.muted, true: theme.accent }}
                />
              </View>
              <View style={[styles.settingItem, styles.settingItemLast]}>
                <View style={styles.iconContainer}>
                  <Globe size={scaled(20)} color={theme.accent} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Host du Serveur Mock</Text>
                  <Text style={styles.settingSubtitle}>Adresse IP locale (ex: http://192.168...)</Text>
                </View>
                <TextInput
                  style={[styles.intervalInput, { width: 180, textAlign: 'left', paddingHorizontal: 12 }]}
                  value={mockHostInput}
                  onChangeText={setMockHostInput}
                  placeholder="http://..."
                  placeholderTextColor={theme.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LogOut size={scaled(20)} color="#FFFFFF" />
          <Text style={styles.logoutButtonText}>Se déconnecter</Text>
        </TouchableOpacity>

        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>Infos sur l&apos;application</Text>
          <TouchableOpacity
            style={styles.githubButton}
            onPress={() => Linking.openURL('https://github.com/NacreousDawn596/SkewlApp')}
          >
            <View style={[styles.iconContainer, { backgroundColor: theme.background }]}>
              <Github size={scaled(20)} color={theme.text} />
            </View>
            <Text style={styles.githubText}>Vérifier les mises à jour</Text>
            <ChevronRight size={scaled(18)} color={theme.muted} />
          </TouchableOpacity>
        </View>

        <View style={styles.creditsContainer}>
          <Text style={styles.creditsText}>
            by Aferiad Kamal & Feddoul Salma
            {/* Aferiad Kamal */}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Text style={styles.creditsText}>made with lack of sleep, caffeine and </Text>
            <Heart size={scaled(14)} color="#FF6B6B" fill="#FF6B6B" />
          </View>
        </View>
      </ScrollView>

      <StudentCardModal 
        visible={showStudentCard} 
        onClose={() => setShowStudentCard(false)} 
      />
    </View>
  );
}

const createStyles = (theme: any, scaled: (n: number) => number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scrollContent: { padding: 16 },
    section: { marginBottom: 24 },
    sectionTitle: {
      fontSize: scaled(13),
      fontWeight: "800",
      color: theme.muted,
      marginBottom: 12,
      marginTop: 8,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      overflow: "hidden",
      elevation: 2,
    },
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.background,
    },
    settingItemLast: { borderBottomWidth: 0 },
    iconContainer: {
      width: scaled(40),
      height: scaled(40),
      borderRadius: 12,
      backgroundColor: theme.background,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    settingContent: { flex: 1 },
    settingTitle: {
      fontSize: scaled(16),
      fontWeight: "700",
      color: theme.text,
      marginBottom: 2,
    },
    settingSubtitle: { fontSize: scaled(13), color: theme.muted },
    themeGrid: { padding: 16, gap: 12 },
    themeOption: {
      padding: 16,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: "transparent",
    },
    themeOptionSelected: { borderColor: theme.accent },
    themeOptionName: { fontSize: scaled(15), fontWeight: "700", marginBottom: 8 },
    themeOptionColors: { flexDirection: "row", gap: 6 },
    colorSwatch: { width: 24, height: 24, borderRadius: 12 },
    fontSizeGrid: { padding: 16, gap: 10, flexDirection: "row", flexWrap: "wrap" },
    fontSizeOption: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: theme.background,
      borderWidth: 2,
      borderColor: "transparent",
      flex: 1,
      minWidth: "45%",
      alignItems: "center",
    },
    fontSizeOptionSelected: {
      borderColor: theme.accent,
      backgroundColor: theme.accent + "10",
    },
    fontSizeLabel: {
      fontSize: scaled(14),
      fontWeight: "700",
      color: theme.text,
    },
    intervalInput: {
      backgroundColor: theme.background,
      borderRadius: 10,
      padding: 8,
      fontSize: scaled(16),
      color: theme.text,
      width: 70,
      textAlign: "center",
      fontWeight: "700",
    },
    logoutButton: {
      backgroundColor: "#FF6B6B",
      borderRadius: 16,
      padding: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 16,
    },
    logoutButtonText: {
      fontSize: scaled(16),
      fontWeight: "800",
      color: "#FFFFFF",
      marginLeft: 8,
    },
    creditsContainer: { marginTop: 32, alignItems: "center", paddingBottom: 24 },
    creditsText: { fontSize: scaled(13), color: theme.muted, fontWeight: "600" },
    heartIcon: { marginHorizontal: 4 },
    githubButton: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      elevation: 1,
    },
    githubText: {
      fontSize: scaled(15),
      fontWeight: "700",
      color: theme.text,
      marginLeft: 12,
      flex: 1,
    },
  });