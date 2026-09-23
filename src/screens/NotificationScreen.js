import React, { useCallback, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { useFocusEffect } from '@react-navigation/native';

import AsyncStorage from '@react-native-async-storage/async-storage';

/* =========================================================
 * DRIVER NOTIFICATION REST API
 * ========================================================= */

const DRIVER_NOTIFICATIONS_API =
  'https://replete-software.com/projects/kp_admin/api/driver/notifications';

/* =========================================================
 * DRIVER TOKEN KEYS
 * ========================================================= */

const DRIVER_TOKEN_KEYS = [
  'driver_token',
  '@kp_driver_token',
  'kp_driver_token',
  '@kp_kitchen_driver_token',
  'driverToken',
  'auth_token',
  'access_token',
  'token',
];

/* =========================================================
 * HELPERS
 * ========================================================= */

const firstValue = (...values) => {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return value;
    }
  }

  return null;
};

/* =========================================================
 * GET DRIVER AUTH TOKEN
 * ========================================================= */

const getDriverToken = async () => {
  for (const key of DRIVER_TOKEN_KEYS) {
    try {
      const value = await AsyncStorage.getItem(key);

      if (value && String(value).trim()) {
        console.log('DRIVER TOKEN FOUND WITH KEY:', key);

        return String(value).trim();
      }
    } catch (error) {
      console.log('DRIVER TOKEN READ ERROR:', key, error);
    }
  }

  return null;
};

/* =========================================================
 * EXTRACT NOTIFICATION ARRAY
 * ========================================================= */

const extractNotificationsArray = result => {
  const candidates = [
    result,
    result?.data,
    result?.notifications,
    result?.data?.notifications,
    result?.data?.data,
    result?.notifications?.data,
    result?.data?.notifications?.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
};

/* =========================================================
 * DATE HELPERS
 * ========================================================= */

const safeDate = value => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const startOfDay = date => {
  const value = new Date(date.getTime());

  value.setHours(0, 0, 0, 0);

  return value;
};

/* =========================================================
 * RELATIVE TIME
 * ========================================================= */

const getRelativeTime = value => {
  const date = safeDate(value);

  if (!date) {
    return '';
  }

  const now = new Date();

  const difference = Math.max(0, now.getTime() - date.getTime());

  const minutes = Math.floor(difference / 60000);

  const hours = Math.floor(minutes / 60);

  const days = Math.floor(hours / 24);

  if (minutes < 1) {
    return 'now';
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  if (hours < 24) {
    return `${hours}h`;
  }

  if (days < 7) {
    return `${days}d`;
  }

  return date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
  });
};

