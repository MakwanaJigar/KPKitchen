import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ImageBackground,
  useWindowDimensions,
  Alert,
} from 'react-native';

import {SafeAreaView} from 'react-native-safe-area-context';

const statistics = [
  {
    id: 1,
    title: 'Total Assigned',
    value: '12',
    valueColor: '#111111',
    badgeText: 'In progress',
    badgeBackground: '#dfe4f5',
    badgeTextColor: '#68718d',
  },
  {
    id: 2,
    title: 'Ready for Delivery',
    value: '5',
    valueColor: '#c40016',
    badgeText: 'Pick up now',
    badgeBackground: '#fde8ea',
    badgeTextColor: '#d9001b',
  },
  {
    id: 3,
    title: 'Delivered',
    value: '7',
    valueColor: '#007c3d',
    badgeText: 'Success',
    badgeBackground: '#e3f4e9',
    badgeTextColor: '#07803f',
  },
  {
    id: 4,
    title: 'Pending',
    value: '0',
    valueColor: '#777777',
    badgeText: 'All clear',
    badgeBackground: '#eff0f2',
    badgeTextColor: '#9a9da4',
  },
];

const quickActions = [
  {
    id: 1,
    title: 'Assigned',
    icon: '▣',
    backgroundColor: '#d00018',
    iconColor: '#ffffff',
  },
  {
    id: 2,
    title: 'Ready',
    icon: '▤',
    backgroundColor: '#e7eafd',
    iconColor: '#5d6682',
  },
  {
    id: 3,
    title: 'Profile',
    icon: '◎',
    backgroundColor: '#efeff1',
    iconColor: '#75483c',
  },
];

const recentActivities = [
  {
    id: 1,
    orderNumber: '#88219',
    status: 'Delivered',
    address: '24 Market St, Downtown',
    time: '12:45 PM',
    amount: '$12.50',
  },
  {
    id: 2,
    orderNumber: '#88104',
    status: 'Delivered',
    address: '712 Oak Ln, Westside',
    time: '11:15 AM',
    amount: '$8.75',
  },
];

