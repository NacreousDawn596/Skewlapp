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
} from "lucide-react-native";
import {
  getPollingSettings,
  savePollingSettings,
} from "@/services/polling";
import { useQuery, useMutation } from "@tanstack/react-query";

export default function SettingsScreen() {
  const { theme, setTheme, fontSize, setFontSize } = useTheme();
  const scale = useFontScale();
  const scaled = (size: number) => size * scale;
  const { logout } = useAuth();

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
  const [intervalInput, setIntervalInput] = useState(
    settingsQuery.data?.interval.toString() || "45"
  );

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: () => logout(),
        },
      ]
    );
  };

  const handleIntervalChange = () => {
    const interval = parseInt(intervalInput, 10);
    if (interval >= 45 && interval <= 360) {
      updateSettingsMutation.mutate({ interval });
    } else {
      Alert.alert("Invalid interval", "Please enter a value between 45 and 360 minutes");
    }
  };

  const fontSizes: { value: FontSize; label: string }[] = [
    { value: "small", label: "Small" },
    { value: "normal", label: "Normal" },
    { value: "large", label: "Large" },
    { value: "xl", label: "XL" },
  ];

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scrollContent: { padding: 16 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: scaled(13), fontWeight: "800", color: theme.muted, marginBottom: 12, marginTop: 8, textTransform: "uppercase", letterSpacing: 0.5 },
    card: { backgroundColor: theme.surface, borderRadius: 20, overflow: "hidden", elevation: 2 },
    settingItem: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: theme.background },
    settingItemLast: { borderBottomWidth: 0 },
    iconContainer: { width: scaled(40), height: scaled(40), borderRadius: 12, backgroundColor: theme.background, alignItems: "center", justifyContent: "center", marginRight: 12 },
    settingContent: { flex: 1 },
    settingTitle: { fontSize: scaled(16), fontWeight: "700", color: theme.text, marginBottom: 2 },
    settingSubtitle: { fontSize: scaled(13), color: theme.muted },
    themeGrid: { padding: 16, gap: 12 },
    themeOption: { padding: 16, borderRadius: 12, borderWidth: 2, borderColor: "transparent" },
    themeOptionSelected: { borderColor: theme.accent },
    themeOptionName: { fontSize: scaled(15), fontWeight: "700", marginBottom: 8 },
    themeOptionColors: { flexDirection: "row", gap: 6 },
    colorSwatch: { width: 24, height: 24, borderRadius: 12 },
    fontSizeGrid: { padding: 16, gap: 10, flexDirection: 'row', flexWrap: 'wrap' },
    fontSizeOption: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: theme.background, borderWidth: 2, borderColor: "transparent", flex: 1, minWidth: '45%', alignItems: 'center' },
    fontSizeOptionSelected: { borderColor: theme.accent, backgroundColor: theme.accent + '10' },
    fontSizeLabel: { fontSize: scaled(14), fontWeight: "700", color: theme.text },
    intervalInput: { backgroundColor: theme.background, borderRadius: 10, padding: 8, fontSize: scaled(16), color: theme.text, width: 70, textAlign: "center", fontWeight: '700' },
    logoutButton: { backgroundColor: "#FF6B6B", borderRadius: 16, padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 16 },
    logoutButtonText: { fontSize: scaled(16), fontWeight: "800", color: "#FFFFFF", marginLeft: 8 },
    creditsContainer: { marginTop: 32, alignItems: 'center', paddingBottom: 24 },
    creditsText: { fontSize: scaled(13), color: theme.muted, fontWeight: '600' },
    heartIcon: { marginHorizontal: 4 },
    githubButton: { backgroundColor: theme.surface, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginTop: 8, elevation: 1 },
    githubText: { fontSize: scaled(15), fontWeight: '700', color: theme.text, marginLeft: 12, flex: 1 },
  });

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false
        }}
      />

      <View style={{ padding: 24, paddingTop: 40 }}>
        <Text style={{ fontSize: scaled(32), fontWeight: '900', color: theme.text }}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
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
                <Text style={styles.settingTitle}>Theme Color</Text>
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
                <Text style={styles.settingTitle}>Font Size</Text>
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
          <Text style={styles.sectionTitle}>Polling</Text>
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.iconContainer}>
                <Timer size={scaled(20)} color={theme.accent} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Refresh Interval (mins)</Text>
                <Text style={styles.settingSubtitle}>Auto-updates in background</Text>
              </View>
              <TextInput
                style={styles.intervalInput}
                value={intervalInput}
                onChangeText={setIntervalInput}
                onBlur={handleIntervalChange}
                keyboardType="number-pad"
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
                <Text style={styles.settingTitle}>All Notifications</Text>
                <Text style={styles.settingSubtitle}>Enable or disable all app notifications</Text>
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
                <Text style={styles.settingTitle}>Grade Updates</Text>
                <Text style={styles.settingSubtitle}>New marks and modifications</Text>
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
                <Text style={styles.settingSubtitle}>New absence alerts</Text>
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
                <Text style={styles.settingTitle}>Official Sanctions</Text>
                <Text style={styles.settingSubtitle}>Administrative announcements</Text>
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

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LogOut size={scaled(20)} color="#FFFFFF" />
          <Text style={styles.logoutButtonText}>Logout Account</Text>
        </TouchableOpacity>

        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>App Info</Text>
          <TouchableOpacity
            style={styles.githubButton}
            onPress={() => Linking.openURL('https://github.com/NacreousDawn596/SkewlApp')}
          >
            <View style={[styles.iconContainer, { backgroundColor: theme.background }]}>
              <Github size={scaled(20)} color={theme.text} />
            </View>
            <Text style={styles.githubText}>Check for Updates</Text>
            <ChevronRight size={scaled(18)} color={theme.muted} />
          </TouchableOpacity>
        </View>

        <View style={styles.creditsContainer}>
          <Text style={styles.creditsText}>
            by Aferiad Kamal and El Banane Nada
            {/* Aferiad Kamal */}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Text style={styles.creditsText}>made with lack of sleep, caffeine and </Text>
            <Heart size={scaled(14)} color="#FF6B6B" fill="#FF6B6B" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
