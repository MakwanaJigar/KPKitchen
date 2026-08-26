import React from 'react';

import {createNativeStackNavigator} from '@react-navigation/native-stack';

import SplashScreen from '../screens/Splash';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

import BottomTabNavigator from './BottomTabNavigator';

import NotificationScreen from '../screens/NotificationScreen';
import OrderDetailScreen from '../screens/OrderDetail';
import HomeScreen from '../screens/HomeScreen';
import Otp from '../screens/Otp';
import ResetPassword from '../screens/ResetPassword';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}>
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
        options={{
          animation: 'none',
        }}
      />

      <Stack.Screen
        name="Login"
        component={LoginScreen}
      />

      <Stack.Screen
        name="Register"
        component={RegisterScreen}
      />

      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
      />

      <Stack.Screen
        name="MainTabs"
        component={BottomTabNavigator}
      />

      <Stack.Screen
        name="Notification"
        component={NotificationScreen}
      />

      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
      />

      <Stack.Screen
        name="HomeScreen"
        component={HomeScreen}
      />

      <Stack.Screen
        name="Otp"
        component={Otp}
      />

      <Stack.Screen
        name="ResetPassword"
        component={ResetPassword}
      />
      
    </Stack.Navigator>
  );
};

export default AppNavigator;