import React, { useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { CommonActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const ORDERS_API_URL =
  'https://replete-software.com/projects/kp_admin/api/driver/assigned-orders';

const AUTH_TOKEN_KEY = '@kp_kitchen_driver_token';
const AUTH_USER_KEY = '@kp_kitchen_driver_user';
const AUTH_EMAIL_KEY = '@kp_kitchen_driver_email';

const filters = [
  {
    id: 1,
    title: 'Pending',
  },
  {
    id: 2,
    title: 'Delivered',
  },
];

const getFirstValue = (...values) => {
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (value !== null && value !== undefined && value !== '') {
      return value;
    }
  }

  return '';
};

const getTextValue = (...values) => {
  const value = getFirstValue(...values);

  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'object') {
    return String(
      getFirstValue(value.name, value.title, value.label, value.value),
    );
  }

  return String(value);
};

const extractOrdersArray = responseData => {
  const possibleArrays = [
    responseData?.data?.orders?.data,
    responseData?.data?.orders,
    responseData?.orders?.data,
    responseData?.orders,
    responseData?.data?.data,
    responseData?.data,
    responseData,
  ];

  for (let index = 0; index < possibleArrays.length; index += 1) {
    if (Array.isArray(possibleArrays[index])) {
      return possibleArrays[index];
    }
  }

  return [];
};

/**
 * All completed statuses are shown under Delivered.
 * Every other status, including Ready and Out for Delivery,
 * is shown under Pending.
 */
const getFilterStatus = statusValue => {
  const status = String(statusValue || '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_');

  const deliveredStatuses = [
    'delivered',
    'completed',
    'complete',
    'delivery_completed',
  ];

  return deliveredStatuses.includes(status) ? 'Delivered' : 'Pending';
};

const isReadyStatus = statusValue => {
  const status = String(statusValue || '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_');

  return [
    'ready',
    'ready_for_delivery',
    'ready_for_pickup',
    'prepared',
    'preparing_completed',
    'packed',
  ].includes(status);
};

const formatAmount = amountValue => {
  if (
    amountValue === null ||
    amountValue === undefined ||
    amountValue === ''
  ) {
    return '₹0';
  }

  const amountText = String(amountValue);

  if (amountText.includes('₹')) {
    return amountText;
  }

  const numericValue = Number(amountText.replace(/[^\d.-]/g, ''));

  if (Number.isFinite(numericValue)) {
    return `₹${numericValue.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    })}`;
  }

  return `₹${amountText}`;
};

const formatTime = timeValue => {
  if (!timeValue) {
    return 'Time N/A';
  }

  const rawTime = String(timeValue);
  const timeMatch = rawTime.match(/(\d{1,2}):(\d{2})/);

  if (!timeMatch) {
    return rawTime;
  }

  let hours = Number(timeMatch[1]);
  const minutes = timeMatch[2];

  if (!Number.isFinite(hours) || hours > 23) {
    return rawTime;
  }

  const period = hours >= 12 ? 'PM' : 'AM';

  hours %= 12;

  if (hours === 0) {
    hours = 12;
  }

  return `${String(hours).padStart(2, '0')}:${minutes} ${period}`;
};

const formatAddress = addressValue => {
  if (!addressValue) {
    return '';
  }

  if (
    typeof addressValue === 'string' ||
    typeof addressValue === 'number'
  ) {
    return String(addressValue);
  }

  if (typeof addressValue === 'object') {
    const addressParts = [
      addressValue.address_line_1,
      addressValue.address_line1,
      addressValue.address1,
      addressValue.address_line_2,
      addressValue.address_line2,
      addressValue.address2,
      addressValue.landmark,
      addressValue.area,
      addressValue.city,
      addressValue.state,
      addressValue.zipcode,
      addressValue.zip_code,
      addressValue.pincode,
      addressValue.postal_code,
    ].filter(
      part =>
        part !== null &&
        part !== undefined &&
        String(part).trim() !== '',
    );

    return addressParts.join(', ');
  }

  return String(addressValue);
};

const formatOrderNumber = value => {
  const orderNumber = String(value || '').trim();

  if (!orderNumber) {
    return '#N/A';
  }

  if (orderNumber.startsWith('#')) {
    return orderNumber;
  }

  return `#${orderNumber}`;
};

