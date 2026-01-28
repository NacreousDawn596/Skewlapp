import React, { useState } from "react";
import { Redirect } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTheme } from "@/themes/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { LinearGradient } from "expo-linear-gradient";
import { Lock, Mail } from "lucide-react-native";

export default function LoginScreen() {
  const { theme } = useTheme();
  const { login, loginError, isLoggingIn, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [scaleAnim] = useState(new Animated.Value(1));

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />;
  }

  const handleLogin = async () => {
    if (!email || !password) {
      return;
    }

    await login(email, password);
  };

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    gradient: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      height: "100%",
    },
    content: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    title: {
      fontSize: 42,
      fontWeight: "700" as const,
      color: theme.text,
      marginBottom: 12,
      letterSpacing: -1,
    },
    subtitle: {
      fontSize: 16,
      color: theme.muted,
      marginBottom: 48,
    },
    inputContainer: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: theme.text,
      marginBottom: 8,
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surface,
      borderRadius: 16,
      paddingHorizontal: 16,
      height: 56,
      borderWidth: 1,
      borderColor: theme.surface,
    },
    icon: {
      marginRight: 12,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: theme.text,
    },
    errorText: {
      color: "#FF6B6B",
      fontSize: 14,
      marginTop: 8,
      marginLeft: 4,
    },
    loginButton: {
      marginTop: 32,
      overflow: "hidden",
      borderRadius: 16,
    },
    loginButtonGradient: {
      paddingVertical: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    loginButtonText: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: "#FFFFFF",
    },
    footer: {
      paddingVertical: 24,
      alignItems: "center",
    },
    footerText: {
      fontSize: 14,
      color: theme.muted,
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LinearGradient
        colors={[theme.background, theme.surface]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.content}>
        <Text style={styles.title}>SkewlApp</Text>
        <Text style={styles.subtitle}>
          Connectez-vous pour accéder à votre tableau de bord scolaire
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>E-mail</Text>
          <View style={styles.inputWrapper}>
            <Mail size={20} color={theme.muted} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="student@example.com"
              placeholderTextColor={theme.muted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isLoggingIn}
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Mot de passe</Text>
          <View style={styles.inputWrapper}>
            <Lock size={20} color={theme.muted} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Entrez votre mot de passe"
              placeholderTextColor={theme.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoggingIn}
            />
          </View>
        </View>

        {loginError && <Text style={styles.errorText}>{loginError}</Text>}

        <Animated.View
          style={[styles.loginButton, { transform: [{ scale: scaleAnim }] }]}
        >
          <TouchableOpacity
            onPress={handleLogin}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            disabled={isLoggingIn || !email || !password}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[theme.accent, theme.primary]}
              style={styles.loginButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.loginButtonText}>
                {isLoggingIn ? "Connexion en cours..." : "Se connecter"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            suivez schoolapp avec des mises à jour en temps réel
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
