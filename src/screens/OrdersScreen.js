import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
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
import AppAlert from '../components/AppAlert';

import {
  CommonActions,
} from '@react-navigation/native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import AsyncStorage from '@react-native-async-storage/async-storage';

import axios from 'axios';

/* =========================================================
 * API
 * ========================================================= */

const ORDERS_API_URL =
  'https://replete-software.com/projects/kp_admin/api/driver/assigned-orders';

/* =========================================================
 * STORAGE
 * ========================================================= */

const AUTH_TOKEN_KEY =
  '@kp_kitchen_driver_token';

const AUTH_USER_KEY =
  '@kp_kitchen_driver_user';

const AUTH_EMAIL_KEY =
  '@kp_kitchen_driver_email';

/* =========================================================
 * FILTERS
 * ========================================================= */

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

/* =========================================================
 * HELPERS
 * ========================================================= */

const getFirstValue = (...values) => {
  for (
    let index = 0;
    index < values.length;
    index += 1
  ) {
    const value = values[index];

    if (
      value !== null &&
      value !== undefined &&
      value !== ''
    ) {
      return value;
    }
  }

  return '';
};

const getTextValue = (...values) => {
  const value =
    getFirstValue(...values);

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '';
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number'
  ) {
    return String(value);
  }

  if (
    typeof value === 'object'
  ) {
    return String(
      getFirstValue(
        value?.name,
        value?.title,
        value?.label,
        value?.value,
      ),
    );
  }

  return String(value);
};

/* =========================================================
 * EXTRACT ORDERS
 * ========================================================= */

const extractOrdersArray =
  responseData => {
    const possibleArrays = [
      responseData
        ?.data
        ?.orders
        ?.data,

      responseData
        ?.data
        ?.orders,

      responseData
        ?.orders
        ?.data,

      responseData
        ?.orders,

      responseData
        ?.data
        ?.data,

      responseData
        ?.data,

      responseData,
    ];

    for (
      let index = 0;
      index <
      possibleArrays.length;
      index += 1
    ) {
      if (
        Array.isArray(
          possibleArrays[index],
        )
      ) {
        return possibleArrays[index];
      }
    }

    return [];
  };

/* =========================================================
 * STATUS
 * ========================================================= */

const normalizeStatus =
  statusValue =>
    String(
      statusValue ?? '',
    )
      .trim()
      .toLowerCase()
      .replace(
        /[-\s]+/g,
        '_',
      );

const getFilterStatus =
  statusValue => {
    const status =
      normalizeStatus(
        statusValue,
      );

    const deliveredStatuses = [
      'delivered',
      'completed',
      'complete',
      'delivery_completed',
    ];

    return deliveredStatuses.includes(
      status,
    )
      ? 'Delivered'
      : 'Pending';
  };

/* =========================================================
 * TIME
 * ========================================================= */

const formatTime =
  timeValue => {
    if (!timeValue) {
      return 'Time N/A';
    }

    const rawTime =
      String(timeValue);

    const timeMatch =
      rawTime.match(
        /(\d{1,2}):(\d{2})/,
      );

    if (!timeMatch) {
      const parsedDate =
        new Date(rawTime);

      if (
        !Number.isNaN(
          parsedDate.getTime(),
        )
      ) {
        return parsedDate.toLocaleTimeString(
          'en-US',
          {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          },
        );
      }

      return rawTime;
    }

    let hours =
      Number(timeMatch[1]);

    const minutes =
      timeMatch[2];

    if (
      !Number.isFinite(hours) ||
      hours > 23
    ) {
      return rawTime;
    }

    const period =
      hours >= 12
        ? 'PM'
        : 'AM';

    hours %= 12;

    if (hours === 0) {
      hours = 12;
    }

    return `${String(
      hours,
    ).padStart(
      2,
      '0',
    )}:${minutes} ${period}`;
  };

/* =========================================================
 * ADDRESS
 * ========================================================= */

const formatAddress =
  addressValue => {
    if (!addressValue) {
      return '';
    }

    if (
      typeof addressValue ===
        'string' ||
      typeof addressValue ===
        'number'
    ) {
      return String(
        addressValue,
      );
    }

    if (
      typeof addressValue ===
      'object'
    ) {
      const addressParts = [
        addressValue
          ?.address_line_1,

        addressValue
          ?.address_line1,

        addressValue
          ?.address1,

        addressValue
          ?.address_line_2,

        addressValue
          ?.address_line2,

        addressValue
          ?.address2,

        addressValue
          ?.street,

        addressValue
          ?.landmark,

        addressValue
          ?.area,

        addressValue
          ?.city,

        addressValue
          ?.state,

        addressValue
          ?.zipcode,

        addressValue
          ?.zip_code,

        addressValue
          ?.pincode,

        addressValue
          ?.postal_code,
      ].filter(
        part =>
          part !== null &&
          part !== undefined &&
          String(
            part,
          ).trim() !== '',
      );

      return addressParts.join(
        ', ',
      );
    }

    return String(
      addressValue,
    );
  };

/* =========================================================
 * ORDER NUMBER
 * ========================================================= */

const formatOrderNumber =
  value => {
    const orderNumber =
      String(
        value ?? '',
      ).trim();

    if (!orderNumber) {
      return '#N/A';
    }

    if (
      orderNumber.startsWith(
        '#',
      )
    ) {
      return orderNumber;
    }

    return `#${orderNumber}`;
  };

/* =========================================================
 * ITEMS
 *
 * Kept because Order Details receives normalizedOrder.
 * Prices are NOT displayed on this Order list screen.
 * ========================================================= */