const normalizeOrder = (rawOrder, index) => {
  const customer =
    rawOrder?.customer ||
    rawOrder?.user ||
    rawOrder?.customer_details ||
    rawOrder?.customerDetail ||
    {};

  const addressObject = getFirstValue(
    rawOrder?.delivery_address,
    rawOrder?.shipping_address,
    rawOrder?.address,
    rawOrder?.customer_address,
    customer?.delivery_address,
    customer?.address,
  );

  const statusValue = getTextValue(
    rawOrder?.delivery_status,
    rawOrder?.order_status,
    rawOrder?.status,
    rawOrder?.status_name,
  );

  const filterStatus = getFilterStatus(statusValue);

  const rawPriority = getTextValue(
    rawOrder?.priority,
    rawOrder?.priority_name,
    rawOrder?.order_priority,
  )
    .trim()
    .toLowerCase();

  const isHighPriority =
    rawPriority === 'high' ||
    rawPriority === 'urgent' ||
    rawPriority === 'high priority' ||
    rawOrder?.is_priority === true ||
    rawOrder?.is_priority === 1 ||
    rawOrder?.is_priority === '1';

  let paymentStatus = getTextValue(
    rawOrder?.payment_status,
    rawOrder?.payment_method,
    rawOrder?.payment_type,
  )
    .trim()
    .toUpperCase();

  if (
    rawOrder?.is_paid === true ||
    rawOrder?.is_paid === 1 ||
    rawOrder?.is_paid === '1'
  ) {
    paymentStatus = 'PAID';
  }

  if (!paymentStatus) {
    paymentStatus = 'COD';
  }

  const paidPaymentStatuses = [
    'PAID',
    'SUCCESS',
    'COMPLETED',
    'ONLINE',
  ];

  const isPaid = paidPaymentStatuses.includes(paymentStatus);

  const orderId = getFirstValue(
    rawOrder?.id,
    rawOrder?.order_id,
    rawOrder?.orderId,
    index + 1,
  );

  const orderNumber = getFirstValue(
    rawOrder?.order_number,
    rawOrder?.order_no,
    rawOrder?.orderNumber,
    rawOrder?.invoice_number,
    rawOrder?.id,
    index + 1,
  );

  const zipcode = getTextValue(
    rawOrder?.zipcode,
    rawOrder?.zip_code,
    rawOrder?.pincode,
    rawOrder?.postal_code,
    addressObject?.zipcode,
    addressObject?.zip_code,
    addressObject?.pincode,
    addressObject?.postal_code,
    customer?.zipcode,
    customer?.pincode,
  );

  return {
    id: String(orderId),

    rawOrder,

    orderNumber: formatOrderNumber(orderNumber),

    status: statusValue || filterStatus,

    filterStatus,

    priority: isHighPriority ? 'High Priority' : 'Standard',

    priorityBackground: isHighPriority ? '#fde7e9' : '#eeeeee',

    priorityColor: isHighPriority ? '#d71920' : '#7d8490',

    time: formatTime(
      getFirstValue(
        rawOrder?.delivery_time,
        rawOrder?.scheduled_time,
        rawOrder?.order_time,
        rawOrder?.pickup_time,
        rawOrder?.created_at,
      ),
    ),

    amount: formatAmount(
      getFirstValue(
        rawOrder?.grand_total,
        rawOrder?.total_amount,
        rawOrder?.payable_amount,
        rawOrder?.total,
        rawOrder?.amount,
        rawOrder?.net_amount,
        0,
      ),
    ),

    paymentStatus,

    paymentBackground: isPaid ? '#dff7e7' : '#e5e8ff',

    paymentColor: isPaid ? '#268a4d' : '#6570a6',

    customerName:
      rawOrder?.customer_name ||
      rawOrder?.name ||
      customer?.name ||
      customer?.full_name ||
      'Customer',

    mobile:
      getTextValue(
        rawOrder?.customer_phone,
        rawOrder?.customer_mobile,
        rawOrder?.phone,
        rawOrder?.mobile,
        customer?.phone,
        customer?.mobile,
        customer?.phone_number,
        customer?.mobile_number,
      ) || 'Phone not available',

    address:
      formatAddress(addressObject) ||
      'Delivery address not available',

    zipcode: zipcode || 'N/A',

    disabled: filterStatus === 'Delivered',
  };
};

