import React from "react";
import { Pressable } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import ProjectsListScreen from "@/screens/ProjectsListScreen";
import ProjectDetailScreen from "@/screens/ProjectDetailScreen";
import { AddProjectScreen } from "@/screens/AddProjectScreen";
import {
  getMainScreenOptions,
  getCommonScreenOptions,
} from "@/navigation/screenOptions";
import { useTheme } from "@/hooks/useTheme";
import { ProjectType } from "@/services/api";

function BackButton() {
  const navigation = useNavigation();
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => navigation.goBack()}
      style={{ marginLeft: -8, padding: 8 }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Feather name="chevron-left" size={24} color={theme.text} />
    </Pressable>
  );
}

export type ProjectsStackParamList = {
  ProjectsList: { refresh?: number } | undefined;
  ProjectDetail: { projectId: string };
  AddProject: { projectType?: ProjectType } | undefined;
};

const Stack = createNativeStackNavigator<ProjectsStackParamList>();

export default function ProjectsStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="ProjectsList"
        component={ProjectsListScreen}
        options={getMainScreenOptions({
          theme,
          isDark,
          title: "Projects",
        })}
      />
      <Stack.Screen
        name="ProjectDetail"
        component={ProjectDetailScreen}
        options={{
          headerTitle: "Project Details",
          headerTransparent: false,
          headerStyle: {
            backgroundColor: theme.backgroundRoot,
          },
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="AddProject"
        component={AddProjectScreen}
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}