const normalizeOrderItems =
  rawOrder => {
    const actualOrder =
      rawOrder?.order ??
      rawOrder?.order_details ??
      rawOrder?.orderDetail ??
      rawOrder;

    const possibleItems =
      getFirstValue(
        actualOrder?.items,
        actualOrder?.order_items,
        actualOrder?.orderItems,
        actualOrder?.tiffin_items,
        actualOrder?.tiffins,

        rawOrder?.items,
        rawOrder?.order_items,
        rawOrder?.orderItems,
        rawOrder?.tiffin_items,
        rawOrder?.tiffins,
      );

    if (
      !Array.isArray(
        possibleItems,
      )
    ) {
      return [];
    }

    return possibleItems.map(
      (item, index) => {
        const tiffin =
          item?.tiffin ??
          item?.product ??
          item?.menu_item ??
          item?.item ??
          {};

        const quantity =
          Number(
            getFirstValue(
              item?.quantity,
              item?.qty,
              item?.pivot?.quantity,
              1,
            ),
          );

        const price =
          Number(
            getFirstValue(
              item?.price,
              item?.unit_price,
              item?.amount,
              item?.subtotal,
              item?.pivot?.price,
              tiffin?.price,
              0,
            ),
          );

        return {
          ...item,

          id:
            item?.id ??
            tiffin?.id ??
            `item-${index}`,

          name:
            getTextValue(
              item?.name,
              item?.item_name,
              item?.title,
              item?.tiffin_name,
              tiffin?.name,
              tiffin?.title,
            ) ||
            `Item ${index + 1}`,

          description:
            getTextValue(
              item?.description,
              item?.item_description,
              tiffin?.description,
            ),

          quantity:
            Number.isFinite(
              quantity,
            )
              ? quantity
              : 1,

          price:
            Number.isFinite(
              price,
            )
              ? price
              : 0,

          image:
            getTextValue(
              item?.image,
              item?.image_url,
              tiffin?.image,
              tiffin?.image_url,
            ),

          customizations:
            item?.customizations ??
            item?.selections ??
            [],

          extras:
            item?.extras ??
            [],
        };
      },
    );
  };

/* =========================================================
 * NORMALIZE ORDER
 * ========================================================= */

const normalizeOrder = (
  rawOrder,
  index,
) => {
  const actualOrder =
    rawOrder?.order ??
    rawOrder?.order_details ??
    rawOrder?.orderDetail ??
    rawOrder;

  const customer =
    actualOrder?.customer ??
    actualOrder?.user ??
    actualOrder
      ?.customer_details ??
    actualOrder
      ?.customerDetail ??
    rawOrder?.customer ??
    rawOrder?.user ??
    rawOrder
      ?.customer_details ??
    rawOrder
      ?.customerDetail ??
    rawOrder?.order
      ?.customer ??
    rawOrder?.order
      ?.user ??
    {};

  /* =====================================================
   * ADDRESS
   * ===================================================== */

  const addressObject =
    getFirstValue(
      actualOrder
        ?.delivery_address,

      actualOrder
        ?.shipping_address,

      actualOrder
        ?.customer_address,

      actualOrder
        ?.address,

      rawOrder
        ?.delivery_address,

      rawOrder
        ?.shipping_address,

      rawOrder
        ?.customer_address,

      rawOrder
        ?.address,

      customer
        ?.delivery_address,

      customer
        ?.address,
    );

  /* =====================================================
   * STATUS
   * ===================================================== */

  const statusValue =
    getTextValue(
      actualOrder
        ?.delivery_status,

      actualOrder
        ?.order_status,

      actualOrder
        ?.status,

      actualOrder
        ?.status_name,

      rawOrder
        ?.delivery_status,

      rawOrder
        ?.order_status,

      rawOrder
        ?.status,

      rawOrder
        ?.status_name,
    );

  const filterStatus =
    getFilterStatus(
      statusValue,
    );

  /* =====================================================
   * PRIORITY
   * ===================================================== */

  const rawPriority =
    getTextValue(
      actualOrder
        ?.priority,

      actualOrder
        ?.priority_name,

      actualOrder
        ?.order_priority,

      rawOrder
        ?.priority,

      rawOrder
        ?.priority_name,

      rawOrder
        ?.order_priority,
    )
      .trim()
      .toLowerCase();

  const isHighPriority =
    rawPriority ===
      'high' ||
    rawPriority ===
      'urgent' ||
    rawPriority ===
      'high priority' ||
    actualOrder
      ?.is_priority ===
      true ||
    actualOrder
      ?.is_priority ===
      1 ||
    actualOrder
      ?.is_priority ===
      '1';

  /* =====================================================
   * PAYMENT STATUS
   *
   * Payment status is kept.
   * Order price is not displayed.
   * ===================================================== */

  let paymentStatus =
    getTextValue(
      actualOrder
        ?.payment_status,

      actualOrder
        ?.payment_method,

      actualOrder
        ?.payment_type,

      rawOrder
        ?.payment_status,

      rawOrder
        ?.payment_method,

      rawOrder
        ?.payment_type,
    )
      .trim()
      .toUpperCase();

  if (
    actualOrder
      ?.is_paid ===
      true ||
    actualOrder
      ?.is_paid ===
      1 ||
    actualOrder
      ?.is_paid ===
      '1'
  ) {
    paymentStatus =
      'PAID';
  }

  if (!paymentStatus) {
    paymentStatus =
      'PENDING';
  }

  const paidPaymentStatuses = [
    'PAID',
    'SUCCESS',
    'COMPLETED',
    'ONLINE',
  ];

  const isPaid =
    paidPaymentStatuses.includes(
      paymentStatus,
    );

  /* =====================================================
   * ORDER ID
   * ===================================================== */

  const orderId =
    getFirstValue(
      actualOrder?.id,
      actualOrder?.order_id,
      actualOrder?.orderId,

      rawOrder?.order_id,
      rawOrder?.orderId,
      rawOrder?.id,

      index + 1,
    );

  /* =====================================================
   * ORDER NUMBER
   * ===================================================== */

  const orderNumber =
    getFirstValue(
      actualOrder
        ?.order_number,

      actualOrder
        ?.order_no,

      actualOrder
        ?.orderNumber,

      actualOrder
        ?.invoice_number,

      rawOrder
        ?.order_number,

      rawOrder
        ?.order_no,

      rawOrder
        ?.orderNumber,

      actualOrder
        ?.id,

      orderId,
    );

  /* =====================================================
   * ZIPCODE
   * ===================================================== */

  const zipcode =
    getTextValue(
      actualOrder?.zipcode,
      actualOrder?.zip_code,
      actualOrder?.pincode,
      actualOrder?.postal_code,

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
      customer?.postal_code,
    );

  /* =====================================================
   * CUSTOMER
   * ===================================================== */

  const customerName =
    getTextValue(
      actualOrder
        ?.customer_name,

      actualOrder
        ?.customer
        ?.name,

      actualOrder
        ?.customer
        ?.full_name,

      actualOrder
        ?.user
        ?.name,

      rawOrder
        ?.customer_name,

      rawOrder
        ?.customer
        ?.name,

      rawOrder
        ?.customer
        ?.full_name,

      customer?.name,
      customer?.full_name,
      customer
        ?.customer_name,
    ) ||
    'Customer';

  /* =====================================================
   * MOBILE
   * ===================================================== */

  const mobile =
    getTextValue(
      actualOrder
        ?.customer_phone,

      actualOrder
        ?.customer_mobile,

      actualOrder
        ?.phone,

      actualOrder
        ?.mobile,

      actualOrder
        ?.customer
        ?.phone,

      actualOrder
        ?.customer
        ?.mobile,

      actualOrder
        ?.customer
        ?.phone_number,

      actualOrder
        ?.customer
        ?.mobile_number,

      rawOrder
        ?.customer_phone,

      rawOrder
        ?.customer_mobile,

      rawOrder
        ?.phone,

      rawOrder
        ?.mobile,

      rawOrder
        ?.customer
        ?.phone,

      rawOrder
        ?.customer
        ?.mobile,

      customer?.phone,
      customer?.mobile,
      customer?.phone_number,
      customer?.mobile_number,
    ) ||
    'Phone not available';

  const items =
    normalizeOrderItems(
      rawOrder,
    );

  /* =====================================================
   * NORMALIZED DATA
   *
   * IMPORTANT:
   * No total order price is shown in Order screen UI.
   *
   * rawOrder and actualOrder are still passed to details.
   * ===================================================== */

  return {
    id:
      String(
        orderId,
      ),

    rawOrder,

    actualOrder,

    orderNumber:
      formatOrderNumber(
        orderNumber,
      ),

    status:
      statusValue ||
      filterStatus,

    filterStatus,

    priority:
      isHighPriority
        ? 'High Priority'
        : 'Standard',

    priorityBackground:
      isHighPriority
        ? '#fff0f1'
        : '#f1f2f4',

    priorityColor:
      isHighPriority
        ? '#d00018'
        : '#6f7785',

    time:
      formatTime(
        getFirstValue(
          actualOrder
            ?.delivery_time,

          actualOrder
            ?.scheduled_time,

          actualOrder
            ?.order_time,

          actualOrder
            ?.pickup_time,

          actualOrder
            ?.created_at,

          rawOrder
            ?.delivery_time,

          rawOrder
            ?.created_at,
        ),
      ),

    paymentStatus,

    paymentBackground:
      isPaid
        ? '#e9f8ef'
        : '#fff4db',

    paymentColor:
      isPaid
        ? '#20844b'
        : '#a86f00',

    customerName,

    mobile,

    address:
      formatAddress(
        addressObject,
      ) ||
      'Delivery address not available',

    zipcode:
      zipcode ||
      'N/A',

    notes:
      getTextValue(
        actualOrder
          ?.order_notes,

        actualOrder
          ?.notes,

        rawOrder
          ?.order_notes,

        rawOrder
          ?.notes,
      ),

    items,

    disabled:
      filterStatus ===
      'Delivered',
  };
};

