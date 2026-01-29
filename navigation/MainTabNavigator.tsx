import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, Text } from "react-native";
import { HomeStackNavigator } from "@/navigation/HomeStackNavigator";
import ProjectsStackNavigator from "@/navigation/ProjectsStackNavigator";
import InboxStackNavigator from "@/navigation/InboxStackNavigator";
import { NotificationsStackNavigator } from "@/navigation/NotificationsStackNavigator";
import { ToolsStackNavigator } from "@/navigation/ToolsStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { useInbox } from "@/contexts/InboxContext";
import { MessagingColors } from "@/constants/theme";

interface TabIconProps {
  name: keyof typeof Feather.glyphMap;
  label: string;
  size: number;
  focused: boolean;
  inactiveColor: string;
  badge?: number;
}

function TabIcon({
  name,
  label,
  size,
  focused,
  inactiveColor,
  badge,
}: TabIconProps) {
  const focusedColor = "#9333EA";
  const iconColor = focused ? focusedColor : inactiveColor;

  return (
    <View style={styles.tabItem}>
      <View style={styles.iconContainer}>
        <Feather name={name} size={size} color={iconColor} />
        {badge !== undefined && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.tabLabel, { color: iconColor }]}>{label}</Text>
    </View>
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
  const { unreadCount } = useInbox();

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
          height: Platform.select({
            ios: 88,
            android: 70,
          }),
          paddingBottom: Platform.select({
            ios: 28,
            android: 8,
          }),
        },
        tabBarItemStyle: {
          paddingTop: 8,
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
            <TabIcon
              name="home"
              label="Home"
              size={size}
              focused={focused}
              inactiveColor={theme.tabIconDefault}
            />
          ),
        }}
      />
      <Tab.Screen
        name="ProjectsTab"
        component={ProjectsStackNavigator}
        options={{
          tabBarIcon: ({ focused, size }) => (
            <TabIcon
              name="folder"
              label="Proj"
              size={size}
              focused={focused}
              inactiveColor={theme.tabIconDefault}
            />
          ),
        }}
      />
      <Tab.Screen
        name="InboxTab"
        component={InboxStackNavigator}
        options={{
          tabBarIcon: ({ focused, size }) => (
            <TabIcon
              name="message-square"
              label="Inbox"
              size={size}
              focused={focused}
              inactiveColor={theme.tabIconDefault}
              badge={unreadCount}
            />
          ),
        }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsStackNavigator}
        options={{
          tabBarIcon: ({ focused, size }) => (
            <TabIcon
              name="bell"
              label="Alerts"
              size={size}
              focused={focused}
              inactiveColor={theme.tabIconDefault}
            />
          ),
        }}
      />
      <Tab.Screen
        name="ToolsTab"
        component={ToolsStackNavigator}
        options={{
          tabBarIcon: ({ focused, size }) => (
            <TabIcon
              name="grid"
              label="Tools"
              size={size}
              focused={focused}
              inactiveColor={theme.tabIconDefault}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 44,
    overflow: "visible",
  },
  iconContainer: {
    position: "relative",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: MessagingColors.unreadBadge,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
});
