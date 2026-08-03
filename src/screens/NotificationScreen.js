import React, { useMemo, useState } from 'react';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Modal,
  Pressable,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

const initialNotifications = [
  {
    title: 'Today',
    data: [
      {
        id: '1',
        type: 'person',
        name: 'Sarah Jenkins',
        heading: 'New Message',
        message:
          'I’ve updated the quarterly projections. Can you take a look?',
        fullMessage:
          'I’ve updated the quarterly projections for this month. Please review the document and let me know whether any changes are required before the final submission.',
        time: '2m',
        initials: 'SJ',
        avatarBackground: '#dbeafe',
        avatarTextColor: '#1d4ed8',
        unread: true,
      },
      {
        id: '2',
        type: 'system',
        name: 'System Update',
        heading: 'New version available',
        message:
          'Version 4.2 is now available with enhanced security protocols.',
        fullMessage:
          'Version 4.2 is now available. This update includes enhanced security protocols, performance improvements and several important bug fixes.',
        time: '1h',
        icon: '↻',
        unread: false,
      },
      {
        id: '3',
        type: 'person',
        name: 'David Chen',
        heading: "Mentioned you in 'Design Assets'",
        message:
          '@user, the new indigo palette tokens are ready for review...',
        fullMessage:
          '@user, the new indigo palette tokens are ready for review. Please check the latest design assets and share your feedback with the team.',
        time: '4h',
        initials: 'DC',
        avatarBackground: '#ffedd5',
        avatarTextColor: '#c2410c',
        unread: true,
        highlightHeading: true,
      },
    ],
  },
  {
    title: 'Yesterday',
    data: [
      {
        id: '4',
        type: 'system',
        name: 'Weekly Insight',
        heading: 'Your weekly report is ready',
        message:
          'Your productivity report is ready. Efficiency increased by 12%.',
        fullMessage:
          'Your weekly productivity report is ready. Your overall efficiency increased by 12% compared with the previous week.',
        time: '1d',
        icon: '▣',
        unread: false,
      },
      {
        id: '5',
        type: 'system',
        name: 'Security Alert',
        heading: 'New login detected',
        message:
          'New login detected from a Chrome browser.',
        fullMessage:
          'A new login was detected from a Chrome browser. Review your recent login activity immediately if this was not you.',
        time: '1d',
        icon: '!',
        unread: false,
      },
    ],
  },
];

