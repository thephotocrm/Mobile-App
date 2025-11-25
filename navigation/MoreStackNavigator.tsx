import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MoreScreen from '@/screens/MoreScreen';
import { getMainScreenOptions, getCommonScreenOptions } from '@/navigation/screenOptions';
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
        options={getMainScreenOptions({
          theme,
          isDark,
          title: "More",
        })}
      />
    </Stack.Navigator>
  );
}
