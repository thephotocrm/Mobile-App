import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ToolsScreen } from "@/screens/ToolsScreen";
import ContactsScreen from "@/screens/ContactsScreen";
import ContactDetailScreen from "@/screens/ContactDetailScreen";
import { CalendarScreen } from "@/screens/CalendarScreen";
import { AddEventScreen } from "@/screens/AddEventScreen";
import { AutomationsScreen } from "@/screens/AutomationsScreen";
import { AutomationDetailScreen } from "@/screens/AutomationDetailScreen";
import BookingDetailScreen from "@/screens/BookingDetailScreen";
import {
  getMainScreenOptions,
  getCommonScreenOptions,
} from "@/navigation/screenOptions";
import { useTheme } from "@/hooks/useTheme";
import { Automation } from "@/services/api";

export type ToolsStackParamList = {
  Tools: undefined;
  Contacts: undefined;
  ContactDetail: { contactId: string };
  Calendar: undefined;
  AddEvent: undefined;
  Automations: undefined;
  AutomationDetail: { automation: Automation };
  BookingDetail: { bookingId: string };
};

const Stack = createNativeStackNavigator<ToolsStackParamList>();

export function ToolsStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions({ theme, isDark })}>
      <Stack.Screen
        name="Tools"
        component={ToolsScreen}
        options={getMainScreenOptions({
          theme,
          isDark,
          title: "Tools",
        })}
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
      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: "Calendar",
        }}
      />
      <Stack.Screen
        name="AddEvent"
        component={AddEventScreen}
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="Automations"
        component={AutomationsScreen}
        options={{
          title: "Automations",
        }}
      />
      <Stack.Screen
        name="AutomationDetail"
        component={AutomationDetailScreen}
        options={{
          title: "Automation",
        }}
      />
      <Stack.Screen
        name="BookingDetail"
        component={BookingDetailScreen}
        options={{
          title: "Booking Details",
        }}
      />
    </Stack.Navigator>
  );
}
