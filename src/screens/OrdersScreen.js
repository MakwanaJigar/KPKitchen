import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  useWindowDimensions,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

const orders = [
  {
    id: 1,
    orderNumber: '#1024',
    priority: 'High Priority',
    priorityBackground: '#fde7e9',
    priorityColor: '#d71920',
    time: '12:30 PM',
    amount: '₹540',
    paymentStatus: 'COD',
    paymentBackground: '#e5e8ff',
    paymentColor: '#6570a6',
    customerName: 'John Doe',
    mobile: '+91 98765 43210',
    address: '123 Street, Area Name, 380015',
    disabled: false,
  },
  {
    id: 2,
    orderNumber: '#1025',
    priority: 'Standard',
    priorityBackground: '#eeeeee',
    priorityColor: '#9a9a9a',
    time: '01:15 PM',
    amount: '₹1,280',
    paymentStatus: 'PAID',
    paymentBackground: '#dff7e7',
    paymentColor: '#4ca66a',
    customerName: 'Sarah Wilson',
    mobile: '+91 98000 12345',
    address: '45 Galaxy Appts, Area Name, 380015',
    disabled: true,
  },
];

const filters = [
  {
    id: 1,
    title: 'Pending',
  },
  {
    id: 2,
    title: 'Ready',
  },
  {
    id: 3,
    title: 'Out for Delivery',
  },
  {
    id: 4,
    title: 'Delivered',
  },
];

const HomeScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();

  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState('Ready');

  const isSmallScreen = width <= 360;
  const screenPadding = isSmallScreen ? 10 : 14;
  const orderCardPadding = isSmallScreen ? 11 : 14;
  const actionGap = isSmallScreen ? 5 : 7;

  const availableContentWidth = width - screenPadding * 2;

  const bottomCardGap = isSmallScreen ? 8 : 12;
  const bottomCardWidth = (availableContentWidth - bottomCardGap) / 2;

  const handleViewDetails = order => {
    Alert.alert(
      `Order ${order.orderNumber}`,
      `Customer: ${order.customerName}\nAmount: ${order.amount}`,
    );
  };

  const handleCall = order => {
    Alert.alert('Call customer', `Calling ${order.mobile}`);
  };

  const handleNavigate = order => {
    Alert.alert('Navigation', `Opening route to ${order.address}`);
  };

  const handleBulkUpdate = () => {
    Alert.alert('Bulk Update', 'Starting bulk update for ready orders.');
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

        <Pressable
          onPress={() => {
            Alert.alert('Notifications', 'Notification button pressed.');
          }}
          style={({ pressed }) => [
            styles.notificationButton,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Open notifications"
        >
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

      <View style={styles.screen}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            [
              styles.scrollContent,
              {
                paddingHorizontal: screenPadding,
              },
            ]
          }
        >
          {/* Search Input */}

          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>⌕</Text>

            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search orders or zipcode (e.g. 380015)..."
              placeholderTextColor="#70798d"
              style={[
                styles.searchInput,
                isSmallScreen && styles.searchInputSmall,
              ]}
              returnKeyType="search"
            />
          </View>

          {/* Zipcode Header */}

          <View style={styles.zipcodeHeader}>
            <View style={styles.zipcodeLeft}>
              <Text style={styles.locationIcon}>⌖</Text>

              <Text
                numberOfLines={1}
                style={[
                  styles.zipcodeText,
                  isSmallScreen && styles.zipcodeTextSmall,
                ]}
              >
                Zipcode: 380015
              </Text>
            </View>

            <Text
              numberOfLines={1}
              style={[
                styles.ordersFoundText,
                isSmallScreen && styles.ordersFoundTextSmall,
              ]}
            >
              12 Orders Found
            </Text>
          </View>

          {/* Filters */}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
          >
            {filters.map(filter => {
              const isActive = activeFilter === filter.title;

              return (
                <Pressable
                  key={filter.id}
                  onPress={() => setActiveFilter(filter.title)}
                  style={({ pressed }) => [
                    styles.filterButton,
                    isActive && styles.activeFilterButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      isActive && styles.activeFilterButtonText,
                    ]}
                  >
                    {filter.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Orders */}

          <View style={styles.ordersContainer}>
            {orders.map(order => (
              <View
                key={order.id}
                
                style={[
                  styles.orderCard,
                  {
                    padding: orderCardPadding,
                  },
                  order.disabled && styles.disabledOrderCard,
                ]}
              >
                {/* Order Header */}

                <View style={styles.orderHeader}>
                  <View style={styles.orderHeaderLeft}>
                    <View style={styles.orderNumberRow}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.orderNumber,
                          order.disabled && styles.disabledText,
                          isSmallScreen && styles.orderNumberSmall,
                        ]}
                      >
                        Order {order.orderNumber}
                      </Text>

                      <View
                        style={[
                          styles.priorityBadge,
                          {
                            backgroundColor: order.priorityBackground,
                          },
                        ]}
                      >
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.priorityBadgeText,
                            {
                              color: order.priorityColor,
                            },
                          ]}
                        >
                          {order.priority}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.timeRow}>
                      <Text style={styles.clockIcon}>◷</Text>

                      <Text
                        style={[
                          styles.orderTime,
                          order.disabled && styles.disabledText,
                        ]}
                      >
                        {order.time}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.amountSection}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.amountText,
                        order.disabled && styles.amountTextDisabled,
                        isSmallScreen && styles.amountTextSmall,
                      ]}
                    >
                      {order.amount}
                    </Text>

                    <View
                      style={[
                        styles.paymentBadge,
                        {
                          backgroundColor: order.paymentBackground,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.paymentBadgeText,
                          {
                            color: order.paymentColor,
                          },
                        ]}
                      >
                        {order.paymentStatus}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Customer Details */}

                <View style={styles.customerSection}>
                  <View
                    style={[
                      styles.customerAvatar,
                      order.disabled && styles.customerAvatarDisabled,
                    ]}
                  >
                    <Text style={styles.customerAvatarIcon}>♙</Text>
                  </View>

                  <View style={styles.customerInformation}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.customerName,
                        order.disabled && styles.disabledText,
                        isSmallScreen && styles.customerNameSmall,
                      ]}
                    >
                      {order.customerName}
                    </Text>

                    <Text
                      numberOfLines={1}
                      style={[
                        styles.customerMobile,
                        order.disabled && styles.disabledText,
                      ]}
                    >
                      {order.mobile}
                    </Text>

                    <View style={styles.addressRow}>
                      <Text style={styles.addressLocationIcon}>⌖</Text>

                      <Text
                        numberOfLines={2}
                        style={[
                          styles.customerAddress,
                          order.disabled && styles.disabledText,
                          isSmallScreen && styles.customerAddressSmall,
                        ]}
                      >
                        {order.address}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Order Actions */}

                <View
                  style={[
                    styles.orderActions,
                    {
                      columnGap: actionGap,
                    },
                  ]}
                >
                  <Pressable
                    disabled={order.disabled}
                    onPress={() => {navigation.navigate('OrderDetail');}}
                    // onPress={() => handleViewDetails(order)}
                    style={({ pressed }) => [
                      styles.viewDetailsButton,
                      order.disabled && styles.disabledOutlineButton,
                      pressed && !order.disabled && styles.pressed,
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.viewDetailsButtonText,
                        order.disabled && styles.disabledText,
                        isSmallScreen && styles.actionButtonTextSmall,
                      ]}
                    >
                      View Details
                    </Text>
                  </Pressable>

                  <Pressable
                    disabled={order.disabled}
                    onPress={() => handleCall(order)}
                    style={({ pressed }) => [
                      styles.callButton,
                      order.disabled && styles.disabledOutlineButton,
                      pressed && !order.disabled && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.callIcon,
                        order.disabled && styles.disabledText,
                      ]}
                    >
                      ♧
                    </Text>
                  </Pressable>

                  <Pressable
                    disabled={order.disabled}
                    onPress={() => handleNavigate(order)}
                    style={({ pressed }) => [
                      styles.navigateButton,
                      order.disabled && styles.disabledNavigateButton,
                      pressed && !order.disabled && styles.pressed,
                    ]}
                  >
                    <Text style={styles.navigationButtonIcon}>➤</Text>

                    <Text
                      numberOfLines={1}
                      style={[
                        styles.navigateButtonText,
                        isSmallScreen && styles.actionButtonTextSmall,
                      ]}
                    >
                      Navigate
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>

          {/* Bottom Summary Cards */}

          <View
            style={[
              styles.bottomSummaryContainer,
              {
                columnGap: bottomCardGap,
              },
            ]}
          >
            <View
              style={[
                styles.pendingSummaryCard,
                {
                  width: bottomCardWidth,
                },
              ]}
            >
              <Text style={styles.summaryLabel}>UPCOMING</Text>

              <Text style={styles.pendingCount}>03</Text>

              <Text numberOfLines={2} style={styles.summaryDescription}>
                Pending Pickups
              </Text>

              <View style={styles.progressTrack}>
                <View style={styles.progressValue} />
              </View>
            </View>

            <View
              style={[
                styles.bulkUpdateCard,
                {
                  width: bottomCardWidth,
                },
              ]}
            >
              <Text style={styles.bulkUpdateLabel}>QUICK ACTION</Text>

              <Text
                numberOfLines={1}
                style={[
                  styles.bulkUpdateTitle,
                  isSmallScreen && styles.bulkUpdateTitleSmall,
                ]}
              >
                Bulk Update
              </Text>

              <Text numberOfLines={2} style={styles.bulkUpdateDescription}>
                Scan all Ready orders
              </Text>

              <Pressable
                onPress={handleBulkUpdate}
                style={({ pressed }) => [
                  styles.startScanButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.startScanButtonText}>Start Scan</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        {/* Floating Map Button */}

        <Pressable
          onPress={() => {
            Alert.alert('Map', 'Opening order map.');
          }}
          style={({ pressed }) => [
            styles.floatingMapButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.floatingMapIcon}>♧</Text>
        </Pressable>
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
    // backgroundColor: '#f7f8fa',
  },

  scrollContent: {
    flexGrow: 1,
    // paddingTop: 14,
    paddingBottom: 100,
  },

  pressed: {
    opacity: 0.65,
  },

  /* Search */

  searchContainer: {
    width: '100%',
    minHeight: 50,
    marginTop: 30,
    paddingHorizontal: 13,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#efc6c8',
    borderRadius: 7,
    flexDirection: 'row',
    alignItems: 'center',
  },

  searchIcon: {
    marginRight: 9,
    color: '#40516a',
    fontSize: 20,
    lineHeight: 22,
  },

  searchInput: {
    flex: 1,
    height: 48,
    paddingVertical: 0,
    color: '#1d2736',
    fontSize: 12,
  },

  searchInputSmall: {
    fontSize: 10.5,
  },

  /* Zipcode header */

  zipcodeHeader: {
    marginTop: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  zipcodeLeft: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  locationIcon: {
    marginRight: 7,
    color: '#df001b',
    fontSize: 20,
    fontWeight: '700',
  },

  zipcodeText: {
    flexShrink: 1,
    color: '#111111',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },

  zipcodeTextSmall: {
    fontSize: 13,
  },

  ordersFoundText: {
    color: '#536178',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '500',
  },

  ordersFoundTextSmall: {
    fontSize: 8.5,
  },

  /* Filters */

  filtersContent: {
    paddingBottom: 4,
    paddingRight: 12,
    columnGap: 10,
  },

  filterButton: {
    minHeight: 31,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: '#e9ebee',
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeFilterButton: {
    backgroundColor: '#df2732',
  },

  filterButtonText: {
    color: '#596274',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },

  activeFilterButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },

  /* Orders */

  ordersContainer: {
    marginTop: 14,
    rowGap: 13,
  },

  orderCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 10,

    elevation: 2,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },

  disabledOrderCard: {
    opacity: 0.56,
  },

  orderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  orderHeaderLeft: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },

  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  orderNumber: {
    color: '#121212',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },

  orderNumberSmall: {
    fontSize: 13,
  },

  priorityBadge: {
    marginLeft: 7,
    marginTop: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 7,
  },

  priorityBadgeText: {
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '600',
  },

  timeRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },

  clockIcon: {
    marginRight: 4,
    color: '#687287',
    fontSize: 13,
  },

  orderTime: {
    color: '#677185',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '500',
  },

  amountSection: {
    alignItems: 'flex-end',
  },

  amountText: {
    color: '#dc001b',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
  },

  amountTextSmall: {
    fontSize: 16,
  },

  amountTextDisabled: {
    color: '#db001b',
  },

  paymentBadge: {
    marginTop: 2,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },

  paymentBadgeText: {
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '700',
  },

  /* Customer */

  customerSection: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  customerAvatar: {
    width: 40,
    height: 40,
    marginRight: 13,
    borderRadius: 20,
    backgroundColor: '#eeeeef',
    alignItems: 'center',
    justifyContent: 'center',
  },

  customerAvatarDisabled: {
    backgroundColor: '#e5e5e5',
  },

  customerAvatarIcon: {
    color: '#687287',
    fontSize: 19,
  },

  customerInformation: {
    flex: 1,
    minWidth: 0,
  },

  customerName: {
    color: '#121212',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },

  customerNameSmall: {
    fontSize: 13,
  },

  customerMobile: {
    marginTop: 2,
    color: '#5f687c',
    fontSize: 10.5,
    lineHeight: 14,
  },

  addressRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  addressLocationIcon: {
    marginRight: 5,
    color: '#d3001a',
    fontSize: 13,
    lineHeight: 15,
  },

  customerAddress: {
    flex: 1,
    color: '#76575a',
    fontSize: 10.5,
    lineHeight: 14,
  },

  customerAddressSmall: {
    fontSize: 9.5,
  },

  disabledText: {
    color: '#737b89',
  },

  /* Card action buttons */

  orderActions: {
    width: '100%',
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  viewDetailsButton: {
    flex: 1.08,
    height: 39,
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: '#efc4c6',
    borderRadius: 6,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  viewDetailsButtonText: {
    color: '#151515',
    fontSize: 11,
    fontWeight: '700',
  },

  callButton: {
    width: 43,
    height: 39,
    borderWidth: 1,
    borderColor: '#efc4c6',
    borderRadius: 6,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  callIcon: {
    color: '#33445c',
    fontSize: 18,
  },

  navigateButton: {
    flex: 1.55,
    height: 39,
    paddingHorizontal: 7,
    borderRadius: 6,
    backgroundColor: '#ca0018',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  navigationButtonIcon: {
    marginRight: 7,
    color: '#ffffff',
    fontSize: 17,
    transform: [{ rotate: '-45deg' }],
  },

  navigateButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },

  actionButtonTextSmall: {
    fontSize: 9,
  },

  disabledOutlineButton: {
    borderColor: '#d5b5b7',
  },

  disabledNavigateButton: {
    backgroundColor: '#d86d76',
  },

  /* Bottom cards */

  bottomSummaryContainer: {
    width: '100%',
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'stretch',
  },

  pendingSummaryCard: {
    minHeight: 158,
    padding: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e4e4e4',
    borderRadius: 8,
  },

  summaryLabel: {
    color: '#50607a',
    fontSize: 8,
    lineHeight: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  pendingCount: {
    marginTop: 8,
    color: '#c60018',
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '800',
  },

  summaryDescription: {
    color: '#343a46',
    fontSize: 9,
    lineHeight: 12,
  },

  progressTrack: {
    height: 4,
    marginTop: 'auto',
    overflow: 'hidden',
    borderRadius: 2,
    backgroundColor: '#e5e7ea',
  },

  progressValue: {
    width: '68%',
    height: '100%',
    backgroundColor: '#c80018',
  },

  bulkUpdateCard: {
    minHeight: 158,
    padding: 14,
    backgroundColor: '#e92c31',
    borderRadius: 8,

    elevation: 4,

    shadowColor: '#d4001c',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 7,
  },

  bulkUpdateLabel: {
    color: '#ffffff',
    fontSize: 8,
    lineHeight: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  bulkUpdateTitle: {
    marginTop: 7,
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
  },

  bulkUpdateTitleSmall: {
    fontSize: 13,
  },

  bulkUpdateDescription: {
    marginTop: 1,
    color: '#ffffff',
    fontSize: 9,
    lineHeight: 12,
  },

  startScanButton: {
    height: 35,
    marginTop: 'auto',
    borderRadius: 5,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  startScanButtonText: {
    color: '#d00018',
    fontSize: 10,
    fontWeight: '700',
  },

  /* Floating map button */

  floatingMapButton: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#50627d',
    alignItems: 'center',
    justifyContent: 'center',

    elevation: 8,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.23,
    shadowRadius: 7,
  },

  floatingMapIcon: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: '700',
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
