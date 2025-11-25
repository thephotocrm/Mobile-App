import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, StyleSheet, View, Text } from "react-native";
import { HomeStackNavigator } from "@/navigation/HomeStackNavigator";
import ProjectsStackNavigator from "@/navigation/ProjectsStackNavigator";
import InboxStackNavigator from "@/navigation/InboxStackNavigator";
import { NotificationsStackNavigator } from "@/navigation/NotificationsStackNavigator";
import { ToolsStackNavigator } from "@/navigation/ToolsStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { GradientColors, Spacing } from "@/constants/theme";

interface TabIconProps {
  name: keyof typeof Feather.glyphMap;
  label: string;
  size: number;
  focused: boolean;
  inactiveColor: string;
}

function TabIcon({ name, label, size, focused, inactiveColor }: TabIconProps) {
  if (!focused) {
    return (
      <View style={styles.tabItem}>
        <Feather name={name} size={size} color={inactiveColor} />
        <Text style={[styles.tabLabel, { color: inactiveColor }]}>{label}</Text>
      </View>
    );
  }
  
  return (
    <LinearGradient
      colors={GradientColors.primary as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.activeTabItem}
    >
      <Feather name={name} size={size} color="#FFFFFF" />
      <Text style={[styles.tabLabel, { color: '#FFFFFF' }]}>{label}</Text>
    </LinearGradient>
  );
}

export type MainTabParamList = {
  HomeTab: undefined;
  ProjectsTab: undefined;
  InboxTab: undefined;
  NotificationsTab: undefined;
  ToolsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundRoot,
          }),
          borderTopWidth: 1,
          borderTopColor: theme.border,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: Spacing.xs,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarIcon: ({ focused, size }) => (
            <TabIcon name="home" label="Home" size={size} focused={focused} inactiveColor={theme.tabIconDefault} />
          ),
        }}
      />
      <Tab.Screen
        name="ProjectsTab"
        component={ProjectsStackNavigator}
        options={{
          tabBarIcon: ({ focused, size }) => (
            <TabIcon name="folder" label="Projects" size={size} focused={focused} inactiveColor={theme.tabIconDefault} />
          ),
        }}
      />
      <Tab.Screen
        name="InboxTab"
        component={InboxStackNavigator}
        options={{
          tabBarIcon: ({ focused, size }) => (
            <TabIcon name="message-square" label="Inbox" size={size} focused={focused} inactiveColor={theme.tabIconDefault} />
          ),
        }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsStackNavigator}
        options={{
          tabBarIcon: ({ focused, size }) => (
            <TabIcon name="bell" label="Alerts" size={size} focused={focused} inactiveColor={theme.tabIconDefault} />
          ),
        }}
      />
      <Tab.Screen
        name="ToolsTab"
        component={ToolsStackNavigator}
        options={{
          tabBarIcon: ({ focused, size }) => (
            <TabIcon name="grid" label="Tools" size={size} focused={focused} inactiveColor={theme.tabIconDefault} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    gap: 2,
  },
  activeTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: 8,
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
});