const HomeScreen = ({ navigation }) => {
  const {width} = useWindowDimensions();

  const isSmallScreen = width <= 360;

  const screenPadding = isSmallScreen ? 12 : 18;
  const cardGap = isSmallScreen ? 8 : 14;
  const actionGap = isSmallScreen ? 6 : 10;

  // Always show two statistic cards in one row
  const statisticCardWidth =
    (width - screenPadding * 2 - cardGap - 2) / 2;

  // Always show four quick-action buttons in one row
  const quickActionWidth =
    (width - screenPadding * 2 - actionGap * 3 - 2) / 4;

  const quickActionBoxSize = Math.min(
    quickActionWidth,
    isSmallScreen ? 44 : 50,
  );

  const handleQuickAction = action => {
    Alert.alert(action.title, `${action.title} action selected.`);
  };

  const handleViewAll = () => {
    Alert.alert('Recent Activity', 'View all activities pressed.');
  };

  const handleRoutePress = () => {
    Alert.alert('Active Route', 'Opening current route.');
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'left', 'right']}>
      <View style={styles.screen}>
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

          <Pressable
           onPress={() => {
                    navigation.navigate('Notification');
                  }}
            // onPress={() => {
            //   Alert.alert('Notifications', 'Notification button pressed.');
            // }}
            style={({pressed}) => [
              styles.notificationButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open notifications">
            <View style={styles.notificationBell}>
              <View style={styles.bellTop} />
              <View style={styles.bellBody} />
              <View style={styles.bellBottom} />
              <View style={styles.bellDot} />
            </View>

            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>2</Text>
            </View>
          </Pressable>
        </View>

        {/* Single ScrollView for entire screen */}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: screenPadding,
            },
          ]}>
          {/* Welcome Section */}

          <View style={styles.welcomeSection}>
            <Text
              style={[
                styles.heading,
                isSmallScreen && styles.headingSmall,
              ]}>
              Welcome, Delivery{'\n'}Partner
            </Text>

            <Text style={styles.subtitle}>
              Ready for your shift? Here's your daily overview.
            </Text>
          </View>

          {/* Statistics */}

          <Text style={styles.mainSectionTitle}>
            Today's Statistics
          </Text>

          <View
            style={[
              styles.statisticsContainer,
              {
                columnGap: cardGap,
                rowGap: cardGap,
              },
            ]}>
            {statistics.map(item => (
              <View
                key={item.id}
                style={[
                  styles.statisticCard,
                  {
                    width: statisticCardWidth,
                  },
                  isSmallScreen && styles.statisticCardSmall,
                ]}>
                <Text
                  numberOfLines={2}
                  style={[
                    styles.statisticCardTitle,
                    isSmallScreen && styles.statisticCardTitleSmall,
                  ]}>
                  {item.title}
                </Text>

                <Text
                  style={[
                    styles.statisticValue,
                    {
                      color: item.valueColor,
                    },
                    isSmallScreen && styles.statisticValueSmall,
                  ]}>
                  {item.value}
                </Text>

                <View
                  style={[
                    styles.statisticBadge,
                    {
                      backgroundColor: item.badgeBackground,
                    },
                  ]}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.statisticBadgeText,
                      {
                        color: item.badgeTextColor,
                      },
                      isSmallScreen &&
                        styles.statisticBadgeTextSmall,
                    ]}>
                    {item.badgeText}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Quick Actions */}

          <View style={styles.quickActionsSection}>
            <Text style={styles.mainSectionTitle}>Quick Actions</Text>

            <View
              style={[
                styles.quickActionsContainer,
                {
                  columnGap: actionGap,
                },
              ]}>
              {quickActions.map(action => (
                <Pressable
                  key={action.id}
                  onPress={() => handleQuickAction(action)}
                  style={({pressed}) => [
                    styles.quickActionItem,
                    {
                      width: quickActionWidth,
                    },
                    pressed && styles.pressed,
                  ]}>
                  <View
                    style={[
                      styles.quickActionIconBox,
                      {
                        width: quickActionBoxSize,
                        height: quickActionBoxSize,
                        backgroundColor: action.backgroundColor,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.quickActionIcon,
                        {
                          color: action.iconColor,
                        },
                      ]}>
                      {action.icon}
                    </Text>
                  </View>

                  <Text
                    numberOfLines={1}
                    style={[
                      styles.quickActionTitle,
                      isSmallScreen &&
                        styles.quickActionTitleSmall,
                    ]}>
                    {action.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Recent Activity */}

          <View style={styles.recentActivitySection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderTitle}>
                Recent Activity
              </Text>

              <Pressable
                onPress={handleViewAll}
                style={({pressed}) => [
                  styles.viewAllButton,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.viewAllText}>View All</Text>
              </Pressable>
            </View>

            <View style={styles.activitiesContainer}>
              {recentActivities.map(activity => (
                <Pressable
                  key={activity.id}
                  style={({pressed}) => [
                    styles.activityCard,
                    pressed && styles.pressed,
                  ]}>
                  <View style={styles.successIconContainer}>
                    <View style={styles.successIconCircle}>
                      <Text style={styles.successCheck}>✓</Text>
                    </View>
                  </View>

                  <View style={styles.activityInformation}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.activityTitle,
                        isSmallScreen &&
                          styles.activityTitleSmall,
                      ]}>
                      Order {activity.orderNumber}{' '}
                      {activity.status}
                    </Text>

                    <Text
                      numberOfLines={1}
                      style={[
                        styles.activityAddress,
                        isSmallScreen &&
                          styles.activityAddressSmall,
                      ]}>
                      {activity.address} •
                    </Text>

                    <Text style={styles.activityTime}>
                      {activity.time}
                    </Text>
                  </View>

                  <Text
                    numberOfLines={1}
                    style={[
                      styles.activityAmount,
                      isSmallScreen &&
                        styles.activityAmountSmall,
                    ]}>
                    {activity.amount}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Active Route */}

          <View style={styles.routeSection}>
            <Pressable
              onPress={handleRoutePress}
              style={({pressed}) => [
                styles.routeCard,
                pressed && styles.routeCardPressed,
              ]}>
              <ImageBackground
                source={{
                  uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b',
                }}
                resizeMode="cover"
                style={styles.routeBackground}
                imageStyle={styles.routeBackgroundImage}>
                <View style={styles.routeOverlay} />

                <View style={styles.mapPin}>
                  <View style={styles.mapPinCircle}>
                    <View style={styles.mapPinInnerDot} />
                  </View>

                  <View style={styles.mapPinTriangle} />
                </View>

                <View style={styles.routeContent}>
                  <View style={styles.routeInformation}>
                    <Text style={styles.activeRouteLabel}>
                      ACTIVE ROUTE
                    </Text>

                    <Text
                      numberOfLines={1}
                      style={[
                        styles.routeTitle,
                        isSmallScreen && styles.routeTitleSmall,
                      ]}>
                      Heading to Central Hub
                    </Text>
                  </View>

                  <View style={styles.navigationButton}>
                    <Text style={styles.navigationArrow}>➤</Text>
                  </View>
                </View>
              </ImageBackground>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  screen: {
    flex: 1,
    backgroundColor: '#f8f9fb',
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

  /* Scroll content */

  scrollContent: {
    flexGrow: 1,
    paddingTop: 18,
    paddingBottom: 100,
  },

  /* Welcome */

  welcomeSection: {
    marginBottom: 22,
  },

  heading: {
    color: '#090909',
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  headingSmall: {
    fontSize: 25,
    lineHeight: 31,
  },

  subtitle: {
    maxWidth: 340,
    marginTop: 7,
    color: '#5c6477',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
  },

  mainSectionTitle: {
    marginBottom: 12,
    color: '#111111',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
  },

  /* Statistics */

  statisticsContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
  },

  statisticCard: {
    minHeight: 128,
    paddingHorizontal: 14,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderRadius: 11,

    elevation: 3,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },

  statisticCardSmall: {
    minHeight: 122,
    paddingHorizontal: 10,
    paddingVertical: 13,
  },

  statisticCardTitle: {
    minHeight: 32,
    color: '#3e4858',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },

  statisticCardTitleSmall: {
    fontSize: 10,
    lineHeight: 14,
  },

  statisticValue: {
    marginTop: 3,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '700',
  },

  statisticValueSmall: {
    fontSize: 26,
    lineHeight: 31,
  },

  statisticBadge: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },

  statisticBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '500',
  },

  statisticBadgeTextSmall: {
    fontSize: 9,
    lineHeight: 11,
  },

  /* Quick Actions */

  quickActionsSection: {
    marginTop: 24,
    marginBottom: 22,
  },

  quickActionsContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  quickActionItem: {
    alignItems: 'center',
  },

  quickActionIconBox: {
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',

    elevation: 2,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  quickActionIcon: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '700',
  },

  quickActionTitle: {
    width: '100%',
    marginTop: 6,
    color: '#121212',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '500',
    textAlign: 'center',
  },

  quickActionTitleSmall: {
    fontSize: 8.5,
  },

  /* Recent Activity */

  recentActivitySection: {
    marginBottom: 20,
  },

  sectionHeader: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionHeaderTitle: {
    color: '#111111',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
  },

  viewAllButton: {
    paddingVertical: 4,
    paddingLeft: 12,
  },

  viewAllText: {
    color: '#d00018',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },

  activitiesContainer: {
    rowGap: 10,
  },

  activityCard: {
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',

    elevation: 2,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },

  successIconContainer: {
    width: 40,
    height: 40,
    marginRight: 11,
    borderRadius: 8,
    backgroundColor: '#e3f2e9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  successIconCircle: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#00884a',
    alignItems: 'center',
    justifyContent: 'center',
  },

  successCheck: {
    color: '#ffffff',
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
  },

  activityInformation: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },

  activityTitle: {
    color: '#141414',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },

  activityTitleSmall: {
    fontSize: 10.5,
  },

  activityAddress: {
    marginTop: 1,
    color: '#4f596d',
    fontSize: 10,
    lineHeight: 13,
  },

  activityAddressSmall: {
    fontSize: 9,
  },

  activityTime: {
    color: '#4f596d',
    fontSize: 10,
    lineHeight: 13,
  },

  activityAmount: {
    color: '#111111',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },

  activityAmountSmall: {
    fontSize: 10.5,
  },

  /* Route */

  routeSection: {
    marginBottom: 10,
  },

  routeCard: {
    width: '100%',
    height: 160,
    overflow: 'hidden',
    backgroundColor: '#d8dce0',
    borderRadius: 12,

    elevation: 3,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.14,
    shadowRadius: 7,
  },

  routeCardPressed: {
    opacity: 0.92,
    transform: [{scale: 0.995}],
  },

  routeBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  routeBackgroundImage: {
    borderRadius: 12,
  },

  routeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 23, 29, 0.26)',
  },

  mapPin: {
    position: 'absolute',
    top: 50,
    left: '49%',
    alignItems: 'center',
  },

  mapPinCircle: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 8,
    backgroundColor: '#d00018',
    alignItems: 'center',
    justifyContent: 'center',
  },

  mapPinInnerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },

  mapPinTriangle: {
    width: 0,
    height: 0,
    marginTop: -2,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#d00018',
  },

  routeContent: {
    paddingHorizontal: 12,
    paddingBottom: 13,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  routeInformation: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },

  activeRouteLabel: {
    marginBottom: 2,
    color: '#ffffff',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  routeTitle: {
    color: '#ffffff',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },

  routeTitleSmall: {
    fontSize: 14,
    lineHeight: 19,
  },

  navigationButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#d00018',
    alignItems: 'center',
    justifyContent: 'center',
  },

  navigationArrow: {
    marginLeft: -2,
    color: '#ffffff',
    fontSize: 21,
    lineHeight: 24,
    fontWeight: '700',
    transform: [{rotate: '-45deg'}],
  },
});