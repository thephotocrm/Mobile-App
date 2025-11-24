import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ToolsScreen } from "@/screens/ToolsScreen";
import ContactsScreen from "@/screens/ContactsScreen";
import ContactDetailScreen from "@/screens/ContactDetailScreen";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { useTheme } from "@/hooks/useTheme";

export type ToolsStackParamList = {
  Tools: undefined;
  Contacts: undefined;
  ContactDetail: { contactId: string };
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
      <Stack.Screen 
        name="Contacts" 
        component={ContactsScreen}
        options={{
          title: "Contacts",
        }}
      />
      <Stack.Screen 
        name="ContactDetail" 
        component={ContactDetailScreen}
        options={{
          title: "Contact Details",
        }}
      />
    </Stack.Navigator>
  );
}
