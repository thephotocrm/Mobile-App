import React from "react";
import { Platform } from "react-native";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { HeaderAvatar } from "@/components/HeaderAvatar";
import { HeaderSearchIcon } from "@/components/HeaderSearchIcon";
import { ThemedText } from "@/components/ThemedText";
import { Typography } from "@/constants/theme";

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
  headerBlurEffect: transparent ? undefined : (isDark ? "dark" : "light"),
  headerTintColor: theme.text,
  headerShadowVisible: false,
  headerStyle: {
    backgroundColor: transparent ? "transparent" : Platform.select({
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
  onAvatarPress?: () => void;
}

export const getMainScreenOptions = ({
  theme,
  isDark,
  title,
  onSearchPress,
  onAvatarPress,
}: MainScreenOptionsParams): NativeStackNavigationOptions => ({
  ...getCommonScreenOptions({ theme, isDark }),
  headerTitle: () => (
    <ThemedText style={[Typography.h4, { color: theme.text }]}>
      {title}
    </ThemedText>
  ),
  headerLeft: () => <HeaderSearchIcon onPress={onSearchPress} />,
  headerLeftContainerStyle: {
    backgroundColor: "transparent",
  },
  headerRight: () => <HeaderAvatar onPress={onAvatarPress} />,
  headerRightContainerStyle: {
    backgroundColor: "transparent",
  },
});
