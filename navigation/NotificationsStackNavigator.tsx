import React, { useMemo } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View } from "react-native";
import { NotificationsScreen, MOCK_NOTIFICATIONS } from "@/screens/NotificationsScreen";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Badge } from "@/components/Badge";
import { Typography } from "@/constants/theme";

export type NotificationsStackParamList = {
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<NotificationsStackParamList>();

function NotificationsHeader({ unreadCount }: { unreadCount: number }) {
  const { theme } = useTheme();
  
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <ThemedText style={[Typography.h4, { color: theme.text }]}>
        Notifications
      </ThemedText>
      {unreadCount > 0 && <Badge label={unreadCount.toString()} />}
    </View>
  );
}

export function NotificationsStackNavigator() {
  const { theme, isDark } = useTheme();
  const screenOptions = getCommonScreenOptions({ theme, isDark });
  
  const unreadCount = useMemo(() => {
    return MOCK_NOTIFICATIONS.filter((n) => !n.read).length;
  }, []);

  return (
    <Stack.Navigator
      screenOptions={screenOptions}
    >
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{
          headerTitle: () => <NotificationsHeader unreadCount={unreadCount} />,
        }}
      />
    </Stack.Navigator>
  );
}
