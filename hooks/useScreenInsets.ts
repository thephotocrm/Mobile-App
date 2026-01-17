import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { Spacing } from "@/constants/theme";

const CUSTOM_HEADER_CONTENT_HEIGHT = 44;

export function useScreenInsets() {
  const insets = useSafeAreaInsets();
  const nativeHeaderHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();

  // If using custom header (nativeHeaderHeight is 0), calculate it manually
  const headerHeight =
    nativeHeaderHeight > 0
      ? nativeHeaderHeight
      : insets.top + CUSTOM_HEADER_CONTENT_HEIGHT + Spacing.sm;

  return {
    paddingTop: headerHeight + Spacing.md,
    paddingBottom: tabBarHeight + Spacing.xl,
    scrollInsetBottom: insets.bottom + 16,
  };
}
