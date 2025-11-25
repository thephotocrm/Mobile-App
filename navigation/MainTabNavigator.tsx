import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, StyleSheet, View } from "react-native";
import { HomeStackNavigator } from "@/navigation/HomeStackNavigator";
import ProjectsStackNavigator from "@/navigation/ProjectsStackNavigator";
import InboxStackNavigator from "@/navigation/InboxStackNavigator";
import { NotificationsStackNavigator } from "@/navigation/NotificationsStackNavigator";
import { ToolsStackNavigator } from "@/navigation/ToolsStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { GradientColors } from "@/constants/theme";

interface GradientIconProps {
  name: keyof typeof Feather.glyphMap;
  size: number;
  focused: boolean;
  inactiveColor: string;
}

function GradientIcon({ name, size, focused, inactiveColor }: GradientIconProps) {
  if (!focused) {
    return <Feather name={name} size={size} color={inactiveColor} />;
  }
  
  return (
    <View style={{ position: 'relative', width: size, height: size }}>
      <LinearGradient
        colors={GradientColors.journey as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ 
          position: 'absolute', 
          width: size, 
          height: size, 
          borderRadius: size / 2,
          opacity: 0.15,
        }}
      />
      <View style={{ position: 'absolute', width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <Feather name={name} size={size} color={GradientColors.journey[1]} />
      </View>
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

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundRoot,
          }),
          borderTopWidth: 1,
          borderTopColor: theme.border,
          elevation: 0,
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
          title: "Home",
          tabBarIcon: ({ focused, size }) => (
            <GradientIcon name="home" size={size} focused={focused} inactiveColor={theme.tabIconDefault} />
          ),
        }}
      />
      <Tab.Screen
        name="ProjectsTab"
        component={ProjectsStackNavigator}
        options={{
          title: "Projects",
          tabBarIcon: ({ focused, size }) => (
            <GradientIcon name="folder" size={size} focused={focused} inactiveColor={theme.tabIconDefault} />
          ),
        }}
      />
      <Tab.Screen
        name="InboxTab"
        component={InboxStackNavigator}
        options={{
          title: "Inbox",
          tabBarIcon: ({ focused }) => (
            <LinearGradient
              colors={GradientColors.primary as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.inboxButton,
                {
                  shadowColor: theme.primary,
                  borderColor: theme.border,
                },
              ]}
            >
              <Feather name="message-square" size={24} color="#FFFFFF" />
            </LinearGradient>
          ),
        }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsStackNavigator}
        options={{
          title: "Notifications",
          tabBarIcon: ({ focused, size }) => (
            <GradientIcon name="bell" size={size} focused={focused} inactiveColor={theme.tabIconDefault} />
          ),
        }}
      />
      <Tab.Screen
        name="ToolsTab"
        component={ToolsStackNavigator}
        options={{
          title: "Tools",
          tabBarIcon: ({ focused, size }) => (
            <GradientIcon name="grid" size={size} focused={focused} inactiveColor={theme.tabIconDefault} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  inboxButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
    borderWidth: 1,
    borderTopWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
