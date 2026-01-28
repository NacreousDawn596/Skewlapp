import {
  Home,
  GraduationCap,
  CalendarX,
  Layers,
  Calculator,
  Settings,
} from "lucide-react-native";
import React from "react";
import { useTheme } from "@/themes/ThemeContext";

import { Tabs, Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function TabLayout() {
  const { theme } = useTheme();

  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null; // splash / loader

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.surface,
          borderTopWidth: 1,
        },
        headerShown: false,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: "Notes",
          tabBarIcon: ({ color, size }) => (
            <GraduationCap color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="absences"
        options={{
          title: "Absences",
          tabBarIcon: ({ color, size }) => (
            <CalendarX color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="utils"
        options={{
          title: "Utilitaires",
          tabBarIcon: ({ color, size }) => <Layers color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="calcules"
        options={{
          title: "Calculs",
          tabBarIcon: ({ color, size }) => (
            <Calculator color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Paramètres",
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