const getFullRelativeTime = value => {
  const date = safeDate(value);

  if (!date) {
    return '';
  }

  const now = new Date();

  const difference = Math.max(0, now.getTime() - date.getTime());

  const minutes = Math.floor(difference / 60000);

  const hours = Math.floor(minutes / 60);

  const days = Math.floor(hours / 24);

  if (minutes < 1) {
    return 'Just now';
  }

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  if (days === 1) {
    return 'Yesterday';
  }

  if (days < 7) {
    return `${days} days ago`;
  }

  return date.toLocaleString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/* =========================================================
 * INITIALS
 * ========================================================= */

const getInitials = name => {
  const text = String(name ?? '').trim();

  if (!text) {
    return 'KP';
  }

  const words = text.split(/\s+/).filter(Boolean);

  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

/* =========================================================
 * READ / UNREAD
 * ========================================================= */

const isUnreadNotification = item => {
  if (item?.read_at) {
    return false;
  }

  const isRead = firstValue(item?.is_read, item?.isRead, item?.read);

  if (isRead === true || isRead === 1 || isRead === '1') {
    return false;
  }

  const unread = firstValue(item?.unread, item?.is_unread, item?.isUnread);

  if (unread === false || unread === 0 || unread === '0') {
    return false;
  }

  return true;
};

/* =========================================================
 * NOTIFICATION ICON
 * ========================================================= */

const getNotificationIcon = value => {
  const type = String(value ?? '').toLowerCase();

  if (type.includes('order')) {
    return '▣';
  }

  if (type.includes('delivery') || type.includes('delivered')) {
    return '✓';
  }

  if (type.includes('assign')) {
    return '→';
  }

  if (type.includes('payment')) {
    return '$';
  }

  if (type.includes('alert') || type.includes('warning')) {
    return '!';
  }

  return '•';
};

/* =========================================================
 * NORMALIZE BACKEND NOTIFICATION
 * ========================================================= */

const normalizeDriverNotification = (item, index = 0) => {
  const data =
    item?.data && typeof item.data === 'object' && !Array.isArray(item.data)
      ? item.data
      : {};

  const heading = String(
    firstValue(
      item?.title,
      item?.heading,
      item?.subject,
      item?.notification_title,
      item?.notificationTitle,
      data?.title,
      data?.heading,
      data?.subject,
      'Driver Notification',
    ),
  );

  const message = String(
    firstValue(
      item?.message,
      item?.body,
      item?.description,
      item?.notification_message,
      item?.notificationMessage,
      data?.message,
      data?.body,
      data?.description,
      '',
    ),
  );

  const fullMessage = String(
    firstValue(
      item?.full_message,
      item?.fullMessage,
      item?.description,
      item?.message,
      item?.body,
      data?.full_message,
      data?.description,
      data?.message,
      data?.body,
      message,
    ),
  );

  const createdAt = firstValue(
    item?.created_at,
    item?.createdAt,
    item?.sent_at,
    item?.sentAt,
    item?.date,
    item?.timestamp,
    data?.created_at,
    data?.createdAt,
    new Date().toISOString(),
  );

  const senderName = String(
    firstValue(
      item?.sender_name,
      item?.senderName,
      item?.name,
      item?.from,
      item?.admin_name,
      item?.customer_name,
      data?.sender_name,
      data?.name,
      data?.customer_name,
      "KP's Kitchen",
    ),
  );

  const notificationType = String(
    firstValue(
      item?.type,
      item?.notification_type,
      item?.notificationType,
      data?.type,
      'system',
    ),
  )
    .trim()
    .toLowerCase();

  const personType =
    notificationType.includes('message') ||
    notificationType.includes('chat') ||
    notificationType.includes('person');

  return {
    id: String(
      firstValue(
        item?.id,
        item?.notification_id,
        item?.notificationId,
        data?.notification_id,
        data?.id,
        `${Date.now()}-${index}`,
      ),
    ),

    type: personType ? 'person' : 'system',

    name: senderName,

    heading,

    message,

    fullMessage,

    createdAt,

    time: getRelativeTime(createdAt),

    fullTime: getFullRelativeTime(createdAt),

    initials: getInitials(senderName),

    icon: getNotificationIcon(notificationType),

    unread: isUnreadNotification(item),

    raw: item,
  };
};

/* =========================================================
 * GROUP NOTIFICATIONS
 * ========================================================= */

const groupNotifications = list => {
  const sorted = [...list].sort(
    (first, second) =>
      (safeDate(second?.createdAt)?.getTime() ?? 0) -
      (safeDate(first?.createdAt)?.getTime() ?? 0),
  );

  const today = startOfDay(new Date());

  const yesterday = new Date(today.getTime());

  yesterday.setDate(yesterday.getDate() - 1);

  const todayItems = [];
  const yesterdayItems = [];
  const earlierItems = [];

  sorted.forEach(item => {
    const date = safeDate(item.createdAt);

    if (!date) {
      earlierItems.push(item);

      return;
    }

    const itemDate = startOfDay(date);

    if (itemDate.getTime() === today.getTime()) {
      todayItems.push(item);
    } else if (itemDate.getTime() === yesterday.getTime()) {
      yesterdayItems.push(item);
    } else {
      earlierItems.push(item);
    }
  });

  const sections = [];

  if (todayItems.length > 0) {
    sections.push({
      title: 'Today',
      data: todayItems,
    });
  }

  if (yesterdayItems.length > 0) {
    sections.push({
      title: 'Yesterday',
      data: yesterdayItems,
    });
  }

  if (earlierItems.length > 0) {
    sections.push({
      title: 'Earlier',
      data: earlierItems,
    });
  }

  return sections;
};

/* =========================================================
 * COMPONENT
 * ========================================================= */

const NotificationScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();

  const [notifications, setNotifications] = useState([]);

  const [selectedNotification, setSelectedNotification] = useState(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState('');

  /* =======================================================
   * RESPONSIVE
   * ======================================================= */

  const isSmallScreen = width <= 360;

  const isTablet = width >= 700;

  const pageWidth = isTablet ? Math.min(width, 760) : width;

  const horizontalPadding = isSmallScreen ? 12 : isTablet ? 24 : 16;

  const avatarSize = isSmallScreen ? 43 : 48;

  /* =======================================================
   * FETCH NOTIFICATIONS
   * ======================================================= */

  const fetchNotifications = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError('');

      const token = await getDriverToken();

      if (!token) {
        throw new Error('Driver login token not found. Please login again.');
      }

      console.log('FETCHING DRIVER NOTIFICATIONS...');

      const response = await fetch(
        `${DRIVER_NOTIFICATIONS_API}?_=${Date.now()}`,
        {
          method: 'GET',

          headers: {
            Accept: 'application/json',

            Authorization: `Bearer ${token}`,
          },
        },
      );

      const responseText = await response.text();

      let result = {};

      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.log('DRIVER NOTIFICATION RAW:', responseText);

        throw new Error(
          'The notification server returned an invalid response.',
        );
      }

      console.log('DRIVER NOTIFICATION STATUS:', response.status);

      console.log(
        'DRIVER NOTIFICATION RESPONSE:',
        JSON.stringify(result, null, 2),
      );

      if (response.status === 401) {
        throw new Error(
          result?.message ?? 'Your driver login session has expired.',
        );
      }

      if (!response.ok) {
        throw new Error(
          result?.message ??
            result?.error ??
            'Unable to load driver notifications.',
        );
      }

      if (result?.success === false) {
        throw new Error(
          result?.message ?? 'Unable to load driver notifications.',
        );
      }

      const rawNotifications = extractNotificationsArray(result);

      const normalized = rawNotifications.map((item, index) =>
        normalizeDriverNotification(item, index),
      );

      setNotifications(groupNotifications(normalized));
    } catch (fetchError) {
      console.log('DRIVER NOTIFICATION ERROR:', fetchError);

      setError(fetchError?.message ?? 'Unable to load notifications.');
    } finally {
      setLoading(false);

      setRefreshing(false);
    }
  }, []);

  /* =======================================================
   * LOAD WHEN SCREEN OPENS
   * ======================================================= */

  useFocusEffect(
    useCallback(() => {
      fetchNotifications(true);

      return () => {};
    }, [fetchNotifications]),
  );

  /* =======================================================
   * REFRESH
   * ======================================================= */

  const onRefresh = () => {
    setRefreshing(true);

    fetchNotifications(false);
  };

  /* =======================================================
   * COUNTS
   * ======================================================= */

  const unreadCount = useMemo(
    () =>
      notifications.reduce(
        (total, section) =>
          total + section.data.filter(item => item.unread).length,
        0,
      ),
    [notifications],
  );

  const totalNotifications = useMemo(
    () =>
      notifications.reduce((total, section) => total + section.data.length, 0),
    [notifications],
  );

  /* =======================================================
   * MARK READ LOCALLY
   * ======================================================= */

  const markNotificationAsRead = notificationId => {
    setNotifications(previous =>
      previous.map(section => ({
        ...section,

        data: section.data.map(notification =>
          String(notification.id) === String(notificationId)
            ? {
                ...notification,

                unread: false,
              }
            : notification,
        ),
      })),
    );
  };

  const markAllAsRead = () => {
    setNotifications(previous =>
      previous.map(section => ({
        ...section,

        data: section.data.map(notification => ({
          ...notification,

          unread: false,
        })),
      })),
    );
  };

  /* =======================================================
   * DETAILS MODAL
   * ======================================================= */

  const openNotificationPopup = notification => {
    markNotificationAsRead(notification.id);

    setSelectedNotification({
      ...notification,

      unread: false,
    });
  };

  const closeNotificationPopup = () => {
    setSelectedNotification(null);
  };

  /* =======================================================
   * AVATAR
   * ======================================================= */

  const renderAvatar = (notification, size = avatarSize) => {
    if (notification.type === 'person') {
      return (
        <View
          style={[
            styles.avatar,

            {
              width: size,

              height: size,

              borderRadius: size >= 60 ? 18 : 14,
            },
          ]}
        >
          <Text
            style={[
              styles.avatarInitials,

              {
                fontSize: size >= 60 ? 19 : 13,
              },
            ]}
          >
            {notification.initials}
          </Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.systemIconContainer,

          {
            width: size,

            height: size,

            borderRadius: size >= 60 ? 18 : 14,
          },
        ]}
      >
        <Text
          style={[
            styles.systemIcon,

            {
              fontSize: size >= 60 ? 25 : 18,
            },
          ]}
        >
          {notification.icon}
        </Text>
      </View>
    );
  };

  /* =======================================================
   * RENDER NOTIFICATION
   * ======================================================= */

  const renderNotification = ({ item }) => (
    <Pressable
      onPress={() => openNotificationPopup(item)}
      style={({ pressed }) => [
        styles.notificationCard,

        item.unread && styles.unreadNotificationCard,

        pressed && styles.notificationPressed,
      ]}
    >
      {item.unread && <View style={styles.unreadAccent} />}

      {renderAvatar(item)}

      <View style={styles.notificationContent}>
        <View style={styles.notificationTopRow}>
          <View style={styles.notificationNameArea}>
            <Text numberOfLines={1} style={styles.notificationName}>
              {item.name}
            </Text>

            {item.unread && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
          </View>

          <Text style={styles.notificationTime}>{item.time}</Text>
        </View>

        {!!item.heading && (
          <Text numberOfLines={1} style={styles.notificationHeading}>
            {item.heading}
          </Text>
        )}

        <Text
          numberOfLines={2}
          ellipsizeMode="tail"
          style={styles.notificationMessage}
        >
          {item.message}
        </Text>
      </View>

      <Text style={styles.notificationArrow}>›</Text>
    </Pressable>
  );

  /* =======================================================
   * SECTION HEADER
   * ======================================================= */

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>

      <View style={styles.sectionLine} />
    </View>
  );

  /* =======================================================
   * LOADING
   * ======================================================= */

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#a9090d" />

        <View style={styles.loadingScreen}>
          <ActivityIndicator size="large" color="#a9090d" />

          <Text style={styles.loadingTitle}>Loading Notifications</Text>

          <Text style={styles.loadingSubtitle}>
            Fetching your latest driver updates...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* =======================================================
   * UI
   * ======================================================= */

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#a9090d" />

      <View style={styles.screen}>
        {/* HEADER */}

        <View style={styles.header}>
          <View pointerEvents="none" style={styles.headerCircleOne} />

          <View pointerEvents="none" style={styles.headerCircleTwo} />

          <View style={styles.headerTopRow}>
            <Pressable
              onPress={() => {
                if (navigation?.canGoBack?.()) {
                  navigation.goBack();
                }
              }}
              hitSlop={10}
              style={({ pressed }) => [
                styles.backButton,

                pressed && styles.headerPressed,
              ]}
            >
              <Image
                source={require('../assets/login-icons/back.png')}
                style={styles.backIcon}
                resizeMode="contain"
              />
            </Pressable>

            <View style={styles.headerTitleArea}>
              <Text style={styles.headerEyebrow}>KP'S KITCHEN</Text>

              <Text style={styles.headerTitle}>Notifications</Text>
            </View>

            <View style={styles.headerStatusBadge}>
              <View style={styles.headerStatusDot} />

              <Text style={styles.headerStatusText}>
                {unreadCount > 0 ? `${unreadCount} NEW` : 'ALL READ'}
              </Text>
            </View>
          </View>

          <View style={styles.headerSummaryArea}>
            <View
              style={{
                flex: 1,
                paddingRight: 10,
              }}
            >
              <Text style={styles.headerSummaryLabel}>
                DRIVER NOTIFICATION CENTRE
              </Text>

              <Text
                style={[
                  styles.headerSummaryTitle,

                  isSmallScreen && styles.headerSummaryTitleSmall,
                ]}
              >
                {unreadCount > 0
                  ? `${unreadCount} unread notification${
                      unreadCount === 1 ? '' : 's'
                    }`
                  : 'You are all caught up'}
              </Text>

              <Text style={styles.headerSummarySubtext}>
                {totalNotifications} total notifications
              </Text>
            </View>

            {unreadCount > 0 && (
              <Pressable
                onPress={markAllAsRead}
                style={({ pressed }) => [
                  styles.markAllButton,

                  pressed && styles.markAllButtonPressed,
                ]}
              >
                <Text style={styles.markAllText}>✓</Text>

                <Text style={styles.markAllLabel}>Mark all read</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* LIST */}

        <View
          style={[
            styles.pageContainer,

            {
              maxWidth: pageWidth,
            },
          ]}
        >
          <SectionList
            sections={notifications}
            keyExtractor={item => String(item.id)}
            renderItem={renderNotification}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#a9090d"
                colors={['#a9090d']}
              />
            }
            contentContainerStyle={[
              styles.listContent,

              {
                paddingHorizontal: horizontalPadding,
              },
            ]}
            ListHeaderComponent={
              totalNotifications > 0 ? (
                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <View>
                      <Text style={styles.summaryTitle}>Activity Overview</Text>

                      <Text style={styles.summarySubtitle}>
                        Driver updates and alerts
                      </Text>
                    </View>

                    <View style={styles.summaryBell}>
                      <Text style={styles.summaryBellText}>!</Text>
                    </View>
                  </View>

                  <View style={styles.summaryGrid}>
                    <View style={styles.summaryMiniCard}>
                      <Text style={styles.summaryMiniLabel}>UNREAD</Text>

                      <Text style={styles.summaryMiniValue}>{unreadCount}</Text>
                    </View>

                    <View style={styles.summaryMiniCard}>
                      <Text style={styles.summaryMiniLabel}>TOTAL</Text>

                      <Text style={styles.summaryMiniValue}>
                        {totalNotifications}
                      </Text>
                    </View>

                    <View style={styles.summaryMiniCard}>
                      <Text style={styles.summaryMiniLabel}>READ</Text>

                      <Text style={styles.summaryMiniValue}>
                        {totalNotifications - unreadCount}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIcon}>
                  <Text style={styles.emptyStateIconText}>
                    {error ? '!' : '✓'}
                  </Text>
                </View>

                <Text style={styles.emptyStateTitle}>
                  {error ? 'Unable to Load Notifications' : 'No Notifications'}
                </Text>

                <Text style={styles.emptyStateText}>
                  {error
                    ? error
                    : 'You do not have any driver notifications yet.'}
                </Text>

                {!!error && (
                  <Pressable
                    onPress={() => fetchNotifications(true)}
                    style={styles.retryButton}
                  >
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </Pressable>
                )}
              </View>
            }
          />
        </View>
      </View>

      {/* DETAILS MODAL */}

      <Modal
        visible={Boolean(selectedNotification)}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={closeNotificationPopup}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={closeNotificationPopup}
          />

          {selectedNotification && (
            <View
              style={[
                styles.popupCard,

                {
                  maxWidth: isTablet ? 460 : 390,
                },
              ]}
            >
              <View style={styles.popupHeader}>
                <Pressable
                  onPress={closeNotificationPopup}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>×</Text>
                </Pressable>

                <View style={styles.popupAvatar}>
                  {renderAvatar(selectedNotification, 68)}
                </View>

                <Text style={styles.popupEyebrow}>DRIVER NOTIFICATION</Text>

                <Text style={styles.popupName}>
                  {selectedNotification.name}
                </Text>

                <Text style={styles.popupTime}>
                  {selectedNotification.fullTime || selectedNotification.time}
                </Text>
              </View>

              <View style={styles.popupContent}>
                <View style={styles.popupMessageCard}>
                  <Text style={styles.popupMessageLabel}>
                    NOTIFICATION DETAILS
                  </Text>

                  <Text style={styles.popupHeading}>
                    {selectedNotification.heading || 'Driver Notification'}
                  </Text>

                  <ScrollView
                    style={styles.popupMessageScroll}
                    contentContainerStyle={styles.popupMessageScrollContent}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                  >
                    <Text selectable style={styles.popupMessage}>
                      {String(
                        selectedNotification.fullMessage ||
                          selectedNotification.message ||
                          selectedNotification.raw?.message ||
                          selectedNotification.raw?.body ||
                          selectedNotification.raw?.description ||
                          selectedNotification.raw?.notification_message ||
                          selectedNotification.raw?.notificationMessage ||
                          selectedNotification.raw?.data?.full_message ||
                          selectedNotification.raw?.data?.message ||
                          selectedNotification.raw?.data?.body ||
                          selectedNotification.raw?.data?.description ||
                          'No notification details available.',
                      )}
                    </Text>
                  </ScrollView>
                </View>

                <Pressable
                  onPress={closeNotificationPopup}
                  style={styles.popupButton}
                >
                  <Text style={styles.popupButtonText}>Close Notification</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default NotificationScreen;

/* =========================================================
 * STYLES
 * ========================================================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,

    backgroundColor: '#a9090d',
  },

  screen: {
    flex: 1,

    backgroundColor: '#f6f7f9',
  },

  pageContainer: {
    flex: 1,

    width: '100%',

    alignSelf: 'center',
  },

  header: {
    minHeight: 205,

    backgroundColor: '#a9090d',

    paddingHorizontal: 17,

    paddingTop: 12,

    paddingBottom: 23,

    borderBottomLeftRadius: 28,

    borderBottomRightRadius: 28,

    overflow: 'hidden',

    elevation: 8,
  },

  headerCircleOne: {
    position: 'absolute',

    width: 200,

    height: 200,

    borderRadius: 100,

    borderWidth: 1,

    borderColor: 'rgba(255,255,255,0.09)',

    top: -95,

    right: -65,
  },

  headerCircleTwo: {
    position: 'absolute',

    width: 130,

    height: 130,

    borderRadius: 65,

    backgroundColor: 'rgba(255,255,255,0.035)',

    bottom: -75,

    left: -35,
  },

  headerTopRow: {
    flexDirection: 'row',

    alignItems: 'center',
  },

  backButton: {
    width: 42,

    height: 42,

    borderRadius: 13,

    backgroundColor: 'rgba(255,255,255,0.13)',

    alignItems: 'center',

    justifyContent: 'center',
  },

  backIcon: {
    width: 18,

    height: 18,

    tintColor: '#ffffff',
  },

  headerPressed: {
    opacity: 0.7,
  },

  headerTitleArea: {
    flex: 1,

    marginLeft: 12,
  },

  headerEyebrow: {
    color: '#f4c454',

    fontSize: 9,

    fontWeight: '900',

    letterSpacing: 1.1,
  },

  headerTitle: {
    color: '#ffffff',

    fontSize: 21,

    fontWeight: '900',

    marginTop: 1,
  },

  headerStatusBadge: {
    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: 'rgba(255,255,255,0.14)',

    borderRadius: 12,

    paddingHorizontal: 8,

    paddingVertical: 6,
  },

  headerStatusDot: {
    width: 6,

    height: 6,

    borderRadius: 3,

    backgroundColor: '#f4c454',

    marginRight: 5,
  },

  headerStatusText: {
    color: '#ffffff',

    fontSize: 8.5,

    fontWeight: '900',
  },

  headerSummaryArea: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginTop: 25,
  },

  headerSummaryLabel: {
    color: 'rgba(255,255,255,0.55)',

    fontSize: 8,

    fontWeight: '900',
  },

  headerSummaryTitle: {
    color: '#ffffff',

    fontSize: 22,

    lineHeight: 28,

    fontWeight: '900',

    marginTop: 3,
  },

  headerSummaryTitleSmall: {
    fontSize: 18,

    lineHeight: 24,
  },

  headerSummarySubtext: {
    color: 'rgba(255,255,255,0.68)',

    fontSize: 10,

    marginTop: 4,
  },

  markAllButton: {
    minHeight: 44,

    backgroundColor: '#ffffff',

    borderRadius: 13,

    paddingHorizontal: 9,

    flexDirection: 'row',

    alignItems: 'center',
  },

  markAllButtonPressed: {
    opacity: 0.8,
  },

  markAllText: {
    color: '#a9090d',

    fontWeight: '900',

    marginRight: 4,
  },

  markAllLabel: {
    color: '#a9090d',

    fontSize: 8,

    fontWeight: '900',
  },

  listContent: {
    paddingTop: 17,

    paddingBottom: 45,

    flexGrow: 1,
  },

  summaryCard: {
    backgroundColor: '#ffffff',

    borderRadius: 17,

    borderWidth: 1,

    borderColor: '#e9ebee',

    padding: 14,

    marginBottom: 20,
  },

  summaryCardHeader: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginBottom: 13,
  },

  summaryTitle: {
    color: '#17191d',

    fontSize: 17,

    fontWeight: '900',
  },

  summarySubtitle: {
    color: '#89909a',

    fontSize: 10,

    marginTop: 2,
  },

  summaryBell: {
    width: 36,

    height: 36,

    borderRadius: 11,

    backgroundColor: '#fff0f1',

    alignItems: 'center',

    justifyContent: 'center',
  },

  summaryBellText: {
    color: '#a9090d',

    fontSize: 18,

    fontWeight: '900',
  },

  summaryGrid: {
    flexDirection: 'row',

    gap: 7,
  },

  summaryMiniCard: {
    flex: 1,

    backgroundColor: '#f8f9fa',

    borderRadius: 12,

    padding: 12,
  },

  summaryMiniLabel: {
    color: '#989ea7',

    fontSize: 8,

    fontWeight: '900',
  },

  summaryMiniValue: {
    color: '#24272d',

    fontSize: 17,

    fontWeight: '900',

    marginTop: 5,
  },

  sectionHeader: {
    flexDirection: 'row',

    alignItems: 'center',

    marginTop: 4,

    marginBottom: 9,
  },

  sectionTitle: {
    color: '#17191d',

    fontSize: 16,

    fontWeight: '900',
  },

  sectionLine: {
    flex: 1,

    height: 1,

    backgroundColor: '#e9ebee',

    marginLeft: 10,
  },

  notificationCard: {
    position: 'relative',

    minHeight: 92,

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: '#ffffff',

    borderRadius: 16,

    borderWidth: 1,

    borderColor: '#e9ebee',

    paddingHorizontal: 12,

    paddingVertical: 13,

    marginBottom: 10,

    overflow: 'hidden',
  },

  unreadNotificationCard: {
    borderColor: '#efcfd0',

    backgroundColor: '#fffafa',
  },

  notificationPressed: {
    opacity: 0.75,
  },

  unreadAccent: {
    position: 'absolute',

    top: 0,

    left: 0,

    bottom: 0,

    width: 4,

    backgroundColor: '#a9090d',
  },

  avatar: {
    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: '#fff0f1',

    borderWidth: 1,

    borderColor: '#f1d7d8',

    marginRight: 11,
  },

  avatarInitials: {
    color: '#a9090d',

    fontWeight: '900',
  },

  systemIconContainer: {
    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: '#fff0f1',

    borderWidth: 1,

    borderColor: '#f1d7d8',

    marginRight: 11,
  },

  systemIcon: {
    color: '#a9090d',

    fontWeight: '900',
  },

  notificationContent: {
    flex: 1,

    minWidth: 0,
  },

  notificationTopRow: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',
  },

  notificationNameArea: {
    flex: 1,

    flexDirection: 'row',

    alignItems: 'center',

    paddingRight: 8,
  },

  notificationName: {
    flexShrink: 1,

    color: '#23262c',

    fontSize: 13,

    fontWeight: '900',
  },

  newBadge: {
    backgroundColor: '#fff0f1',

    borderRadius: 6,

    paddingHorizontal: 6,

    paddingVertical: 3,

    marginLeft: 6,
  },

  newBadgeText: {
    color: '#a9090d',

    fontSize: 6.5,

    fontWeight: '900',
  },

  notificationTime: {
    color: '#999fa8',

    fontSize: 9,

    fontWeight: '700',
  },

  notificationHeading: {
    color: '#4b515c',

    fontSize: 10.5,

    fontWeight: '800',

    marginTop: 4,
  },

  notificationMessage: {
    color: '#858b94',

    fontSize: 9.5,

    lineHeight: 14,

    marginTop: 4,
  },

  notificationArrow: {
    color: '#c4c7cc',

    fontSize: 24,

    marginLeft: 7,
  },

  loadingScreen: {
    flex: 1,

    backgroundColor: '#f6f7f9',

    alignItems: 'center',

    justifyContent: 'center',
  },

  loadingTitle: {
    color: '#23262c',

    fontSize: 17,

    fontWeight: '900',

    marginTop: 14,
  },

  loadingSubtitle: {
    color: '#858b94',

    fontSize: 10,

    marginTop: 5,
  },

  emptyState: {
    minHeight: 300,

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 24,
  },

  emptyStateIcon: {
    width: 66,

    height: 66,

    borderRadius: 22,

    backgroundColor: '#fff0f1',

    alignItems: 'center',

    justifyContent: 'center',
  },

  emptyStateIconText: {
    color: '#a9090d',

    fontSize: 25,

    fontWeight: '900',
  },

  emptyStateTitle: {
    color: '#23262c',

    fontSize: 16,

    fontWeight: '900',

    marginTop: 14,
  },

  emptyStateText: {
    color: '#858b94',

    fontSize: 10,

    lineHeight: 16,

    marginTop: 6,

    textAlign: 'center',
  },

  retryButton: {
    minHeight: 42,

    minWidth: 120,

    backgroundColor: '#a9090d',

    borderRadius: 12,

    alignItems: 'center',

    justifyContent: 'center',

    marginTop: 14,
  },

  retryButtonText: {
    color: '#ffffff',

    fontSize: 9,

    fontWeight: '900',
  },

  modalOverlay: {
    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: 'rgba(20,15,13,0.68)',

    paddingHorizontal: 20,
  },

  popupCard: {
    width: '100%',

    backgroundColor: '#f6f7f9',

    borderRadius: 25,

    overflow: 'hidden',
  },

  popupHeader: {
    alignItems: 'center',

    backgroundColor: '#a9090d',

    paddingTop: 30,

    paddingHorizontal: 22,

    paddingBottom: 24,
  },

  closeButton: {
    position: 'absolute',

    top: 14,

    right: 14,

    width: 36,

    height: 36,

    borderRadius: 12,

    backgroundColor: 'rgba(255,255,255,0.13)',

    alignItems: 'center',

    justifyContent: 'center',
  },

  closeButtonText: {
    color: '#ffffff',

    fontSize: 25,
  },

  popupAvatar: {
    marginBottom: 12,
  },

  popupEyebrow: {
    color: '#f4c454',

    fontSize: 8,

    fontWeight: '900',

    letterSpacing: 1,

    marginTop: 10,
  },

  popupName: {
    color: '#ffffff',

    fontSize: 20,

    fontWeight: '900',

    marginTop: 3,
  },

  popupTime: {
    color: 'rgba(255,255,255,0.68)',

    fontSize: 10,

    marginTop: 6,
  },

  popupContent: {
    padding: 16,
  },

  /* =======================================================
   * FIXED POPUP MESSAGE AREA
   * ======================================================= */

  popupMessageCard: {
    backgroundColor: '#2b1b1d',

    borderRadius: 16,

    borderWidth: 1,

    borderColor: '#6f2f33',

    padding: 16,

    minHeight: 150,
  },

  popupMessageLabel: {
    color: '#f4c454',

    fontSize: 8,

    fontWeight: '900',

    letterSpacing: 1,

    marginBottom: 7,
  },

  popupHeading: {
    color: '#ffffff',

    fontSize: 15,

    lineHeight: 21,

    fontWeight: '900',
  },

  popupMessageScroll: {
    maxHeight: 240,

    marginTop: 10,
  },

  popupMessageScrollContent: {
    paddingBottom: 4,
  },

  popupMessage: {
    color: '#ffffff',

    fontSize: 12,

    lineHeight: 19,

    fontWeight: '500',
  },

  popupButton: {
    minHeight: 52,

    backgroundColor: '#a9090d',

    borderRadius: 13,

    alignItems: 'center',

    justifyContent: 'center',

    marginTop: 14,
  },

  popupButtonText: {
    color: '#ffffff',

    fontSize: 11,

    fontWeight: '900',
  },
});
