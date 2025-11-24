import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, StyleSheet } from "react-native";
import { HomeScreen } from "@/screens/HomeScreen";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Feather } from "@expo/vector-icons";
import { Typography } from "@/constants/theme";

export type HomeStackParamList = {
  Home: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

function HomeHeader() {
  const { theme } = useTheme();
  
  return (
    <View style={styles.headerContainer}>
      <View style={[styles.iconBadge, { backgroundColor: theme.primary }]}>
        <Feather name="camera" size={20} color="#FFFFFF" />
      </View>
      <ThemedText style={[Typography.h4, { color: theme.text, marginLeft: 8 }]}>
        thePhotoCrm
      </ThemedText>
    </View>
  );
}

export function HomeStackNavigator() {
  const { theme, isDark } = useTheme();
  const screenOptions = getCommonScreenOptions({ theme, isDark });

  return (
    <Stack.Navigator
      screenOptions={screenOptions}
    >
      <Stack.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          headerTitle: () => <HomeHeader />,
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