/* =========================================================
 * ORDER SCREEN
 * ========================================================= */

const Order = ({
  navigation,
}) => {
  const {
    width,
  } =
    useWindowDimensions();

  /* =====================================================
   * STATE
   * ===================================================== */

  const [
    orders,
    setOrders,
  ] =
    useState([]);

  const [
    activeFilter,
    setActiveFilter,
  ] =
    useState(
      'Pending',
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] =
    useState(false);

  const [
    ordersError,
    setOrdersError,
  ] =
    useState('');

  /* =====================================================
   * RESPONSIVE
   * ===================================================== */

  const isSmallScreen =
    width <= 360;

  const screenPadding =
    isSmallScreen
      ? 12
      : 16;

  /* =====================================================
   * LOGIN
   * ===================================================== */

  const goToLoginScreen =
    () => {
      const parentNavigation =
        navigation.getParent?.();

      const target =
        parentNavigation ||
        navigation;

      target.dispatch(
        CommonActions.reset({
          index: 0,

          routes: [
            {
              name:
                'Login',
            },
          ],
        }),
      );
    };

  const clearLoginSession =
    async () => {
      await AsyncStorage.multiRemove(
        [
          AUTH_TOKEN_KEY,
          AUTH_USER_KEY,
          AUTH_EMAIL_KEY,
        ],
      );

      delete axios
        .defaults
        .headers
        .common
        .Authorization;
    };

  /* =====================================================
   * ERROR
   * ===================================================== */

  const getOrdersErrorMessage =
    error => {
      if (
        error
          ?.response
          ?.data
          ?.errors
      ) {
        const messages =
          Object.values(
            error
              .response
              .data
              .errors,
          )
            .flat()
            .filter(
              Boolean,
            );

        if (
          messages.length
        ) {
          return messages.join(
            '\n',
          );
        }
      }

      return (
        error
          ?.response
          ?.data
          ?.message ||
        error
          ?.response
          ?.data
          ?.error ||
        error
          ?.message ||
        'Unable to load your orders.'
      );
    };

  /* =====================================================
   * FETCH ORDERS
   * ===================================================== */

  const fetchOrders =
    async (
      refreshing =
        false,
    ) => {
      try {
        if (refreshing) {
          setIsRefreshing(
            true,
          );
        } else {
          setIsLoading(
            true,
          );
        }

        setOrdersError('');

        const savedToken =
          await AsyncStorage.getItem(
            AUTH_TOKEN_KEY,
          );

        if (!savedToken) {
          await clearLoginSession();

          goToLoginScreen();

          return;
        }

        const response =
          await axios.get(
            ORDERS_API_URL,

            {
              headers: {
                Accept:
                  'application/json',

                Authorization:
                  `Bearer ${savedToken}`,
              },

              timeout:
                20000,
            },
          );

        const responseData =
          response.data;

        if (
          responseData
            ?.status ===
            false ||
          responseData
            ?.success ===
            false
        ) {
          throw new Error(
            responseData
              ?.message ||
              'Unable to load orders.',
          );
        }

        const rawOrders =
          extractOrdersArray(
            responseData,
          );

        const normalizedOrders =
          rawOrders.map(
            (
              rawOrder,
              index,
            ) =>
              normalizeOrder(
                rawOrder,
                index,
              ),
          );

        setOrders(
          normalizedOrders,
        );
      } catch (error) {
        console.log(
          'ORDERS ERROR:',
          error
            ?.response
            ?.data ??
            error,
        );

        if (
          error
            ?.response
            ?.status ===
            401 ||
          error
            ?.response
            ?.status ===
            403
        ) {
          await clearLoginSession();

          AppAlert.alert(
            'Session Expired',

            'Please login again.',

            [
              {
                text:
                  'Login',

                onPress:
                  goToLoginScreen,
              },
            ],

            {
              cancelable:
                false,
            },
          );

          return;
        }

        setOrdersError(
          getOrdersErrorMessage(
            error,
          ),
        );
      } finally {
        setIsLoading(
          false,
        );

        setIsRefreshing(
          false,
        );
      }
    };

  /* =====================================================
   * INITIAL LOAD
   * ===================================================== */

  useEffect(() => {
    fetchOrders();
  }, []);

  /* =====================================================
   * COUNTS
   * ===================================================== */

  const pendingCount =
    useMemo(
      () =>
        orders.filter(
          order =>
            order
              .filterStatus ===
            'Pending',
        ).length,

      [orders],
    );

  const deliveredCount =
    useMemo(
      () =>
        orders.filter(
          order =>
            order
              .filterStatus ===
            'Delivered',
        ).length,

      [orders],
    );

  const filteredOrders =
    useMemo(
      () =>
        orders.filter(
          order =>
            order
              .filterStatus ===
            activeFilter,
        ),

      [
        activeFilter,
        orders,
      ],
    );

  const getFilterCount =
    title =>
      title ===
      'Delivered'
        ? deliveredCount
        : pendingCount;

  /* =====================================================
   * VIEW DETAILS
   * ===================================================== */

  const handleViewDetails =
    order => {
      navigation.navigate(
        'OrderDetail',

        {
          orderId:
            order.id,

          order:
            order.rawOrder,

          normalizedOrder:
            order,
        },
      );
    };

  /* =====================================================
   * CALL
   * ===================================================== */

  const handleCall =
    async order => {
      const mobile =
        String(
          order?.mobile ??
            '',
        ).trim();

      if (
        !mobile ||
        mobile ===
          'Phone not available'
      ) {
        AppAlert.alert(
          'Phone Unavailable',

          'Customer mobile number was not returned by the order API.',
        );

        return;
      }

      const cleanPhone =
        mobile.replace(
          /[^\d+]/g,
          '',
        );

      if (!cleanPhone) {
        AppAlert.alert(
          'Invalid Phone',

          'The customer phone number is invalid.',
        );

        return;
      }

      try {
        await Linking.openURL(
          `tel:${cleanPhone}`,
        );
      } catch (error) {
        AppAlert.alert(
          'Call Failed',

          'Unable to open your phone application.',
        );
      }
    };

  /* =====================================================
   * NAVIGATE
   * ===================================================== */

  const handleNavigate =
    async order => {
      if (
        !order?.address ||
        order.address ===
          'Delivery address not available'
      ) {
        AppAlert.alert(
          'Address Unavailable',

          'Customer delivery address is not available.',
        );

        return;
      }

      const mapUrl =
        'https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent(
          order.address,
        );

      try {
        await Linking.openURL(
          mapUrl,
        );
      } catch (error) {
        AppAlert.alert(
          'Navigation Failed',

          'Unable to open Google Maps.',
        );
      }
    };

  /* =====================================================
   * UI
   * ===================================================== */

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
      edges={[
        'top',
        'left',
        'right',
      ]}
    >
      <View
        style={
          styles.screen
        }
      >
        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <View
          style={
            styles.header
          }
        >
          <View
            pointerEvents="none"
            style={
              styles.headerCircleOne
            }
          />

          <View
            pointerEvents="none"
            style={
              styles.headerCircleTwo
            }
          />

          <View
            style={
              styles.headerTopRow
            }
          >
            {/* BACK */}

            <Pressable
              onPress={() =>
                navigation.goBack()
              }
              hitSlop={10}
              style={({
                pressed,
              }) => [
                styles.headerBackButton,

                pressed &&
                  styles.headerPressed,
              ]}
            >
              <Image
                source={require('../assets/login-icons/back.png')}
                style={
                  styles.headerBackIcon
                }
                resizeMode="contain"
              />
            </Pressable>

            {/* TITLE */}

            <View
              style={
                styles.headerTitleArea
              }
            >
              <Text
                style={
                  styles.headerEyebrow
                }
              >
                KP'S KITCHEN
              </Text>

              <Text
                style={
                  styles.headerTitle
                }
              >
                My Orders
              </Text>
            </View>

            {/* TOTAL ORDERS */}

            <View
              style={
                styles.headerOrderBadge
              }
            >
              <Text
                style={
                  styles.headerOrderBadgeValue
                }
              >
                {orders.length}
              </Text>

              <Text
                style={
                  styles.headerOrderBadgeLabel
                }
              >
                TOTAL
              </Text>
            </View>
          </View>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            Manage your assigned deliveries
          </Text>

          {/* ================================================= */}
          {/* HEADER STATUS */}
          {/* ================================================= */}

          <View
            style={
              styles.headerStatsRow
            }
          >
            {/* PENDING */}

            <View
              style={
                styles.headerStatCard
              }
            >
              <View
                style={
                  styles.pendingHeaderIcon
                }
              >
                <Text
                  style={
                    styles.pendingHeaderIconText
                  }
                >
                  ◷
                </Text>
              </View>

              <View>
                <Text
                  style={
                    styles.headerStatValue
                  }
                >
                  {String(
                    pendingCount,
                  ).padStart(
                    2,
                    '0',
                  )}
                </Text>

                <Text
                  style={
                    styles.headerStatLabel
                  }
                >
                  Pending
                </Text>
              </View>
            </View>

            <View
              style={
                styles.headerStatDivider
              }
            />

            {/* DELIVERED */}

            <View
              style={
                styles.headerStatCard
              }
            >
              <View
                style={
                  styles.deliveredHeaderIcon
                }
              >
                <Text
                  style={
                    styles.deliveredHeaderIconText
                  }
                >
                  ✓
                </Text>
              </View>

              <View>
                <Text
                  style={
                    styles.headerStatValue
                  }
                >
                  {String(
                    deliveredCount,
                  ).padStart(
                    2,
                    '0',
                  )}
                </Text>

                <Text
                  style={
                    styles.headerStatLabel
                  }
                >
                  Delivered
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ================================================= */}
        {/* CONTENT */}
        {/* ================================================= */}

        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={
                isRefreshing
              }
              onRefresh={() =>
                fetchOrders(
                  true,
                )
              }
              colors={[
                '#d00018',
              ]}
              tintColor="#d00018"
            />
          }
          contentContainerStyle={[
            styles.scrollContent,

            {
              paddingHorizontal:
                screenPadding,
            },
          ]}
        >
          {/* ================================================= */}
          {/* FILTER */}
          {/* ================================================= */}

          <View
            style={
              styles.filterPanel
            }
          >
            <View
              style={
                styles.filterHeadingRow
              }
            >
              <View
                style={
                  styles.filterTitleArea
                }
              >
                <Text
                  style={
                    styles.filterHeading
                  }
                >
                  Your Deliveries
                </Text>

                <Text
                  style={
                    styles.filterSubheading
                  }
                >
                  View orders by delivery status
                </Text>
              </View>

              <View
                style={
                  styles.foundBadge
                }
              >
                <Text
                  style={
                    styles.foundBadgeText
                  }
                >
                  {filteredOrders.length}{' '}
                  found
                </Text>
              </View>
            </View>

            <View
              style={
                styles.filters
              }
            >
              {filters.map(
                filter => {
                  const active =
                    activeFilter ===
                    filter.title;

                  return (
                    <Pressable
                      key={
                        filter.id
                      }
                      onPress={() =>
                        setActiveFilter(
                          filter.title,
                        )
                      }
                      style={({
                        pressed,
                      }) => [
                        styles.filterButton,

                        active &&
                          styles.activeFilter,

                        pressed &&
                          styles.filterPressed,
                      ]}
                    >
                      <View
                        style={[
                          styles.filterDot,

                          active &&
                            styles.activeFilterDot,
                        ]}
                      />

                      <Text
                        style={[
                          styles.filterText,

                          active &&
                            styles.activeFilterText,
                        ]}
                      >
                        {filter.title}
                      </Text>

                      <View
                        style={[
                          styles.filterCount,

                          active &&
                            styles.activeFilterCount,
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterCountText,

                            active &&
                              styles.activeFilterCountText,
                          ]}
                        >
                          {getFilterCount(
                            filter.title,
                          )}
                        </Text>
                      </View>
                    </Pressable>
                  );
                },
              )}
            </View>
          </View>

          {/* ================================================= */}
          {/* LOADING */}
          {/* ================================================= */}

          {isLoading && (
            <View
              style={
                styles.loading
              }
            >
              <View
                style={
                  styles.loadingCircle
                }
              >
                <ActivityIndicator
                  size="large"
                  color="#d00018"
                />
              </View>

              <Text
                style={
                  styles.loadingTitle
                }
              >
                Loading Orders
              </Text>

              <Text
                style={
                  styles.loadingText
                }
              >
                Retrieving your assigned
                deliveries...
              </Text>
            </View>
          )}

          {/* ================================================= */}
          {/* ERROR */}
          {/* ================================================= */}

          {!isLoading &&
            !!ordersError && (
              <View
                style={
                  styles.errorCard
                }
              >
                <View
                  style={
                    styles.errorIcon
                  }
                >
                  <Text
                    style={
                      styles.errorIconText
                    }
                  >
                    !
                  </Text>
                </View>

                <View
                  style={
                    styles.errorContent
                  }
                >
                  <Text
                    style={
                      styles.errorTitle
                    }
                  >
                    Unable to Load Orders
                  </Text>

                  <Text
                    style={
                      styles.errorText
                    }
                  >
                    {ordersError}
                  </Text>

                  <Pressable
                    style={
                      styles.retryButton
                    }
                    onPress={() =>
                      fetchOrders()
                    }
                  >
                    <Text
                      style={
                        styles.retryText
                      }
                    >
                      Try Again
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

          {/* ================================================= */}
          {/* ORDER LIST */}
          {/* ================================================= */}

          {!isLoading &&
            !ordersError &&
            filteredOrders.map(
              order => (
                <View
                  key={
                    order.id
                  }
                  style={[
                    styles.orderCard,

                    order.disabled &&
                      styles.disabledCard,
                  ]}
                >
                  {/* ======================================= */}
                  {/* ORDER TOP */}
                  {/* ======================================= */}

                  <View
                    style={
                      styles.orderCardTop
                    }
                  >
                    <View
                      style={
                        styles.orderMainInfo
                      }
                    >
                      <View
                        style={
                          styles.orderLabelRow
                        }
                      >
                        <Text
                          style={
                            styles.orderSmallLabel
                          }
                        >
                          ORDER
                        </Text>

                        <View
                          style={[
                            styles.priorityBadge,

                            {
                              backgroundColor:
                                order
                                  .priorityBackground,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.priorityText,

                              {
                                color:
                                  order
                                    .priorityColor,
                              },
                            ]}
                          >
                            {order.priority}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={
                          styles.orderNumber
                        }
                      >
                        {order.orderNumber}
                      </Text>

                      <View
                        style={
                          styles.orderTimeRow
                        }
                      >
                        <View
                          style={
                            styles.timeIconCircle
                          }
                        >
                          <Text
                            style={
                              styles.timeIconText
                            }
                          >
                            ◷
                          </Text>
                        </View>

                        <Text
                          style={
                            styles.orderTime
                          }
                        >
                          {order.time}
                        </Text>
                      </View>
                    </View>

                    {/* =======================================
                     * PAYMENT STATUS ONLY
                     *
                     * PRICE REMOVED
                     * ======================================= */}

                    <View
                      style={
                        styles.paymentArea
                      }
                    >
                      <Text
                        style={
                          styles.paymentLabel
                        }
                      >
                        PAYMENT
                      </Text>

                      <View
                        style={[
                          styles.paymentBadge,

                          {
                            backgroundColor:
                              order
                                .paymentBackground,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.paymentText,

                            {
                              color:
                                order
                                  .paymentColor,
                            },
                          ]}
                        >
                          {order.paymentStatus}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View
                    style={
                      styles.cardDivider
                    }
                  />

                  {/* ======================================= */}
                  {/* CUSTOMER */}
                  {/* ======================================= */}

                  <View
                    style={
                      styles.customerRow
                    }
                  >
                    <View
                      style={
                        styles.customerAvatar
                      }
                    >
                      <Text
                        style={
                          styles.customerAvatarText
                        }
                      >
                        {order
                          .customerName
                          ?.charAt(0)
                          ?.toUpperCase() ||
                          'C'}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.customerInfo
                      }
                    >
                      <Text
                        style={
                          styles.customerLabel
                        }
                      >
                        CUSTOMER
                      </Text>

                      <Text
                        numberOfLines={1}
                        style={
                          styles.customerName
                        }
                      >
                        {order.customerName}
                      </Text>

                      <View
                        style={
                          styles.mobileRow
                        }
                      >
                        <Text
                          style={
                            styles.mobileSymbol
                          }
                        >
                          ☎
                        </Text>

                        <Text
                          numberOfLines={1}
                          style={[
                            styles.customerMobile,

                            order.mobile ===
                              'Phone not available' &&
                              styles.unavailableText,
                          ]}
                        >
                          {order.mobile}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* ======================================= */}
                  {/* ADDRESS */}
                  {/* ======================================= */}

                  <View
                    style={
                      styles.addressBox
                    }
                  >
                    <View
                      style={
                        styles.addressPinCircle
                      }
                    >
                      <Text
                        style={
                          styles.addressPin
                        }
                      >
                        ⌖
                      </Text>
                    </View>

                    <View
                      style={
                        styles.addressContent
                      }
                    >
                      <Text
                        style={
                          styles.addressLabel
                        }
                      >
                        DELIVERY ADDRESS
                      </Text>

                      <Text
                        numberOfLines={2}
                        style={
                          styles.customerAddress
                        }
                      >
                        {order.address}
                      </Text>
                    </View>
                  </View>

                  {/* ======================================= */}
                  {/* ACTIONS */}
                  {/* ======================================= */}

                  <View
                    style={
                      styles.actions
                    }
                  >
                    {/* DETAILS */}

                    <Pressable
                      onPress={() =>
                        handleViewDetails(
                          order,
                        )
                      }
                      style={({
                        pressed,
                      }) => [
                        styles.detailsButton,

                        pressed &&
                          styles.actionPressed,
                      ]}
                    >
                      <View
                        style={
                          styles.detailsIconCircle
                        }
                      >
                        <Text
                          style={
                            styles.detailsIcon
                          }
                        >
                          ≡
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.detailsText
                        }
                      >
                        View Details
                      </Text>
                    </Pressable>

                    {/* CALL */}

                    <Pressable
                      onPress={() =>
                        handleCall(
                          order,
                        )
                      }
                      style={({
                        pressed,
                      }) => [
                        styles.callButton,

                        pressed &&
                          styles.actionPressed,
                      ]}
                    >
                      <Image
                        source={require('../assets/login-icons/phone-call.png')}
                        style={
                          styles.phoneIcon
                        }
                        resizeMode="contain"
                      />
                    </Pressable>

                    {/* NAVIGATE */}

                    <Pressable
                      onPress={() =>
                        handleNavigate(
                          order,
                        )
                      }
                      style={({
                        pressed,
                      }) => [
                        styles.navigateButton,

                        pressed &&
                          styles.navigatePressed,
                      ]}
                    >
                      <Text
                        style={
                          styles.navigateIcon
                        }
                      >
                        ➤
                      </Text>

                      <Text
                        style={
                          styles.navigateText
                        }
                      >
                        Navigate
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ),
            )}

          {/* ================================================= */}
          {/* EMPTY */}
          {/* ================================================= */}

          {!isLoading &&
            !ordersError &&
            filteredOrders.length ===
              0 && (
              <View
                style={
                  styles.empty
                }
              >
                <View
                  style={
                    styles.emptyIconCircle
                  }
                >
                  <Text
                    style={
                      styles.emptyIcon
                    }
                  >
                    □
                  </Text>
                </View>

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  No Orders Found
                </Text>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  No{' '}
                  {activeFilter.toLowerCase()}{' '}
                  orders are currently
                  available.
                </Text>
              </View>
            )}

          {/* =================================================
           *
           * UPCOMING SECTION REMOVED
           * BULK UPDATE SECTION REMOVED
           *
           * ================================================= */}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default Order;

/* =========================================================
 * STYLES
 *
 * Font sizes increased by approximately +2px from
 * your provided Order screen.
 * ========================================================= */

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,

      backgroundColor:
        '#a9090d',
    },

    screen: {
      flex: 1,

      backgroundColor:
        '#f6f7f9',
    },

    /* =====================================================
     * HEADER
     * ===================================================== */

    header: {
      minHeight: 215,

      backgroundColor:
        '#a9090d',

      paddingHorizontal: 17,

      paddingTop: 12,

      paddingBottom: 25,

      borderBottomLeftRadius:
        28,

      borderBottomRightRadius:
        28,

      overflow:
        'hidden',

      elevation: 8,

      shadowColor:
        '#700000',

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity: 0.24,

      shadowRadius: 10,
    },

    headerCircleOne: {
      position:
        'absolute',

      width: 190,

      height: 190,

      borderRadius: 95,

      borderWidth: 1,

      borderColor:
        'rgba(255,255,255,0.09)',

      top: -85,

      right: -60,
    },

    headerCircleTwo: {
      position:
        'absolute',

      width: 130,

      height: 130,

      borderRadius: 65,

      backgroundColor:
        'rgba(255,255,255,0.035)',

      bottom: -70,

      left: -30,
    },

    headerTopRow: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    headerBackButton: {
      width: 42,

      height: 42,

      borderRadius: 13,

      backgroundColor:
        'rgba(255,255,255,0.13)',

      borderWidth: 1,

      borderColor:
        'rgba(255,255,255,0.11)',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    headerBackIcon: {
      width: 18,

      height: 18,

      tintColor:
        '#ffffff',
    },

    headerPressed: {
      opacity: 0.7,

      transform: [
        {
          scale: 0.95,
        },
      ],
    },

    headerTitleArea: {
      flex: 1,

      marginLeft: 12,
    },

    headerEyebrow: {
      color:
        '#f4c454',

      /* 7 -> 9 */

      fontSize: 9,

      lineHeight: 12,

      fontWeight:
        '900',

      letterSpacing: 1.1,
    },

    headerTitle: {
      color:
        '#ffffff',

      /* 20 -> 22 */

      fontSize: 22,

      lineHeight: 27,

      fontWeight:
        '900',

      marginTop: 1,
    },

    headerOrderBadge: {
      width: 48,

      minHeight: 48,

      borderRadius: 14,

      backgroundColor:
        '#ffffff',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    headerOrderBadgeValue: {
      color:
        '#a9090d',

      /* 14 -> 16 */

      fontSize: 16,

      lineHeight: 19,

      fontWeight:
        '900',
    },

    headerOrderBadgeLabel: {
      color:
        '#8e5557',

      fontSize: 7.5,

      fontWeight:
        '800',

      letterSpacing: 0.6,
    },

    headerSubtitle: {
      color:
        'rgba(255,255,255,0.72)',

      fontSize: 12,

      lineHeight: 17,

      marginTop: 14,
    },

    /* =====================================================
     * HEADER STATS
     * ===================================================== */

    headerStatsRow: {
      minHeight: 70,

      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        'rgba(0,0,0,0.12)',

      borderWidth: 1,

      borderColor:
        'rgba(255,255,255,0.08)',

      borderRadius: 16,

      marginTop: 13,

      paddingHorizontal: 13,
    },

    headerStatCard: {
      flex: 1,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    headerStatDivider: {
      width: 1,

      height: 35,

      backgroundColor:
        'rgba(255,255,255,0.16)',
    },

    pendingHeaderIcon: {
      width: 36,

      height: 36,

      borderRadius: 11,

      backgroundColor:
        'rgba(244,196,84,0.18)',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight: 9,
    },

    pendingHeaderIconText: {
      color:
        '#f4c454',

      fontSize: 19,

      fontWeight:
        '700',
    },

    deliveredHeaderIcon: {
      width: 36,

      height: 36,

      borderRadius: 11,

      backgroundColor:
        'rgba(105,230,141,0.17)',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight: 9,
    },

    deliveredHeaderIconText: {
      color:
        '#69e68d',

      fontSize: 18,

      fontWeight:
        '900',
    },

    headerStatValue: {
      color:
        '#ffffff',

      fontSize: 21,

      lineHeight: 24,

      fontWeight:
        '900',
    },

    headerStatLabel: {
      color:
        'rgba(255,255,255,0.68)',

      fontSize: 9,

      marginTop: 1,
    },

    /* =====================================================
     * SCROLL
     * ===================================================== */

    scrollContent: {
      flexGrow: 1,

      paddingTop: 17,

      paddingBottom: 100,
    },

    /* =====================================================
     * FILTER
     * ===================================================== */

    filterPanel: {
      backgroundColor:
        '#ffffff',

      borderRadius: 16,

      borderWidth: 1,

      borderColor:
        '#eceef1',

      padding: 14,

      marginBottom: 15,

      elevation: 2,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity: 0.04,

      shadowRadius: 5,
    },

    filterHeadingRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginBottom: 13,
    },

    filterTitleArea: {
      flex: 1,

      paddingRight: 10,
    },

    filterHeading: {
      color:
        '#17191d',

      fontSize: 17,

      lineHeight: 21,

      fontWeight:
        '900',
    },

    filterSubheading: {
      color:
        '#848b96',

      fontSize: 10,

      lineHeight: 14,

      marginTop: 2,
    },

    foundBadge: {
      backgroundColor:
        '#f4f5f7',

      borderRadius: 10,

      paddingHorizontal: 8,

      paddingVertical: 5,
    },

    foundBadgeText: {
      color:
        '#676f7b',

      fontSize: 9,

      fontWeight:
        '700',
    },

    filters: {
      flexDirection:
        'row',

      columnGap: 8,
    },

    filterButton: {
      flex: 1,

      minHeight: 44,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius: 12,

      backgroundColor:
        '#f3f4f6',

      borderWidth: 1,

      borderColor:
        '#eceef1',

      paddingHorizontal: 5,
    },

    activeFilter: {
      backgroundColor:
        '#a9090d',

      borderColor:
        '#a9090d',
    },

    filterPressed: {
      opacity: 0.8,
    },

    filterDot: {
      width: 6,

      height: 6,

      borderRadius: 3,

      backgroundColor:
        '#a5abb4',

      marginRight: 6,
    },

    activeFilterDot: {
      backgroundColor:
        '#f4c454',
    },

    filterText: {
      color:
        '#5d6572',

      fontSize: 11.5,

      fontWeight:
        '800',
    },

    activeFilterText: {
      color:
        '#ffffff',
    },

    filterCount: {
      minWidth: 24,

      height: 24,

      borderRadius: 12,

      backgroundColor:
        '#ffffff',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginLeft: 6,
    },

    activeFilterCount: {
      backgroundColor:
        'rgba(255,255,255,0.17)',
    },

    filterCountText: {
      color:
        '#a9090d',

      fontSize: 10,

      fontWeight:
        '900',
    },

    activeFilterCountText: {
      color:
        '#ffffff',
    },

    /* =====================================================
     * LOADING
     * ===================================================== */

    loading: {
      minHeight: 270,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    loadingCircle: {
      width: 70,

      height: 70,

      borderRadius: 35,

      backgroundColor:
        '#ffffff',

      alignItems:
        'center',

      justifyContent:
        'center',

      elevation: 4,
    },

    loadingTitle: {
      color:
        '#17191d',

      fontSize: 18,

      fontWeight:
        '900',

      marginTop: 14,
    },

    loadingText: {
      color:
        '#747d8c',

      fontSize: 11,

      marginTop: 5,
    },

    /* =====================================================
     * ERROR
     * ===================================================== */

    errorCard: {
      flexDirection:
        'row',

      padding: 14,

      borderRadius: 14,

      backgroundColor:
        '#fff1f2',

      borderWidth: 1,

      borderColor:
        '#fecdd3',

      marginBottom: 15,
    },

    errorIcon: {
      width: 35,

      height: 35,

      borderRadius: 18,

      backgroundColor:
        '#d00018',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight: 11,
    },

    errorIconText: {
      color:
        '#ffffff',

      fontSize: 20,

      fontWeight:
        '900',
    },

    errorContent: {
      flex: 1,
    },

    errorTitle: {
      color:
        '#9f1239',

      fontSize: 14,

      fontWeight:
        '900',
    },

    errorText: {
      color:
        '#881337',

      fontSize: 11,

      lineHeight: 16,

      marginTop: 4,
    },

    retryButton: {
      alignSelf:
        'flex-start',

      backgroundColor:
        '#d00018',

      paddingHorizontal: 12,

      paddingVertical: 7,

      borderRadius: 7,

      marginTop: 9,
    },

    retryText: {
      color:
        '#ffffff',

      fontSize: 10,

      fontWeight:
        '800',
    },

    /* =====================================================
     * ORDER CARD
     * ===================================================== */

    orderCard: {
      backgroundColor:
        '#ffffff',

      borderWidth: 1,

      borderColor:
        '#e9ebee',

      borderRadius: 17,

      padding: 15,

      marginBottom: 13,

      elevation: 3,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,
        height: 3,
      },

      shadowOpacity: 0.055,

      shadowRadius: 7,
    },

    disabledCard: {
      opacity: 0.72,
    },

    orderCardTop: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      alignItems:
        'flex-start',
    },

    orderMainInfo: {
      flex: 1,

      minWidth: 0,

      paddingRight: 10,
    },

    orderLabelRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      flexWrap:
        'wrap',
    },

    orderSmallLabel: {
      color:
        '#969da7',

      fontSize: 9,

      fontWeight:
        '900',

      letterSpacing: 0.7,
    },

    priorityBadge: {
      marginLeft: 7,

      borderRadius: 8,

      paddingHorizontal: 7,

      paddingVertical: 3,
    },

    priorityText: {
      fontSize: 8.5,

      fontWeight:
        '800',
    },

    orderNumber: {
      color:
        '#17191d',

      fontSize: 20,

      lineHeight: 25,

      fontWeight:
        '900',

      marginTop: 4,
    },

    orderTimeRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop: 7,
    },

    timeIconCircle: {
      width: 24,

      height: 24,

      borderRadius: 7,

      backgroundColor:
        '#f3f4f6',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight: 6,
    },

    timeIconText: {
      color:
        '#6e7785',

      fontSize: 13,
    },

    orderTime: {
      color:
        '#697386',

      fontSize: 11,

      fontWeight:
        '600',
    },

    /* =====================================================
     * PAYMENT STATUS
     *
     * ORDER PRICE STYLES REMOVED
     * ===================================================== */

    paymentArea: {
      alignItems:
        'flex-end',

      justifyContent:
        'flex-start',
    },

    paymentLabel: {
      color:
        '#969da7',

      fontSize: 8,

      fontWeight:
        '900',

      letterSpacing: 0.7,

      marginBottom: 5,
    },

    paymentBadge: {
      borderRadius: 8,

      paddingHorizontal: 9,

      paddingVertical: 6,
    },

    paymentText: {
      fontSize: 8.5,

      fontWeight:
        '900',
    },

    cardDivider: {
      height: 1,

      backgroundColor:
        '#f0f1f3',

      marginVertical: 14,
    },

    /* =====================================================
     * CUSTOMER
     * ===================================================== */

    customerRow: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    customerAvatar: {
      width: 50,

      height: 50,

      borderRadius: 15,

      backgroundColor:
        '#fff0f1',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight: 11,
    },

    customerAvatarText: {
      color:
        '#a9090d',

      fontSize: 20,

      fontWeight:
        '900',
    },

    customerInfo: {
      flex: 1,

      minWidth: 0,
    },

    customerLabel: {
      color:
        '#999fa8',

      fontSize: 8,

      fontWeight:
        '900',

      letterSpacing: 0.7,
    },

    customerName: {
      color:
        '#17191d',

      fontSize: 15,

      lineHeight: 19,

      fontWeight:
        '900',

      marginTop: 2,
    },

    mobileRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop: 5,
    },

    mobileSymbol: {
      color:
        '#a9090d',

      fontSize: 12,

      marginRight: 5,
    },

    customerMobile: {
      flexShrink: 1,

      color:
        '#606978',

      fontSize: 11,
    },

    unavailableText: {
      color:
        '#b1b4bb',
    },

    /* =====================================================
     * ADDRESS
     * ===================================================== */

    addressBox: {
      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        '#f8f8fa',

      borderRadius: 11,

      paddingHorizontal: 11,

      paddingVertical: 10,

      marginTop: 13,
    },

    addressPinCircle: {
      width: 33,

      height: 33,

      borderRadius: 10,

      backgroundColor:
        '#fff0f1',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight: 9,
    },

    addressPin: {
      color:
        '#a9090d',

      fontSize: 17,

      fontWeight:
        '800',
    },

    addressContent: {
      flex: 1,

      minWidth: 0,
    },

    addressLabel: {
      color:
        '#9b9fa7',

      fontSize: 8,

      fontWeight:
        '900',

      letterSpacing: 0.6,
    },

    customerAddress: {
      color:
        '#59616e',

      fontSize: 10.5,

      lineHeight: 15,

      marginTop: 2,
    },

    /* =====================================================
     * ACTIONS
     * ===================================================== */

    actions: {
      flexDirection:
        'row',

      alignItems:
        'center',

      columnGap: 7,

      marginTop: 14,
    },

    detailsButton: {
      flex: 1.2,

      minHeight: 45,

      borderRadius: 10,

      borderWidth: 1,

      borderColor:
        '#eadcdd',

      backgroundColor:
        '#ffffff',

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal: 5,
    },

    detailsIconCircle: {
      width: 24,

      height: 24,

      borderRadius: 7,

      backgroundColor:
        '#fff0f1',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight: 6,
    },

    detailsIcon: {
      color:
        '#a9090d',

      fontSize: 14,

      fontWeight:
        '900',
    },

    detailsText: {
      color:
        '#23262c',

      fontSize: 10.5,

      fontWeight:
        '900',
    },

    callButton: {
      width: 46,

      height: 45,

      borderRadius: 10,

      borderWidth: 1,

      borderColor:
        '#eadcdd',

      backgroundColor:
        '#fff8f8',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    phoneIcon: {
      width: 18,

      height: 18,

      tintColor:
        '#a9090d',
    },

    navigateButton: {
      flex: 1.25,

      minHeight: 45,

      borderRadius: 10,

      backgroundColor:
        '#a9090d',

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal: 5,

      elevation: 2,
    },

    navigateIcon: {
      color:
        '#ffffff',

      fontSize: 17,

      marginRight: 6,

      transform: [
        {
          rotate:
            '-45deg',
        },
      ],
    },

    navigateText: {
      color:
        '#ffffff',

      fontSize: 10.5,

      fontWeight:
        '900',
    },

    actionPressed: {
      opacity: 0.65,
    },

    navigatePressed: {
      opacity: 0.85,

      transform: [
        {
          scale: 0.99,
        },
      ],
    },

    /* =====================================================
     * EMPTY
     * ===================================================== */

    empty: {
      minHeight: 260,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#ffffff',

      borderRadius: 16,

      borderWidth: 1,

      borderColor:
        '#eceef1',

      padding: 20,

      marginBottom: 30,
    },

    emptyIconCircle: {
      width: 60,

      height: 60,

      borderRadius: 30,

      backgroundColor:
        '#fff0f1',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    emptyIcon: {
      color:
        '#a9090d',

      /* 27 -> 29 */

      fontSize: 29,
    },

    emptyTitle: {
      color:
        '#17191d',

      /* 16 -> 18 */

      fontSize: 18,

      fontWeight:
        '900',

      marginTop: 12,
    },

    emptyText: {
      color:
        '#747d8c',

      /* 9 -> 11 */

      fontSize: 11,

      lineHeight: 16,

      marginTop: 5,

      textAlign:
        'center',
    },
  });