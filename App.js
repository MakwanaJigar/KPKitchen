import React, {useEffect} from 'react';

import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import AppNavigator from './src/navigation/AppNavigator';

import {AppAlertHost} from './src/components/AppAlert';

import {
  createNotificationChannel,
  flushPendingNotification,
  navigationRef,
  registerNotificationListeners,
} from './src/notifications/NotificationService';

const App = () => {
  /* =======================================================
   * Push Notifications
   * ======================================================= */

  useEffect(() => {
    createNotificationChannel().catch(() => {});

    const unsubscribe = registerNotificationListeners();

    return unsubscribe;
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer
        ref={navigationRef}
        onReady={flushPendingNotification}
        onStateChange={flushPendingNotification}>
        <AppNavigator />
        <AppAlertHost />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;
