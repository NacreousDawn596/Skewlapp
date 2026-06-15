import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useTheme, useFontScale } from "@/themes/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { X, User, GraduationCap, MapPin, QrCode, ShieldCheck } from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

interface StudentCardModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function StudentCardModal({ visible, onClose }: StudentCardModalProps) {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const scale = useFontScale();
  const scaled = (size: number) => size * scale;

  // Authenticated Avatar Fetching
  const avatarQuery = useQuery({
    queryKey: ["avatar_modal", profile?.administrative_info?.Code],
    queryFn: async () => {
      if (!profile?.administrative_info?.Code || !profile?.session_id) return null;
      
      const code = profile.administrative_info.Code;
      const url = `https://schoolapp.ensam-umi.ac.ma/getphoto/${code}`;
      const response = await fetch(url, {
        headers: {
          Cookie: `JSESSIONID=${profile.session_id}`,
          Referer: "https://schoolapp.ensam-umi.ac.ma/index",
        },
      });

      if (!response.ok) return null;

      const blob = await response.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    },
    enabled: visible && !!profile?.administrative_info?.Code,
    staleTime: 24 * 60 * 60 * 1000,
  });

  if (!profile) return null;

  const admin = profile.administrative_info || {};
  const basic = profile.basic_info || {};

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={onClose} 
        />
        
        <View style={[styles.cardContainer, { backgroundColor: theme.surface }]}>
          <LinearGradient
            colors={[theme.accent, theme.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cardHeader}
          >
            <View style={styles.headerTitleContainer}>
              <View style={styles.headerIconContainer}>
                <GraduationCap color={theme.accent} size={scaled(18)} />
              </View>
              <View>
                <Text style={styles.headerTitle}>CARTE D'ÉTUDIANT</Text>
                <Text style={styles.headerSubtitle}>SKEWLAPP DIGITAL ID</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X color="#FFF" size={24} />
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.cardBody}>
            <View style={styles.topSection}>
                <View style={styles.profileSection}>
                    <View style={[styles.avatarContainer, { borderColor: theme.accent }]}>
                        {avatarQuery.isLoading ? (
                            <ActivityIndicator size="small" color={theme.accent} />
                        ) : avatarQuery.data ? (
                            <Image source={{ uri: avatarQuery.data }} style={styles.avatar} contentFit="cover" cachePolicy="disk" />
                        ) : (
                            <User size={40} color={theme.muted} />
                        )}
                        <View style={[styles.verifiedBadge, { backgroundColor: theme.accent }]}>
                            <ShieldCheck size={12} color="#FFF" />
                        </View>
                    </View>
                    <View style={styles.nameInfo}>
                        <Text style={[styles.fullName, { color: theme.text }]} numberOfLines={2}>
                        {basic.full_name || "Nom Inconnu"}
                        </Text>
                        <Text style={[styles.role, { color: theme.accent }]}>
                        {basic.role || "Étudiant"}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.background }]} />

            <View style={styles.detailsGrid}>
              <DetailItem 
                icon={<GraduationCap size={16} color={theme.accent} />}
                label="Filière"
                value={admin.Filière || admin.Filiere || "N/A"}
                theme={theme}
              />
              <DetailItem 
                icon={<MapPin size={16} color={theme.accent} />}
                label="Niveau / Section"
                value={`${admin.Niveau || "N/A"} - ${admin.Section || "A"}`}
                theme={theme}
              />
              <DetailItem 
                icon={<QrCode size={16} color={theme.accent} />}
                label="ID Académique"
                value={admin.Code || "N/A"}
                theme={theme}
              />
            </View>

            <View style={styles.qrSection}>
              <View style={[styles.qrBackground, { backgroundColor: "#FFF" }]}>
                <QRCode
                  value={admin.Code || "SkewlApp"}
                  size={scaled(100)}
                  color="#000"
                  backgroundColor="#FFF"
                />
              </View>
              <Text style={[styles.qrHint, { color: theme.muted }]}>
                ID Scannable pour vérification rapide
              </Text>
            </View>
          </View>

          <View style={[styles.cardFooter, { backgroundColor: theme.background + '50' }]}>
            <Text style={[styles.footerText, { color: theme.muted }]}>
              PROPRIÉTÉ DE L'ENSAM • ANNÉE ACADÉMIQUE 2025/2026
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailItem({ icon, label, value, theme }: any) {
    return (
      <View style={styles.detailItem}>
        <View style={[styles.detailIconContainer, { backgroundColor: theme.background }]}>{icon}</View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.detailLabel, { color: theme.muted }]}>{label}</Text>
          <Text style={[styles.detailValue, { color: theme.text }]}>{value}</Text>
        </View>
      </View>
    );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardContainer: {
    width: width - 40,
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  cardHeader: {
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  closeButton: {
    padding: 4,
  },
  cardBody: {
    padding: 24,
  },
  topSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    overflow: 'visible', // for verified badge
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
  },
  verifiedBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#FFF',
      alignItems: 'center',
      justifyContent: 'center',
  },
  nameInfo: {
    marginLeft: 20,
    flex: 1,
  },
  fullName: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  role: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 24,
  },
  detailsGrid: {
    gap: 16,
    marginBottom: 24,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  qrSection: {
    alignItems: 'center',
    marginTop: 8,
  },
  qrBackground: {
    padding: 16,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  qrHint: {
    fontSize: 12,
    marginTop: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardFooter: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
