import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  useWindowDimensions,
  Alert,
  TouchableOpacity,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
// import LoginScreen from './LoginScreen';
import { useNavigation, CommonActions } from '@react-navigation/native';

const ProfileScreen = () => {
  const { width } = useWindowDimensions();

  const isSmallScreen = width <= 360;
  const horizontalPadding = isSmallScreen ? 12 : 16;
  const contentWidth = width - horizontalPadding * 2;
  const smallCardGap = isSmallScreen ? 8 : 12;
  const smallCardWidth = (contentWidth - smallCardGap) / 2;

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
    Alert.alert('Edit Profile', 'Edit profile button pressed.');
  };

  const handleMenuPress = item => {
    Alert.alert(item.title, `${item.title} selected.`);
  };

  const navigation = useNavigation();

  const goToLoginScreen = () => {
    const parentNavigation = navigation.getParent();

    if (parentNavigation) {
      parentNavigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        }),
      );
    } else {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        }),
      );
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: goToLoginScreen,
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}

      <View style={styles.header}>
        <View style={styles.profileSection}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
            }}
            style={styles.avatar}
          />

          <Text numberOfLines={1} style={styles.appName}>
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
              paddingHorizontal: horizontalPadding,
            },
          ]}
        >
          {/* Profile Image */}

          <View style={styles.profileTopSection}>
            <View style={styles.profileImageWrapper}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1560250097-0b93528c311a',
                }}
                style={[
                  styles.profileImage,
                  isSmallScreen && styles.profileImageSmall,
                ]}
              />

              <Pressable
                onPress={handleEditProfile}
                style={({ pressed }) => [
                  styles.editButton,
                  isSmallScreen && styles.editButtonSmall,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Edit profile"
              >
                <Text style={styles.editIcon}>✎</Text>
              </Pressable>
            </View>

            <Text
              numberOfLines={1}
              style={[styles.userName, isSmallScreen && styles.userNameSmall]}
            >
              Robert Fox
            </Text>

            <Text
              numberOfLines={1}
              style={[styles.userEmail, isSmallScreen && styles.userEmailSmall]}
            >
              robert@delivery.com
            </Text>

            <Text
              numberOfLines={1}
              style={[styles.userPhone, isSmallScreen && styles.userPhoneSmall]}
            >
              +91 98765 43210
            </Text>
          </View>

          {/* Assigned Area */}

          <Pressable
            onPress={() => {
              Alert.alert('Assigned Area', 'Downtown');
            }}
            style={({ pressed }) => [
              styles.assignedAreaCard,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.assignedAreaIconBox}>
              <Text style={styles.assignedAreaIcon}>⌖</Text>
            </View>

            <View style={styles.assignedAreaInformation}>
              <Text style={styles.assignedAreaLabel}>Assigned Area</Text>

              <Text
                numberOfLines={1}
                style={[
                  styles.assignedAreaValue,
                  isSmallScreen && styles.assignedAreaValueSmall,
                ]}
              >
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
            ]}
          >
            <View
              style={[
                styles.detailCard,
                {
                  width: smallCardWidth,
                },
              ]}
            >
              <Text style={styles.detailCardLabel}>Zipcode</Text>

              <Text
                numberOfLines={1}
                style={[
                  styles.detailCardValue,
                  isSmallScreen && styles.detailCardValueSmall,
                ]}
              >
                380015
              </Text>
            </View>

            <View
              style={[
                styles.detailCard,
                {
                  width: smallCardWidth,
                },
              ]}
            >
              <Text style={styles.detailCardLabel}>Vehicle Number</Text>

              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={[
                  styles.detailCardValue,
                  isSmallScreen && styles.detailCardValueSmall,
                ]}
              >
                GJ-01-AB-1234
              </Text>
            </View>
          </View>

          {/* Settings Menu */}

          <View style={styles.menuContainer}>
            {menuItems.map((item, index) => (
              <Pressable
                key={item.id}
                onPress={() => handleMenuPress(item)}
                style={({ pressed }) => [
                  styles.menuItem,
                  index !== menuItems.length - 1 && styles.menuItemBorder,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.menuIconContainer}>
                    <Text style={styles.menuIcon}>{item.icon}</Text>
                  </View>

                  <Text
                    numberOfLines={1}
                    style={[
                      styles.menuTitle,
                      isSmallScreen && styles.menuTitleSmall,
                    ]}
                  >
                    {item.title}
                  </Text>
                </View>

                <Text style={styles.menuArrow}>›</Text>
              </Pressable>
            ))}
          </View>

          {/* Logout */}

          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.logoutButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Logout"
          >
            <Text style={styles.logoutIcon}>⇥</Text>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>

          {/* Version */}

          <Text style={styles.versionText}>App Version 2.4.1 (Build 452)</Text>
        </ScrollView>
      </View>
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

  /* Profile */

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
    fontWeight: '400',
  },

  userEmailSmall: {
    fontSize: 11,
  },

  userPhone: {
    marginTop: 2,
    color: '#734a4c',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },

  userPhoneSmall: {
    fontSize: 11,
  },

  /* Assigned area */

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

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.04,
    shadowRadius: 3,
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

  /* Detail cards */

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

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.04,
    shadowRadius: 3,
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

  /* Menu */

  menuContainer: {
    marginTop: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#efc5c7',
    borderRadius: 9,
    backgroundColor: '#ffffff',

    elevation: 2,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 5,
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
    fontWeight: '400',
  },

  /* Logout */

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
    transform: [{ scale: 0.995 }],
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

  /* Header */

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

  notificationButton: {
    position: 'relative',
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationBell: {
    width: 22,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bellTop: {
    width: 5,
    height: 4,
    backgroundColor: '#d10018',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },

  bellBody: {
    width: 14,
    height: 13,
    borderWidth: 2,
    borderColor: '#d10018',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomWidth: 0,
  },

  bellBottom: {
    width: 18,
    height: 2,
    backgroundColor: '#d10018',
    borderRadius: 2,
  },

  bellDot: {
    width: 4,
    height: 4,
    marginTop: 1,
    backgroundColor: '#d10018',
    borderRadius: 2,
  },

  notificationBadge: {
    position: 'absolute',
    top: 3,
    right: 2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 8,
    backgroundColor: '#d10018',
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '700',
  },

  pressed: {
    opacity: 0.65,
  },
});