const Order = ({ navigation }) => {
  const { width } = useWindowDimensions();

  const [orders, setOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState('Pending');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  const isSmallScreen = width <= 360;
  const screenPadding = isSmallScreen ? 10 : 14;
  const orderCardPadding = isSmallScreen ? 11 : 14;
  const actionGap = isSmallScreen ? 5 : 7;
  const availableContentWidth = width - screenPadding * 2;
  const bottomCardGap = isSmallScreen ? 8 : 12;
  const bottomCardWidth =
    (availableContentWidth - bottomCardGap) / 2;

  const goToLoginScreen = () => {
    const parentNavigation = navigation.getParent?.();
    const navigationTarget = parentNavigation || navigation;

    navigationTarget.dispatch(
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

  const clearLoginSession = async () => {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(AUTH_USER_KEY);
    await AsyncStorage.removeItem(AUTH_EMAIL_KEY);

    delete axios.defaults.headers.common.Authorization;
  };

  const extractValidationErrors = errors => {
    const messages = [];

    if (!errors || typeof errors !== 'object') {
      return messages;
    }

    Object.keys(errors).forEach(fieldName => {
      const fieldErrors = errors[fieldName];

      if (Array.isArray(fieldErrors)) {
        fieldErrors.forEach(message => {
          if (message) {
            messages.push(String(message));
          }
        });
      } else if (fieldErrors) {
        messages.push(String(fieldErrors));
      }
    });

    return messages;
  };

  const getOrdersErrorMessage = error => {
    if (error?.response) {
      const responseData = error.response.data;

      const validationMessages = extractValidationErrors(
        responseData?.errors,
      );

      if (validationMessages.length > 0) {
        return validationMessages.join('\n');
      }

      return (
        responseData?.message ||
        responseData?.error ||
        `The server returned error ${error.response.status}.`
      );
    }

    if (error?.code === 'ECONNABORTED') {
      return 'The orders request timed out. Please try again.';
    }

    if (error?.request) {
      return (
        'The orders server did not respond. ' +
        'Please check your internet connection.'
      );
    }

    return error?.message || 'Unable to load your orders.';
  };

  const fetchOrders = async (refreshing = false) => {
    try {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setOrdersError('');

      const savedToken = await AsyncStorage.getItem(
        AUTH_TOKEN_KEY,
      );

      if (!savedToken) {
        await clearLoginSession();
        goToLoginScreen();
        return;
      }

      const response = await axios.get(ORDERS_API_URL, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${savedToken}`,
        },
        timeout: 20000,
      });

      const responseData = response.data;

      if (
        responseData?.status === false ||
        responseData?.success === false
      ) {
        throw new Error(
          responseData?.message || 'Unable to load orders.',
        );
      }

      const rawOrders = extractOrdersArray(responseData);

      const normalizedOrders = rawOrders.map(
        (rawOrder, index) => normalizeOrder(rawOrder, index),
      );

      setOrders(normalizedOrders);
    } catch (error) {
      console.log('Orders API error:', {
        message: error?.message,
        code: error?.code,
        status: error?.response?.status,
        response: error?.response?.data,
        url: error?.config?.url,
      });

      if (
        error?.response?.status === 401 ||
        error?.response?.status === 403
      ) {
        try {
          await clearLoginSession();
        } catch (storageError) {
          console.log('Clear session error:', storageError);
        }

        Alert.alert(
          'Session Expired',
          'Please login again to view your orders.',
          [
            {
              text: 'Login',
              onPress: goToLoginScreen,
            },
          ],
          {
            cancelable: false,
          },
        );

        return;
      }

      setOrdersError(getOrdersErrorMessage(error));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(
    () =>
      orders.filter(
        order => order.filterStatus === activeFilter,
      ),
    [activeFilter, orders],
  );

  const pendingCount = useMemo(
    () =>
      orders.filter(
        order => order.filterStatus === 'Pending',
      ).length,
    [orders],
  );

  const deliveredCount = useMemo(
    () =>
      orders.filter(
        order => order.filterStatus === 'Delivered',
      ).length,
    [orders],
  );

  const readyCount = useMemo(
    () =>
      orders.filter(order => isReadyStatus(order.status)).length,
    [orders],
  );

  const handleViewDetails = order => {
    navigation.navigate('OrderDetail', {
      orderId: order.id,
      order: order.rawOrder,
      normalizedOrder: order,
    });
  };

  const handleCall = async order => {
    if (
      !order.mobile ||
      order.mobile === 'Phone not available'
    ) {
      Alert.alert(
        'Phone Unavailable',
        'The customer phone number is not available.',
      );

      return;
    }

    const cleanPhone = order.mobile.replace(/[^\d+]/g, '');
    const phoneUrl = `tel:${cleanPhone}`;

    try {
      const supported = await Linking.canOpenURL(phoneUrl);

      if (!supported) {
        Alert.alert(
          'Calling Unavailable',
          'Calling is not supported on this device.',
        );

        return;
      }

      await Linking.openURL(phoneUrl);
    } catch (error) {
      console.log('Open phone error:', error);

      Alert.alert(
        'Call Failed',
        'Unable to open the phone application.',
      );
    }
  };

  const handleNavigate = async order => {
    if (
      !order.address ||
      order.address === 'Delivery address not available'
    ) {
      Alert.alert(
        'Address Unavailable',
        'The delivery address is not available.',
      );

      return;
    }

    const mapUrl =
      'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(order.address);

    try {
      await Linking.openURL(mapUrl);
    } catch (error) {
      console.log('Open map error:', error);

      Alert.alert(
        'Navigation Failed',
        'Unable to open the map application.',
      );
    }
  };

  const handleBulkUpdate = () => {
    if (readyCount === 0) {
      Alert.alert(
        'No Ready Orders',
        'There are no ready orders available for bulk update.',
      );

      return;
    }

    Alert.alert(
      'Bulk Update',
      `Starting bulk update for ${readyCount} ready order${
        readyCount === 1 ? '' : 's'
      }.`,
    );
  };

  const getFilterCount = filterTitle => {
    if (filterTitle === 'Delivered') {
      return deliveredCount;
    }

    return pendingCount;
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.header}>
        <View style={styles.profileSection}>
          {/* <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
            }}
            style={styles.avatar}
          /> */}

          <Text numberOfLines={1} style={styles.appName}>
            Delivery Pro
          </Text>
        </View>

        <Pressable
        onPress={() => {
                    navigation.navigate('Notification');
                  }}
        //   onPress={() => {
        //     Alert.alert(
        //       'Notifications',
        //       'Notification button pressed.',
        //     );
        //   }
        // }
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

          {pendingCount > 0 ? (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {pendingCount > 99 ? '99+' : pendingCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={styles.screen}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchOrders(true)}
              colors={['#d00018']}
              tintColor="#d00018"
            />
          }
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: screenPadding,
            },
          ]}
        >
          <View style={styles.ordersCountHeader}>
            <Text
              numberOfLines={1}
              style={[
                styles.ordersFoundText,
                isSmallScreen &&
                  styles.ordersFoundTextSmall,
              ]}
            >
              {filteredOrders.length}{' '}
              {filteredOrders.length === 1
                ? 'Order'
                : 'Orders'}{' '}
              Found
            </Text>
          </View>

          <View style={styles.filtersContent}>
            {filters.map(filter => {
              const isActive =
                activeFilter === filter.title;

              const filterCount = getFilterCount(
                filter.title,
              );

              return (
                <Pressable
                  key={filter.id}
                  onPress={() =>
                    setActiveFilter(filter.title)
                  }
                  style={({ pressed }) => [
                    styles.filterButton,
                    isActive &&
                      styles.activeFilterButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      isActive &&
                        styles.activeFilterButtonText,
                    ]}
                  >
                    {filter.title} ({filterCount})
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingCircle}>
                <ActivityIndicator
                  size="large"
                  color="#d00018"
                />
              </View>

              <Text style={styles.loadingTitle}>
                Loading Orders
              </Text>

              <Text style={styles.loadingMessage}>
                Please wait while we retrieve your assigned
                orders.
              </Text>
            </View>
          ) : null}

          {!isLoading && ordersError ? (
            <View style={styles.errorCard}>
              <View style={styles.errorIcon}>
                <Text style={styles.errorIconText}>!</Text>
              </View>

              <View style={styles.errorContent}>
                <Text style={styles.errorTitle}>
                  Unable to Load Orders
                </Text>

                <Text style={styles.errorMessage}>
                  {ordersError}
                </Text>

                <Pressable
                  onPress={() => fetchOrders()}
                  style={({ pressed }) => [
                    styles.retryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.retryButtonText}>
                    Try Again
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {!isLoading && !ordersError ? (
            <View style={styles.ordersContainer}>
              {filteredOrders.length > 0 ? (
                filteredOrders.map(order => (
                  <View
                    key={order.id}
                    style={[
                      styles.orderCard,
                      {
                        padding: orderCardPadding,
                      },
                      order.disabled &&
                        styles.disabledOrderCard,
                    ]}
                  >
                    <View style={styles.orderHeader}>
                      <View
                        style={styles.orderHeaderLeft}
                      >
                        <View
                          style={styles.orderNumberRow}
                        >
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.orderNumber,
                              order.disabled &&
                                styles.disabledText,
                              isSmallScreen &&
                                styles.orderNumberSmall,
                            ]}
                          >
                            Order {order.orderNumber}
                          </Text>

                          <View
                            style={[
                              styles.priorityBadge,
                              {
                                backgroundColor:
                                  order.priorityBackground,
                              },
                            ]}
                          >
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.priorityBadgeText,
                                {
                                  color:
                                    order.priorityColor,
                                },
                              ]}
                            >
                              {order.priority}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.timeRow}>
                          <Text style={styles.clockIcon}>
                            ◷
                          </Text>

                          <Text
                            style={[
                              styles.orderTime,
                              order.disabled &&
                                styles.disabledText,
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
                            order.disabled &&
                              styles.amountTextDisabled,
                            isSmallScreen &&
                              styles.amountTextSmall,
                          ]}
                        >
                          {order.amount}
                        </Text>

                        <View
                          style={[
                            styles.paymentBadge,
                            {
                              backgroundColor:
                                order.paymentBackground,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.paymentBadgeText,
                              {
                                color:
                                  order.paymentColor,
                              },
                            ]}
                          >
                            {order.paymentStatus}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.customerSection}>
                      <View
                        style={[
                          styles.customerAvatar,
                          order.disabled &&
                            styles.customerAvatarDisabled,
                        ]}
                      >
                        <Text
                          style={
                            styles.customerAvatarIcon
                          }
                        >
                          ♙
                        </Text>
                      </View>

                      <View
                        style={
                          styles.customerInformation
                        }
                      >
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.customerName,
                            order.disabled &&
                              styles.disabledText,
                            isSmallScreen &&
                              styles.customerNameSmall,
                          ]}
                        >
                          {order.customerName}
                        </Text>

                        <Text
                          numberOfLines={1}
                          style={[
                            styles.customerMobile,
                            order.disabled &&
                              styles.disabledText,
                          ]}
                        >
                          {order.mobile}
                        </Text>

                        <View style={styles.addressRow}>
                          <Text
                            style={
                              styles.addressLocationIcon
                            }
                          >
                            ⌖
                          </Text>

                          <Text
                            numberOfLines={2}
                            style={[
                              styles.customerAddress,
                              order.disabled &&
                                styles.disabledText,
                              isSmallScreen &&
                                styles.customerAddressSmall,
                            ]}
                          >
                            {order.address}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.orderActions,
                        {
                          columnGap: actionGap,
                        },
                      ]}
                    >
                      <Pressable
                        onPress={() =>
                          handleViewDetails(order)
                        }
                        style={({ pressed }) => [
                          styles.viewDetailsButton,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.viewDetailsButtonText,
                            isSmallScreen &&
                              styles.actionButtonTextSmall,
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
                          order.disabled &&
                            styles.disabledOutlineButton,
                          pressed &&
                            !order.disabled &&
                            styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.callIcon,
                            order.disabled &&
                              styles.disabledText,
                          ]}
                        >
                          ☎
                        </Text>
                      </Pressable>

                      <Pressable
                        disabled={order.disabled}
                        onPress={() =>
                          handleNavigate(order)
                        }
                        style={({ pressed }) => [
                          styles.navigateButton,
                          order.disabled &&
                            styles.disabledNavigateButton,
                          pressed &&
                            !order.disabled &&
                            styles.pressed,
                        ]}
                      >
                        <Text
                          style={
                            styles.navigationButtonIcon
                          }
                        >
                          ➤
                        </Text>

                        <Text
                          numberOfLines={1}
                          style={[
                            styles.navigateButtonText,
                            isSmallScreen &&
                              styles.actionButtonTextSmall,
                          ]}
                        >
                          Navigate
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Text style={styles.emptyIcon}>
                      □
                    </Text>
                  </View>

                  <Text style={styles.emptyTitle}>
                    No Orders Found
                  </Text>

                  <Text style={styles.emptyMessage}>
                    No {activeFilter.toLowerCase()} orders
                    are available.
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          {!isLoading && !ordersError ? (
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
                <Text style={styles.summaryLabel}>
                  UPCOMING
                </Text>

                <Text style={styles.pendingCount}>
                  {String(pendingCount).padStart(2, '0')}
                </Text>

                <Text
                  numberOfLines={2}
                  style={styles.summaryDescription}
                >
                  Pending Pickups
                </Text>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressValue,
                      {
                        width: `${Math.min(
                          100,
                          pendingCount * 12,
                        )}%`,
                      },
                    ]}
                  />
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
                <Text
                  style={styles.bulkUpdateLabel}
                >
                  QUICK ACTION
                </Text>

                <Text
                  numberOfLines={1}
                  style={[
                    styles.bulkUpdateTitle,
                    isSmallScreen &&
                      styles.bulkUpdateTitleSmall,
                  ]}
                >
                  Bulk Update
                </Text>

                <Text
                  numberOfLines={2}
                  style={
                    styles.bulkUpdateDescription
                  }
                >
                  {readyCount}{' '}
                  {readyCount === 1
                    ? 'Ready order'
                    : 'Ready orders'}
                </Text>

                <Pressable
                  onPress={handleBulkUpdate}
                  style={({ pressed }) => [
                    styles.startScanButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={styles.startScanButtonText}
                  >
                    Start Scan
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default Order;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  screen: {
    flex: 1,
    backgroundColor: '#f7f8fa',
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 35,
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
    top: 1,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 9,
    backgroundColor: '#d10018',
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
  },

  ordersCountHeader: {
    marginTop: 24,
    marginBottom: 12,
    alignItems: 'flex-end',
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

  filtersContent: {
    width: '100%',
    paddingBottom: 4,
    flexDirection: 'row',
    columnGap: 10,
  },

  filterButton: {
    flex: 1,
    minHeight: 38,
    paddingHorizontal: 12,
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

  loadingContainer: {
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 25,
  },

  loadingCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 9,
  },

  loadingTitle: {
    marginTop: 17,
    color: '#16181d',
    fontSize: 18,
    fontWeight: '800',
  },

  loadingMessage: {
    maxWidth: 280,
    marginTop: 6,
    color: '#737b89',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },

  errorCard: {
    marginTop: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 13,
    backgroundColor: '#fff1f2',
    flexDirection: 'row',
  },

  errorIcon: {
    width: 36,
    height: 36,
    marginRight: 12,
    borderRadius: 18,
    backgroundColor: '#d00018',
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorIconText: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: '900',
  },

  errorContent: {
    flex: 1,
  },

  errorTitle: {
    color: '#9f1239',
    fontSize: 13,
    fontWeight: '800',
  },

  errorMessage: {
    marginTop: 4,
    color: '#881337',
    fontSize: 11,
    lineHeight: 17,
  },

  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#d00018',
  },

  retryButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },

  ordersContainer: {
    marginTop: 14,
    rowGap: 13,
  },

  emptyContainer: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 13,
    backgroundColor: '#ffffff',
  },

  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyIcon: {
    color: '#d00018',
    fontSize: 30,
    fontWeight: '800',
  },

  emptyTitle: {
    marginTop: 15,
    color: '#16181d',
    fontSize: 17,
    fontWeight: '800',
  },

  emptyMessage: {
    maxWidth: 270,
    marginTop: 6,
    color: '#747b88',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
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
    opacity: 0.62,
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
    color: '#a54f59',
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
    fontSize: 17,
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
    transform: [
      {
        rotate: '-45deg',
      },
    ],
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

  bottomSummaryContainer: {
    width: '100%',
    marginTop: 16,
    marginBottom: 60,
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
});