import React from "react";
import { View, StyleSheet, Pressable, Platform, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Typography, Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootNavigator";

interface MainHeaderProps {
  title: string;
  onSearchPress?: () => void;
}

export function MainHeader({ title, onSearchPress }: MainHeaderProps) {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleAvatarPress = () => {
    navigation.navigate("Settings");
  };

  // Get initials from email
  const getInitials = (): string => {
    if (!user?.email) return "?";
    const emailName = user.email.split("@")[0];
    const parts = emailName.split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return emailName.slice(0, 2).toUpperCase();
  };

  const headerContent = (
    <View style={[styles.headerContent, { paddingTop: insets.top }]}>
      <Pressable
        onPress={onSearchPress}
        style={styles.iconButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name="search" size={22} color={theme.text} />
      </Pressable>

      <ThemedText style={[Typography.h4, { color: theme.text }]}>
        {title}
      </ThemedText>

      <Pressable
        onPress={handleAvatarPress}
        style={styles.iconButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View
          style={[
            styles.avatarContainer,
            { backgroundColor: isDark ? "#404244" : "#E0DBD3" },
          ]}
        >
          <Text
            style={[styles.initials, { color: isDark ? "#9CA3AF" : "#6B7280" }]}
          >
            {getInitials()}
          </Text>
        </View>
      </Pressable>
    </View>
  );

  if (Platform.OS === "ios") {
    return (
      <BlurView
        intensity={100}
        tint={isDark ? "dark" : "light"}
        style={styles.header}
      >
        {headerContent}
      </BlurView>
    );
  }

  return (
    <View style={[styles.header, { backgroundColor: theme.backgroundRoot }]}>
      {headerContent}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingBottom: Spacing.sm,
    minHeight: 44,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
