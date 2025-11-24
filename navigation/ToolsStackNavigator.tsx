import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ToolsScreen } from "@/screens/ToolsScreen";

export type ToolsStackParamList = {
  Tools: undefined;
};

const Stack = createNativeStackNavigator<ToolsStackParamList>();

export function ToolsStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="Tools" 
        component={ToolsScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
