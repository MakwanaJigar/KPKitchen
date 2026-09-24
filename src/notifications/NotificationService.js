import { PermissionsAndroid, Platform } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createNavigationContainerRef,
} from '@react-navigation/native';

import {
  deleteToken,
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
} from '@react-native-firebase/messaging';

import notifee, {
  AndroidImportance,
  EventType,
} from '@notifee/react-native';

/* =========================================================
 * CONFIG
 * ========================================================= */

/*
 * Saves the device FCM token for the logged-in driver so the
 * backend can send push notifications to this device.
 */
const SAVE_FCM_TOKEN_API =
  'https://replete-software.com/projects/kp_admin/api/driver/fcm-token';

/*
 * Same key LoginScreen saves the driver token under.
 * Kept as a literal to avoid a circular import with LoginScreen.
 */
const AUTH_TOKEN_KEY = '@kp_kitchen_driver_token';

/*
 * Must match "messaging_android_notification_channel_id"
 * in firebase.json.
 */
export const CHANNEL_ID = 'kp_driver_orders';

const FCM_TOKEN_STORAGE_KEY = '@kp_kitchen_driver_fcm_token';

/* =========================================================
 * NAVIGATION
 * ========================================================= */

export const navigationRef = createNavigationContainerRef();

let pendingNotificationData = null;

/*
 * Backend can send data.screen = one of these routes.
 * Anything else opens the Notification screen.
 */
const ALLOWED_SCREENS = ['Notification', 'OrderDetail', 'MainTabs'];

/*
 * While on these screens the driver is not logged in yet
 * (Splash replaces itself with Login), so hold the tap until
 * they reach the main app.
 */
const AUTH_SCREENS = [
  'Splash',
  'Login',
  'Register',
  'ForgotPassword',
  'Otp',
  'ResetPassword',
];

const openFromNotification = data => {
  if (!data) {
    return;
  }

  if (
    !navigationRef.isReady() ||
    AUTH_SCREENS.includes(navigationRef.getCurrentRoute()?.name)
  ) {
    pendingNotificationData = data;

    return;
  }

  let screen = ALLOWED_SCREENS.includes(data?.screen)
    ? data.screen
    : 'Notification';

  // OrderDetail cannot load without an order id.
  const orderId = data?.order_id ?? data?.orderId;

  if (screen === 'OrderDetail' && !orderId) {
    screen = 'Notification';
  }

  navigationRef.navigate(screen, { ...data, orderId });
};

/*
 * Call from NavigationContainer onReady / onStateChange so a tap
 * that launched the app from killed state navigates once the
 * driver is logged in.
 */
export const flushPendingNotification = () => {
  if (pendingNotificationData) {
    const data = pendingNotificationData;

    pendingNotificationData = null;

    openFromNotification(data);
  }
};

/* =========================================================
 * CHANNEL / DISPLAY
 * ========================================================= */

export const createNotificationChannel = async () => {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Delivery Updates',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
};

export const displayRemoteMessage = async remoteMessage => {
  const title =
    remoteMessage?.notification?.title ?? remoteMessage?.data?.title;

  const body = remoteMessage?.notification?.body ?? remoteMessage?.data?.body;

  if (!title && !body) {
    return;
  }

  await createNotificationChannel();

  await notifee.displayNotification({
    title: title ?? "KP's Kitchen Driver",
    body: body ?? '',
    data: remoteMessage?.data ?? {},
    android: {
      channelId: CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      pressAction: {
        id: 'default',
      },
    },
  });
};

/* =========================================================
 * PERMISSION
 * ========================================================= */

export const requestNotificationPermission = async () => {
  if (Platform.OS !== 'android') {
    return false;
  }

  if (Platform.Version < 33) {
    return true;
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  );

  return result === PermissionsAndroid.RESULTS.GRANTED;
};

/* =========================================================
 * TOKEN
 * ========================================================= */

const sendTokenToBackend = async fcmToken => {
  console.log('FCM TOKEN:', fcmToken);

  await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, fcmToken);

  const authToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

  if (!authToken) {
    return;
  }

  try {
    const response = await fetch(SAVE_FCM_TOKEN_API, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        fcm_token: fcmToken,
        device_type: Platform.OS,
      }),
    });

    const result = await response.json().catch(() => null);

    console.log('SAVE FCM TOKEN STATUS:', response.status, result);
  } catch (error) {
    console.log('SAVE FCM TOKEN ERROR:', error);
  }
};

/*
 * Call after login and on app start when logged in.
 */
export const syncFcmToken = async () => {
  try {
    const granted = await requestNotificationPermission();

    if (!granted) {
      console.log('NOTIFICATION PERMISSION DENIED');

      return;
    }

    await createNotificationChannel();

    const fcmToken = await getToken(getMessaging());

    if (fcmToken) {
      await sendTokenToBackend(fcmToken);
    }
  } catch (error) {
    console.log('FCM TOKEN ERROR:', error);
  }
};

/*
 * Call on logout so this device stops receiving
 * the previous driver's notifications.
 */
export const removeFcmToken = async () => {
  try {
    await deleteToken(getMessaging());

    await AsyncStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
  } catch (error) {
    console.log('DELETE FCM TOKEN ERROR:', error);
  }
};

/* =========================================================
 * LISTENERS (app running)
 * ========================================================= */

/*
 * Returns an unsubscribe function.
 */
export const registerNotificationListeners = () => {
  const messaging = getMessaging();

  // Foreground: FCM does not show a notification, so show it with Notifee.
  const unsubscribeMessage = onMessage(messaging, async remoteMessage => {
    console.log('FOREGROUND NOTIFICATION:', remoteMessage);

    await displayRemoteMessage(remoteMessage);
  });

  // Tap on a Notifee notification while app is open.
  const unsubscribeNotifee = notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) {
      openFromNotification(detail?.notification?.data);
    }
  });

  // Tap on an FCM notification while app was in background.
  const unsubscribeOpened = onNotificationOpenedApp(
    messaging,
    remoteMessage => {
      openFromNotification(remoteMessage?.data);
    },
  );

  const unsubscribeRefresh = onTokenRefresh(messaging, async fcmToken => {
    const authToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

    if (authToken) {
      await sendTokenToBackend(fcmToken);
    }
  });

  // Tap that launched the app from killed state.
  getInitialNotification(messaging)
    .then(remoteMessage => {
      if (remoteMessage) {
        openFromNotification(remoteMessage?.data);
      }
    })
    .catch(() => {});

  notifee
    .getInitialNotification()
    .then(initial => {
      if (initial) {
        openFromNotification(initial?.notification?.data);
      }
    })
    .catch(() => {});

  return () => {
    unsubscribeMessage();
    unsubscribeNotifee();
    unsubscribeOpened();
    unsubscribeRefresh();
  };
};
