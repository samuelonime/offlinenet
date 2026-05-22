import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import BundleManagerScreen from '../screens/BundleManagerScreen';
import BrowserScreen from '../screens/BrowserScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { COLORS } from '../utils/constants';

export type RootStackParamList = {
  Home: undefined;
  BundleManager: undefined;
  Browser: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.background,
          },
          headerTintColor: COLORS.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: COLORS.background,
          },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="BundleManager"
          component={BundleManagerScreen}
          options={{
            title: 'Bundle Manager',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="Browser"
          component={BrowserScreen}
          options={{
            headerShown: false,
            gestureEnabled: false,
            orientation: 'portrait_up',
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Settings',
            headerBackTitle: 'Back',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;