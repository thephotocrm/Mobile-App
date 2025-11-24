import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import InboxScreen from '@/screens/InboxScreen';
import ThreadDetailScreen from '@/screens/ThreadDetailScreen';
import { getCommonScreenOptions } from './screenOptions';
import { HeaderTitle } from '@/components/HeaderTitle';
import { useTheme } from '@/hooks/useTheme';

export type InboxStackParamList = {
  InboxList: undefined;
  ThreadDetail: { conversationId: number; contactName: string };
};

const Stack = createNativeStackNavigator<InboxStackParamList>();

export default function InboxStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="InboxList"
        component={InboxScreen}
        options={{
          headerTitle: () => <HeaderTitle title="thePhotoCrm" />,
        }}
      />
      <Stack.Screen
        name="ThreadDetail"
        component={ThreadDetailScreen}
        options={({ route }) => ({
          headerTitle: route.params.contactName,
          headerTransparent: false,
        })}
      />
    </Stack.Navigator>
  );
}
