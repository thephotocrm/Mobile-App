import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MoreScreen from '@/screens/MoreScreen';
import { getCommonScreenOptions } from './screenOptions';
import { HeaderTitle } from '@/components/HeaderTitle';
import { useTheme } from '@/hooks/useTheme';

export type MoreStackParamList = {
  MoreList: undefined;
};

const Stack = createNativeStackNavigator<MoreStackParamList>();

export default function MoreStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="MoreList"
        component={MoreScreen}
        options={{
          headerTitle: () => <HeaderTitle title="thePhotoCrm" />,
        }}
      />
    </Stack.Navigator>
  );
}
