import React, {useState} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  CommonActions,
  useNavigation,
} from '@react-navigation/native';

import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const LOGOUT_API_URL =
  'https://replete-software.com/projects/kp_kitchen/api/driver/logout';

/*
 * These keys must be the same keys used
 * on your Login screen.
 */
const AUTH_TOKEN_KEY = '@kp_kitchen_driver_token';
const AUTH_USER_KEY = '@kp_kitchen_driver_user';
const AUTH_EMAIL_KEY = '@kp_kitchen_driver_email';

const ProfileScreen = () => {
  const {width} = useWindowDimensions();
  const navigation = useNavigation();

  const [logoutPopupVisible, setLogoutPopupVisible] =
    useState(false);

  const [logoutLoading, setLogoutLoading] =
    useState(false);

  const isSmallScreen = width <= 360;

  const horizontalPadding = isSmallScreen
    ? 12
    : 16;

  const contentWidth =
    width - horizontalPadding * 2;

  const smallCardGap = isSmallScreen
    ? 8
    : 12;

  const smallCardWidth =
    (contentWidth - smallCardGap) / 2;

  const menuItems = [
    {
      id: 1,
      title: 'Notification Settings',
      icon: '♧',
    },
    {
      id: 2,
      title: 'Help Center',
      icon: '?',
    },
    {
      id: 3,
      title: 'About Us',
      icon: 'ⓘ',
    },
    {
      id: 4,
      title: 'Privacy Policy',
      icon: '♢',
    },
  ];

  const handleEditProfile = () => {
    Alert.alert(
      'Edit Profile',
      'Edit profile button pressed.',
    );
  };

  const handleMenuPress = item => {
    Alert.alert(
      item.title,
      `${item.title} selected.`,
    );
  };

  /**
   * Remove the entire application history
   * and open the Login screen.
   */
  const goToLoginScreen = () => {
    const parentNavigation =
      navigation.getParent();

    if (parentNavigation) {
      parentNavigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'Login',
            },
          ],
        }),
      );

      return;
    }

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'Login',
          },
        ],
      }),
    );
  };

  /**
   * Open logout confirmation popup.
   */
  const openLogoutPopup = () => {
    if (!logoutLoading) {
      setLogoutPopupVisible(true);
    }
  };

  /**
   * Close logout confirmation popup.
   */
  const closeLogoutPopup = () => {
    if (!logoutLoading) {
      setLogoutPopupVisible(false);
    }
  };

  /**
   * Remove the stored authentication data.
   */
  const clearLocalLoginSession = async () => {
    await AsyncStorage.removeItem(
      AUTH_TOKEN_KEY,
    );

    await AsyncStorage.removeItem(
      AUTH_USER_KEY,
    );

    await AsyncStorage.removeItem(
      AUTH_EMAIL_KEY,
    );

    delete axios.defaults.headers.common
      .Authorization;
  };

  /**
   * Create a readable logout error message.
   */
  const getLogoutErrorMessage = error => {
    if (error?.response) {
      return (
        error.response.data?.message ||
        error.response.data?.error ||
        `The server returned error ${error.response.status}.`
      );
    }

    if (error?.code === 'ECONNABORTED') {
      return 'The logout request timed out. Please try again.';
    }

    if (error?.request) {
      return (
        'The logout server did not respond. ' +
        'Please check your internet connection and try again.'
      );
    }

    return (
      error?.message ||
      'Unable to logout. Please try again.'
    );
  };

  /**
   * Call the logout API after the user
   * presses "Yes, Logout".
   */
  const performLogout = async () => {
    if (logoutLoading) {
      return;
    }

    try {
      setLogoutLoading(true);

      const savedToken =
        await AsyncStorage.getItem(
          AUTH_TOKEN_KEY,
        );

      /*
       * When no token exists locally, clean any
       * remaining session data and open Login.
       */
      if (!savedToken) {
        await clearLocalLoginSession();

        setLogoutPopupVisible(false);

        goToLoginScreen();

        return;
      }

      console.log(
        'Logout API URL:',
        LOGOUT_API_URL,
      );

      const response = await axios.post(
        LOGOUT_API_URL,
        {},
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${savedToken}`,
          },
          timeout: 20000,
        },
      );

      console.log(
        'Logout API response:',
        response.data,
      );

      /*
       * Some APIs return HTTP 200 but include
       * status:false or success:false.
       */
      if (
        response.data?.status === false ||
        response.data?.success === false
      ) {
        throw new Error(
          response.data?.message ||
            'The server could not complete logout.',
        );
      }

      /*
       * Clear the saved token only after the
       * server successfully logs the driver out.
       */
      await clearLocalLoginSession();

      setLogoutPopupVisible(false);

      goToLoginScreen();
    } catch (error) {
      console.log('Logout error:', {
        message: error?.message,
        code: error?.code,
        status: error?.response?.status,
        response: error?.response?.data,
      });

      /*
       * When the token is expired or invalid,
       * remove it locally and return to Login.
       */
      if (
        error?.response?.status === 401 ||
        error?.response?.status === 403
      ) {
        try {
          await clearLocalLoginSession();
        } catch (storageError) {
          console.log(
            'Clear invalid session error:',
            storageError,
          );
        }

        setLogoutPopupVisible(false);

        goToLoginScreen();

        return;
      }

      setLogoutPopupVisible(false);

      Alert.alert(
        'Logout Failed',
        getLogoutErrorMessage(error),
      );
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'left', 'right']}>
      {/* Header */}

      <View style={styles.header}>
        <View style={styles.profileSection}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
            }}
            style={styles.avatar}
          />

          <Text
            numberOfLines={1}
            style={styles.appName}>
            Delivery Pro
          </Text>
        </View>
      </View>

      <View style={styles.screen}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal:
                horizontalPadding,
            },
          ]}>
          {/* Profile Image */}

          <View
            style={styles.profileTopSection}>
            <View
              style={
                styles.profileImageWrapper
              }>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1560250097-0b93528c311a',
                }}
                style={[
                  styles.profileImage,

                  isSmallScreen &&
                    styles.profileImageSmall,
                ]}
              />

              <Pressable
                onPress={handleEditProfile}
                style={({pressed}) => [
                  styles.editButton,

                  isSmallScreen &&
                    styles.editButtonSmall,

                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Edit profile">
                <Text style={styles.editIcon}>
                  ✎
                </Text>
              </Pressable>
            </View>

            <Text
              numberOfLines={1}
              style={[
                styles.userName,

                isSmallScreen &&
                  styles.userNameSmall,
              ]}>
              Robert Fox
            </Text>

            <Text
              numberOfLines={1}
              style={[
                styles.userEmail,

                isSmallScreen &&
                  styles.userEmailSmall,
              ]}>
              robert@delivery.com
            </Text>

            <Text
              numberOfLines={1}
              style={[
                styles.userPhone,

                isSmallScreen &&
                  styles.userPhoneSmall,
              ]}>
              +91 98765 43210
            </Text>
          </View>

          {/* Assigned Area */}

          <Pressable
            onPress={() => {
              Alert.alert(
                'Assigned Area',
                'Downtown',
              );
            }}
            style={({pressed}) => [
              styles.assignedAreaCard,
              pressed && styles.pressed,
            ]}>
            <View
              style={
                styles.assignedAreaIconBox
              }>
              <Text
                style={
                  styles.assignedAreaIcon
                }>
                ⌖
              </Text>
            </View>

            <View
              style={
                styles.assignedAreaInformation
              }>
              <Text
                style={
                  styles.assignedAreaLabel
                }>
                Assigned Area
              </Text>

              <Text
                numberOfLines={1}
                style={[
                  styles.assignedAreaValue,

                  isSmallScreen &&
                    styles.assignedAreaValueSmall,
                ]}>
                Downtown
              </Text>
            </View>
          </Pressable>

          {/* Zipcode and Vehicle */}

          <View
            style={[
              styles.detailsRow,
              {
                columnGap: smallCardGap,
              },
            ]}>
            <View
              style={[
                styles.detailCard,
                {
                  width: smallCardWidth,
                },
              ]}>
              <Text
                style={
                  styles.detailCardLabel
                }>
                Zipcode
              </Text>

              <Text
                numberOfLines={1}
                style={[
                  styles.detailCardValue,

                  isSmallScreen &&
                    styles.detailCardValueSmall,
                ]}>
                380015
              </Text>
            </View>

            <View
              style={[
                styles.detailCard,
                {
                  width: smallCardWidth,
                },
              ]}>
              <Text
                style={
                  styles.detailCardLabel
                }>
                Vehicle Number
              </Text>

              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={[
                  styles.detailCardValue,

                  isSmallScreen &&
                    styles.detailCardValueSmall,
                ]}>
                GJ-01-AB-1234
              </Text>
            </View>
          </View>

          {/* Settings Menu */}

          <View
            style={styles.menuContainer}>
            {menuItems.map(
              (item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() =>
                    handleMenuPress(item)
                  }
                  style={({pressed}) => [
                    styles.menuItem,

                    index !==
                      menuItems.length - 1 &&
                      styles.menuItemBorder,

                    pressed &&
                      styles.pressed,
                  ]}>
                  <View
                    style={styles.menuLeft}>
                    <View
                      style={
                        styles.menuIconContainer
                      }>
                      <Text
                        style={
                          styles.menuIcon
                        }>
                        {item.icon}
                      </Text>
                    </View>

                    <Text
                      numberOfLines={1}
                      style={[
                        styles.menuTitle,

                        isSmallScreen &&
                          styles.menuTitleSmall,
                      ]}>
                      {item.title}
                    </Text>
                  </View>

                  <Text
                    style={styles.menuArrow}>
                    ›
                  </Text>
                </Pressable>
              ),
            )}
          </View>

          {/* Logout Button */}

          <Pressable
            onPress={openLogoutPopup}
            disabled={logoutLoading}
            style={({pressed}) => [
              styles.logoutButton,

              logoutLoading &&
                styles.logoutButtonDisabled,

              pressed &&
                !logoutLoading &&
                styles.logoutButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Logout">
            <Text style={styles.logoutIcon}>
              ⇥
            </Text>

            <Text style={styles.logoutText}>
              Logout
            </Text>
          </Pressable>

          <Text style={styles.versionText}>
            App Version 2.4.1 (Build 452)
          </Text>
        </ScrollView>
      </View>

      {/* Logout Confirmation Popup */}

      <Modal
        visible={logoutPopupVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        hardwareAccelerated
        onRequestClose={closeLogoutPopup}>
        <View
          style={styles.logoutModalOverlay}>
          <Pressable
            style={
              StyleSheet.absoluteFillObject
            }
            disabled={logoutLoading}
            onPress={closeLogoutPopup}
          />

          <View
            style={styles.logoutModalCard}>
            <View
              style={
                styles.logoutModalIconOuter
              }>
              <View
                style={
                  styles.logoutModalIconInner
                }>
                <Text
                  style={
                    styles.logoutModalIconText
                  }>
                  ⇥
                </Text>
              </View>
            </View>

            <Text
              style={styles.logoutModalTitle}>
              Confirm Logout
            </Text>

            <Text
              style={
                styles.logoutModalMessage
              }>
              Are you sure you want to logout
              from your account?
            </Text>

            <View
              style={
                styles.logoutModalButtonRow
              }>
              <Pressable
                disabled={logoutLoading}
                onPress={closeLogoutPopup}
                style={({pressed}) => [
                  styles.cancelLogoutButton,

                  pressed &&
                    !logoutLoading &&
                    styles.modalButtonPressed,
                ]}>
                <Text
                  style={
                    styles.cancelLogoutButtonText
                  }>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                disabled={logoutLoading}
                onPress={performLogout}
                style={({pressed}) => [
                  styles.confirmLogoutButton,

                  logoutLoading &&
                    styles.confirmLogoutButtonDisabled,

                  pressed &&
                    !logoutLoading &&
                    styles.modalButtonPressed,
                ]}>
                {logoutLoading ? (
                  <View
                    style={
                      styles.logoutLoadingContent
                    }>
                    <ActivityIndicator
                      size="small"
                      color="#ffffff"
                    />

                    <Text
                      style={
                        styles.logoutLoadingText
                      }>
                      Logging out...
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={
                      styles.confirmLogoutButtonText
                    }>
                    Yes, Logout
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  screen: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },

  scrollContent: {
    flexGrow: 1,
    paddingTop: 18,
    paddingBottom: 100,
  },

  pressed: {
    opacity: 0.65,
  },

  header: {
    minHeight: 58,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    elevation: 2,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },

  profileSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dddddd',
  },

  appName: {
    flexShrink: 1,
    marginLeft: 10,
    color: '#d10018',
    fontSize: 18,
    fontWeight: '700',
  },

  profileTopSection: {
    alignItems: 'center',
    marginBottom: 24,
  },

  profileImageWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileImage: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 3,
    borderColor: '#d7dde2',
    backgroundColor: '#d9dde1',
  },

  profileImageSmall: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },

  editButton: {
    position: 'absolute',
    right: -1,
    bottom: 0,
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 14,
    backgroundColor: '#cf0018',
    alignItems: 'center',
    justifyContent: 'center',

    elevation: 3,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },

  editButtonSmall: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },

  editIcon: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '800',
  },

  userName: {
    marginTop: 10,
    color: '#111111',
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
  },

  userNameSmall: {
    fontSize: 17,
  },

  userEmail: {
    marginTop: 2,
    color: '#734a4c',
    fontSize: 12,
    lineHeight: 16,
  },

  userEmailSmall: {
    fontSize: 11,
  },

  userPhone: {
    marginTop: 2,
    color: '#734a4c',
    fontSize: 12,
    lineHeight: 16,
  },

  userPhoneSmall: {
    fontSize: 11,
  },

  assignedAreaCard: {
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#efc5c7',
    borderRadius: 9,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',

    elevation: 1,
  },

  assignedAreaIconBox: {
    width: 34,
    height: 34,
    marginRight: 12,
    borderRadius: 6,
    backgroundColor: '#ffd7d7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  assignedAreaIcon: {
    color: '#d4001a',
    fontSize: 18,
    lineHeight: 21,
    fontWeight: '700',
  },

  assignedAreaInformation: {
    flex: 1,
    minWidth: 0,
  },

  assignedAreaLabel: {
    color: '#774647',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '500',
  },

  assignedAreaValue: {
    marginTop: 2,
    color: '#111111',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },

  assignedAreaValueSmall: {
    fontSize: 13,
  },

  detailsRow: {
    width: '100%',
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'stretch',
  },

  detailCard: {
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#efc5c7',
    borderRadius: 9,
    backgroundColor: '#ffffff',

    elevation: 1,
  },

  detailCardLabel: {
    color: '#75494b',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '500',
  },

  detailCardValue: {
    marginTop: 3,
    color: '#111111',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
  },

  detailCardValueSmall: {
    fontSize: 11.5,
  },

  menuContainer: {
    marginTop: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#efc5c7',
    borderRadius: 9,
    backgroundColor: '#ffffff',

    elevation: 2,
  },

  menuItem: {
    minHeight: 46,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#efcfd0',
  },

  menuLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },

  menuIconContainer: {
    width: 26,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  menuIcon: {
    color: '#4f6380',
    fontSize: 16,
    lineHeight: 19,
    fontWeight: '600',
  },

  menuTitle: {
    flexShrink: 1,
    color: '#181818',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },

  menuTitleSmall: {
    fontSize: 11,
  },

  menuArrow: {
    marginLeft: 10,
    color: '#24364c',
    fontSize: 23,
    lineHeight: 24,
  },

  logoutButton: {
    width: '100%',
    minHeight: 47,
    marginTop: 18,
    borderRadius: 7,
    backgroundColor: '#c90017',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    elevation: 2,

    shadowColor: '#c90017',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.18,
    shadowRadius: 5,
  },

  logoutButtonPressed: {
    opacity: 0.8,

    transform: [
      {
        scale: 0.995,
      },
    ],
  },

  logoutButtonDisabled: {
    opacity: 0.65,
  },

  logoutIcon: {
    marginRight: 8,
    color: '#ffffff',
    fontSize: 19,
    lineHeight: 22,
    fontWeight: '700',
  },

  logoutText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },

  versionText: {
    marginTop: 21,
    color: '#744b4d',
    fontSize: 8,
    lineHeight: 11,
    fontWeight: '500',
    textAlign: 'center',
  },

  logoutModalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,

    backgroundColor:
      'rgba(17, 24, 39, 0.68)',
  },

  logoutModalCard: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    elevation: 20,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 14,
    },
    shadowOpacity: 0.24,
    shadowRadius: 24,
  },

  logoutModalIconOuter: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 46,
    backgroundColor: '#fff1f2',
    marginBottom: 20,
  },

  logoutModalIconInner: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 31,
    backgroundColor: '#c90017',
    elevation: 6,

    shadowColor: '#c90017',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.28,
    shadowRadius: 9,
  },

  logoutModalIconText: {
    color: '#ffffff',
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '800',
  },

  logoutModalTitle: {
    color: '#17191c',
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '800',
    textAlign: 'center',
  },

  logoutModalMessage: {
    maxWidth: 300,
    marginTop: 10,
    marginBottom: 26,
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },

  logoutModalButtonRow: {
    width: '100%',
    flexDirection: 'row',
    columnGap: 12,
  },

  cancelLogoutButton: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 16,
    backgroundColor: '#ffffff',
  },

  cancelLogoutButtonText: {
    color: '#4b5563',
    fontSize: 14,
    fontWeight: '800',
  },

  confirmLogoutButton: {
    flex: 1.25,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#c90017',
    elevation: 4,

    shadowColor: '#c90017',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.22,
    shadowRadius: 7,
  },

  confirmLogoutButtonDisabled: {
    opacity: 0.7,
  },

  confirmLogoutButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },

  logoutLoadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoutLoadingText: {
    marginLeft: 8,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },

  modalButtonPressed: {
    opacity: 0.82,

    transform: [
      {
        scale: 0.985,
      },
    ],
  },
});