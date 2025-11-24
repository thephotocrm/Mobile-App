import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProjectsListScreen from '@/screens/ProjectsListScreen';
import ProjectDetailScreen from '@/screens/ProjectDetailScreen';
import { getCommonScreenOptions } from './screenOptions';
import { HeaderTitle } from '@/components/HeaderTitle';
import { useTheme } from '@/hooks/useTheme';

export type ProjectsStackParamList = {
  ProjectsList: undefined;
  ProjectDetail: { projectId: string };
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
        options={{
          headerTitle: () => <HeaderTitle title="thePhotoCrm" />,
        }}
      />
      <Stack.Screen
        name="ProjectDetail"
        component={ProjectDetailScreen}
        options={{
          headerTitle: 'Project Details',
          headerTransparent: false,
          headerStyle: {
            backgroundColor: theme.backgroundRoot,
          },
        }}
      />
    </Stack.Navigator>
  );
}
