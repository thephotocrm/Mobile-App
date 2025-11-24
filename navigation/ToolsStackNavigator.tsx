import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ToolsScreen } from "@/screens/ToolsScreen";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { useTheme } from "@/hooks/useTheme";

export type ToolsStackParamList = {
  Tools: undefined;
};

const Stack = createNativeStackNavigator<ToolsStackParamList>();

export function ToolsStackNavigator() {
  const { theme, isDark } = useTheme();
  const screenOptions = getCommonScreenOptions({ theme, isDark });

  return (
    <Stack.Navigator
      screenOptions={screenOptions}
    >
      <Stack.Screen 
        name="Tools" 
        component={ToolsScreen}
        options={{
          title: "Tools",
        }}
      />
    </Stack.Navigator>
  );
}
