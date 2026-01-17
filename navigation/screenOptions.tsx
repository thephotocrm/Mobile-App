import React from "react";
import { Platform } from "react-native";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { MainHeader } from "@/components/MainHeader";

interface ScreenOptionsParams {
  theme: {
    backgroundRoot: string;
    text: string;
  };
  isDark: boolean;
  transparent?: boolean;
}

export const getCommonScreenOptions = ({
  theme,
  isDark,
  transparent = true,
}: ScreenOptionsParams): NativeStackNavigationOptions => ({
  headerTitleAlign: "center",
  headerTransparent: transparent,
  headerBlurEffect: transparent ? undefined : isDark ? "dark" : "light",
  headerTintColor: theme.text,
  headerShadowVisible: false,
  headerStyle: {
    backgroundColor: transparent
      ? "transparent"
      : Platform.select({
          ios: undefined,
          android: theme.backgroundRoot,
        }),
  },
  gestureEnabled: true,
  gestureDirection: "horizontal",
  fullScreenGestureEnabled: isLiquidGlassAvailable() ? false : true,
  contentStyle: {
    backgroundColor: theme.backgroundRoot,
  },
});

interface MainScreenOptionsParams {
  theme: {
    backgroundRoot: string;
    text: string;
  };
  isDark: boolean;
  title: string;
  onSearchPress?: () => void;
}

export const getMainScreenOptions = ({
  theme,
  isDark,
  title,
  onSearchPress,
}: MainScreenOptionsParams): NativeStackNavigationOptions => ({
  headerTransparent: true,
  headerShadowVisible: false,
  gestureEnabled: true,
  gestureDirection: "horizontal",
  fullScreenGestureEnabled: isLiquidGlassAvailable() ? false : true,
  contentStyle: {
    backgroundColor: theme.backgroundRoot,
  },
  header: function CustomHeader() {
    return <MainHeader title={title} onSearchPress={onSearchPress} />;
  },
});