const NotificationScreen = () => {
  const { width } = useWindowDimensions();

  const [notifications, setNotifications] =
    useState(initialNotifications);

  const [selectedNotification, setSelectedNotification] =
    useState(null);

  const isSmallScreen = width <= 360;
  const isTablet = width >= 700;

  const horizontalPadding = isSmallScreen ? 14 : 20;
  const avatarSize = isSmallScreen ? 42 : 48;

  const unreadCount = useMemo(() => {
    return notifications.reduce((total, section) => {
      const sectionUnreadCount = section.data.filter(
        notification => notification.unread,
      ).length;

      return total + sectionUnreadCount;
    }, 0);
  }, [notifications]);

  const markNotificationAsRead = notificationId => {
    setNotifications(previousSections =>
      previousSections.map(section => ({
        ...section,

        data: section.data.map(notification =>
          notification.id === notificationId
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
    setNotifications(previousSections =>
      previousSections.map(section => ({
        ...section,

        data: section.data.map(notification => ({
          ...notification,
          unread: false,
        })),
      })),
    );
  };

  const openNotificationPopup = notification => {
    markNotificationAsRead(notification.id);
    setSelectedNotification(notification);
  };

  const closeNotificationPopup = () => {
    setSelectedNotification(null);
  };

  const renderAvatar = (
    notification,
    size = avatarSize,
  ) => {
    if (notification.type === 'person') {
      return (
        <View
          style={[
            styles.avatar,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor:
                notification.avatarBackground,
            },
          ]}
        >
          <Text
            style={[
              styles.avatarInitials,
              {
                color: notification.avatarTextColor,
                fontSize: size >= 60 ? 18 : 13,
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
            borderRadius: size / 2,
          },
        ]}
      >
        <Text
          style={[
            styles.systemIcon,
            {
              fontSize: size >= 60 ? 25 : 19,
            },
          ]}
        >
          {notification.icon}
        </Text>
      </View>
    );
  };

  const renderNotification = ({ item }) => {
    return (
      <Pressable
        onPress={() => openNotificationPopup(item)}
        style={({ pressed }) => [
          styles.notificationItem,
          item.unread && styles.unreadNotification,
          pressed && styles.notificationPressed,
        ]}
      >
        <View style={styles.unreadIndicatorContainer}>
          {item.unread ? (
            <View style={styles.unreadIndicator} />
          ) : null}
        </View>

        {renderAvatar(item)}

        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text
              numberOfLines={1}
              style={[
                styles.notificationName,
                {
                  fontSize: isSmallScreen ? 13 : 14,
                },
              ]}
            >
              {item.name}
            </Text>

            <Text style={styles.notificationTime}>
              {item.time}
            </Text>
          </View>

          {item.heading ? (
            <Text
              numberOfLines={1}
              style={[
                styles.notificationHeading,
                item.highlightHeading &&
                  styles.highlightHeading,
              ]}
            >
              {item.heading}
            </Text>
          ) : null}

          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
            style={[
              styles.notificationMessage,
              {
                fontSize: isSmallScreen ? 12 : 13,
              },
            ]}
          >
            {item.message}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderSectionHeader = ({ section }) => {
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {section.title.toUpperCase()}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
      />

      <View
        style={[
          styles.pageContainer,
          {
            maxWidth: isTablet ? 720 : undefined,
          },
        ]}
      >
        <View
          style={[
            styles.header,
            {
              paddingHorizontal: horizontalPadding,
            },
          ]}
        >
          <View style={styles.headerContent}>
            <Text
              style={[
                styles.headerTitle,
                {
                  fontSize: isSmallScreen ? 24 : 28,
                },
              ]}
            >
              Notifications
            </Text>

            <Text style={styles.headerSubtitle}>
              {unreadCount > 0
                ? `${unreadCount} unread notification${
                    unreadCount > 1 ? 's' : ''
                  }`
                : 'You are all caught up'}
            </Text>
          </View>

          {unreadCount > 0 ? (
            <Pressable
              onPress={markAllAsRead}
              style={({ pressed }) => [
                styles.markAllButton,
                pressed && styles.markAllButtonPressed,
              ]}
            >
              <Text style={styles.markAllText}>
                Mark all read
              </Text>
            </Pressable>
          ) : null}
        </View>

        <SectionList
          sections={notifications}
          keyExtractor={item => item.id}
          renderItem={renderNotification}
          renderSectionHeader={renderSectionHeader}
          ItemSeparatorComponent={() => (
            <View style={styles.separator} />
          )}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.listContent,
            {
              paddingHorizontal: horizontalPadding,
            },
          ]}
          ListFooterComponent={
            <View style={styles.listFooter} />
          }
        />
      </View>

      {/* Notification details popup */}

      <Modal
        visible={Boolean(selectedNotification)}
        transparent
        statusBarTranslucent
        hardwareAccelerated
        animationType="fade"
        onRequestClose={closeNotificationPopup}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={closeNotificationPopup}
          />

          {selectedNotification ? (
            <View
              style={[
                styles.popupCard,
                {
                  maxWidth: isTablet ? 460 : 390,
                },
              ]}
            >
              <Pressable
                onPress={closeNotificationPopup}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.closeButtonPressed,
                ]}
              >
                <Text style={styles.closeButtonText}>
                  ×
                </Text>
              </Pressable>

              <View style={styles.popupAvatar}>
                {renderAvatar(selectedNotification, 72)}
              </View>

              <Text style={styles.popupName}>
                {selectedNotification.name}
              </Text>

              <Text style={styles.popupTime}>
                {selectedNotification.time === '2m'
                  ? '2 minutes ago'
                  : selectedNotification.time === '1h'
                    ? '1 hour ago'
                    : selectedNotification.time === '4h'
                      ? '4 hours ago'
                      : 'Yesterday'}
              </Text>

              <View style={styles.popupDivider} />

              <Text style={styles.popupHeading}>
                {selectedNotification.heading}
              </Text>

              <Text style={styles.popupMessage}>
                {selectedNotification.fullMessage ||
                  selectedNotification.message}
              </Text>

              <Pressable
                onPress={closeNotificationPopup}
                style={({ pressed }) => [
                  styles.popupButton,
                  pressed && styles.popupButtonPressed,
                ]}
              >
                <Text style={styles.popupButtonText}>
                  Close
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default NotificationScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  pageContainer: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#ffffff',
  },

  header: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f1f3',
  },

  headerContent: {
    flex: 1,
    paddingRight: 12,
  },

  headerTitle: {
    color: '#181b21',
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  headerSubtitle: {
    color: '#8a9099',
    fontSize: 12,
    marginTop: 4,
  },

  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
  },

  markAllButtonPressed: {
    opacity: 0.65,
  },

  markAllText: {
    color: '#4455d9',
    fontSize: 12,
    fontWeight: '700',
  },

  listContent: {
    paddingTop: 4,
  },

  sectionHeader: {
    paddingTop: 18,
    paddingBottom: 9,
    backgroundColor: '#ffffff',
  },

  sectionTitle: {
    color: '#7d838d',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  notificationItem: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingRight: 5,
    borderRadius: 14,
  },

  unreadNotification: {
    backgroundColor: '#fbfcff',
  },

  notificationPressed: {
    backgroundColor: '#f4f5f7',
  },

  unreadIndicatorContainer: {
    width: 12,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  unreadIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4f65e8',
  },

  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  avatarInitials: {
    fontWeight: '800',
  },

  systemIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f2f4',
    marginRight: 12,
  },

  systemIcon: {
    color: '#7c838d',
    fontWeight: '700',
  },

  notificationContent: {
    flex: 1,
    minWidth: 0,
  },

  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  notificationName: {
    flex: 1,
    color: '#252932',
    fontWeight: '800',
    marginRight: 8,
  },

  notificationTime: {
    color: '#999fa8',
    fontSize: 11,
    fontWeight: '600',
  },

  notificationHeading: {
    color: '#4c535d',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },

  highlightHeading: {
    color: '#465bd9',
  },

  notificationMessage: {
    color: '#858b94',
    lineHeight: 18,
    marginTop: 4,
  },

  separator: {
    height: 1,
    backgroundColor: '#f0f1f3',
    marginLeft: 72,
  },

  listFooter: {
    height: 30,
  },

  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: 22,
  },

  popupCard: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 26,
    paddingTop: 34,
    paddingHorizontal: 24,
    paddingBottom: 24,

    elevation: 20,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 14,
    },
    shadowOpacity: 0.22,
    shadowRadius: 24,
  },

  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 18,
    zIndex: 2,
  },

  closeButtonPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.94 }],
  },

  closeButtonText: {
    color: '#6b7280',
    fontSize: 26,
    lineHeight: 28,
  },

  popupAvatar: {
    marginBottom: 14,
  },

  popupName: {
    color: '#1f2937',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },

  popupTime: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },

  popupDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#eceef1',
    marginVertical: 20,
  },

  popupHeading: {
    width: '100%',
    color: '#303642',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 24,
    textAlign: 'left',
  },

  popupMessage: {
    width: '100%',
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 24,
  },

  popupButton: {
    width: '100%',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d10018',
    borderRadius: 15,
  },

  popupButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },

  popupButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});