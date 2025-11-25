import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Typography, Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootNavigator";

interface MainHeaderProps {
  title: string;
  onSearchPress?: () => void;
}

export function MainHeader({ title, onSearchPress }: MainHeaderProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleAvatarPress = () => {
    navigation.navigate("Settings");
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
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face" }}
            style={styles.avatar}
            contentFit="cover"
          />
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
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
});
