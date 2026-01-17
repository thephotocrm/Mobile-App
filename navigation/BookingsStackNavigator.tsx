import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BookingsScreen from "@/screens/BookingsScreen";
import BookingDetailScreen from "@/screens/BookingDetailScreen";
import { getCommonScreenOptions } from "./screenOptions";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";

export type BookingsStackParamList = {
  BookingsList: undefined;
  BookingDetail: { bookingId: string };
};

const Stack = createNativeStackNavigator<BookingsStackParamList>();

export default function BookingsStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="BookingsList"
        component={BookingsScreen}
        options={{
          headerTitle: () => <HeaderTitle title="thePhotoCrm" />,
        }}
      />
      <Stack.Screen
        name="BookingDetail"
        component={BookingDetailScreen}
        options={{
          headerTitle: "Booking Details",
          headerTransparent: false,
        }}
      />
    </Stack.Navigator>
  );
}
