import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  CommonActions,
  useFocusEffect,
} from '@react-navigation/native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import axios from 'axios';

/* =========================================================
 * Orders API
 *
 * Same API used by your Orders screen.
 * ========================================================= */

const ORDERS_API_URL =
  'https://replete-software.com/projects/kp_admin/api/driver/assigned-orders';

/* =========================================================
 * Authentication
 *
 * Same storage keys used by your Orders screen.
 * ========================================================= */

const AUTH_TOKEN_KEY =
  '@kp_kitchen_driver_token';

const AUTH_USER_KEY =
  '@kp_kitchen_driver_user';

const AUTH_EMAIL_KEY =
  '@kp_kitchen_driver_email';

/* =========================================================
 * Helpers
 * ========================================================= */

const getFirstValue =
  (...values) => {
    for (
      let index = 0;
      index < values.length;
      index += 1
    ) {
      const value =
        values[index];

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

/* =========================================================
 * Text Helper
 * ========================================================= */

const getTextValue =
  (...values) => {
    const value =
      getFirstValue(
        ...values,
      );

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return '';
    }

    if (
      typeof value ===
        'string' ||
      typeof value ===
        'number'
    ) {
      return String(
        value,
      );
    }

    if (
      typeof value ===
      'object'
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

    return String(
      value,
    );
  };

/* =========================================================
 * Extract Orders
 * ========================================================= */

const extractOrdersArray =
  responseData => {
    const possibleArrays =
      [
        responseData?.data
          ?.orders?.data,

        responseData?.data
          ?.orders,

        responseData?.orders
          ?.data,

        responseData?.orders,

        responseData?.data
          ?.data,

        responseData?.data,

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
          possibleArrays[
            index
          ],
        )
      ) {
        return possibleArrays[
          index
        ];
      }
    }

    return [];
  };

/* =========================================================
 * Normalize Status
 * ========================================================= */

const normalizeStatusValue =
  statusValue =>
    String(
      statusValue || '',
    )
      .trim()
      .toLowerCase()
      .replace(
        /[-\s]+/g,
        '_',
      );

/* =========================================================
 * Filter Status
 *
 * Matches your Orders page:
 * completed orders = Delivered
 * everything else = Pending
 * ========================================================= */

const getFilterStatus =
  statusValue => {
    const status =
      normalizeStatusValue(
        statusValue,
      );

    const deliveredStatuses =
      [
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
 * Ready Status
 * ========================================================= */

const isReadyStatus =
  statusValue => {
    const status =
      normalizeStatusValue(
        statusValue,
      );

    return [
      'ready',
      'ready_for_delivery',
      'ready_for_pickup',
      'prepared',
      'preparing_completed',
      'packed',
    ].includes(
      status,
    );
  };

/* =========================================================
 * Format Amount
 * ========================================================= */

const formatAmount =
  amountValue => {
    if (
      amountValue ===
        null ||
      amountValue ===
        undefined ||
      amountValue ===
        ''
    ) {
      return '₹0';
    }

    const amountText =
      String(
        amountValue,
      );

    if (
      amountText.includes(
        '₹',
      )
    ) {
      return amountText;
    }

    const numericValue =
      Number(
        amountText.replace(
          /[^\d.-]/g,
          '',
        ),
      );

    if (
      Number.isFinite(
        numericValue,
      )
    ) {
      return `₹${numericValue.toLocaleString(
        'en-IN',
        {
          maximumFractionDigits:
            2,
        },
      )}`;
    }

    return `₹${amountText}`;
  };

/* =========================================================
 * Format Time
 * ========================================================= */

const formatTime =
  timeValue => {
    if (
      !timeValue
    ) {
      return 'Time N/A';
    }

    const rawTime =
      String(
        timeValue,
      );

    /*
     * Try full date first.
     */

    const parsedDate =
      new Date(
        rawTime,
      );

    if (
      !Number.isNaN(
        parsedDate.getTime(),
      ) &&
      rawTime.includes(
        '-',
      )
    ) {
      return parsedDate.toLocaleTimeString(
        'en-US',
        {
          hour:
            '2-digit',

          minute:
            '2-digit',

          hour12:
            true,
        },
      );
    }

    /*
     * HH:mm
     */

    const timeMatch =
      rawTime.match(
        /(\d{1,2}):(\d{2})/,
      );

    if (
      !timeMatch
    ) {
      return rawTime;
    }

    let hours =
      Number(
        timeMatch[1],
      );

    const minutes =
      timeMatch[2];

    if (
      !Number.isFinite(
        hours,
      ) ||
      hours > 23
    ) {
      return rawTime;
    }

    const period =
      hours >= 12
        ? 'PM'
        : 'AM';

    hours %= 12;

    if (
      hours === 0
    ) {
      hours =
        12;
    }

    return `${String(
      hours,
    ).padStart(
      2,
      '0',
    )}:${minutes} ${period}`;
  };

/* =========================================================
 * Format Address
 * ========================================================= */

const formatAddress =
  addressValue => {
    if (
      !addressValue
    ) {
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
      const addressParts =
        [
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
            part !==
              undefined &&
            String(
              part,
            ).trim() !==
              '',
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
 * Format Order Number
 * ========================================================= */

const formatOrderNumber =
  value => {
    const orderNumber =
      String(
        value || '',
      ).trim();

    if (
      !orderNumber
    ) {
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
 * Order Created Time
 *
 * Used for sorting recent orders.
 * ========================================================= */

const getOrderTimestamp =
  rawOrder => {
    const value =
      getFirstValue(
        rawOrder?.created_at,
        rawOrder?.updated_at,
        rawOrder?.order_date,
        rawOrder?.assigned_at,
      );

    if (
      !value
    ) {
      return 0;
    }

    const time =
      new Date(
        value,
      ).getTime();

    return Number.isFinite(
      time,
    )
      ? time
      : 0;
  };

/* =========================================================
 * Normalize Order
 *
 * Based on same structure as your Orders screen.
 * ========================================================= */

const normalizeOrder =
  (
    rawOrder,
    index,
  ) => {
    const customer =
      rawOrder?.customer ||
      rawOrder?.user ||
      rawOrder
        ?.customer_details ||
      rawOrder
        ?.customerDetail ||
      {};

    const addressObject =
      getFirstValue(
        rawOrder
          ?.delivery_address,

        rawOrder
          ?.shipping_address,

        rawOrder?.address,

        rawOrder
          ?.customer_address,

        customer
          ?.delivery_address,

        customer?.address,
      );

    const statusValue =
      getTextValue(
        rawOrder
          ?.delivery_status,

        rawOrder
          ?.order_status,

        rawOrder?.status,

        rawOrder
          ?.status_name,
      );

    const filterStatus =
      getFilterStatus(
        statusValue,
      );

    const orderId =
      getFirstValue(
        rawOrder?.id,

        rawOrder
          ?.order_id,

        rawOrder
          ?.orderId,

        index + 1,
      );

    const orderNumber =
      getFirstValue(
        rawOrder
          ?.order_number,

        rawOrder
          ?.order_no,

        rawOrder
          ?.orderNumber,

        rawOrder
          ?.invoice_number,

        rawOrder?.id,

        index + 1,
      );

    return {
      id:
        String(
          orderId,
        ),

      rawOrder,

      orderNumber:
        formatOrderNumber(
          orderNumber,
        ),

      status:
        statusValue ||
        filterStatus,

      filterStatus,

      time:
        formatTime(
          getFirstValue(
            rawOrder
              ?.delivery_time,

            rawOrder
              ?.scheduled_time,

            rawOrder
              ?.order_time,

            rawOrder
              ?.pickup_time,

            rawOrder
              ?.created_at,
          ),
        ),

      amount:
        formatAmount(
          getFirstValue(
            rawOrder
              ?.grand_total,

            rawOrder
              ?.total_amount,

            rawOrder
              ?.payable_amount,

            rawOrder
              ?.total,

            rawOrder
              ?.amount,

            rawOrder
              ?.net_amount,

            0,
          ),
        ),

      customerName:
        rawOrder
          ?.customer_name ||
        rawOrder?.name ||
        customer?.name ||
        customer
          ?.full_name ||
        'Customer',

      address:
        formatAddress(
          addressObject,
        ) ||
        'Delivery address not available',

      timestamp:
        getOrderTimestamp(
          rawOrder,
        ),
    };
  };

/* =========================================================
 * Home Screen
 * ========================================================= */

const HomeScreen = ({
  navigation,
}) => {
  const {
    width,
  } =
    useWindowDimensions();

  /* =====================================================
   * State
   * ===================================================== */

  const [
    orders,
    setOrders,
  ] =
    useState([]);

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
   * Responsive
   * ===================================================== */

  const isSmallScreen =
    width <= 360;

  const screenPadding =
    isSmallScreen
      ? 12
      : 18;

  const cardGap =
    isSmallScreen
      ? 8
      : 14;

  const statisticCardWidth =
    (
      width -
      screenPadding *
        2 -
      cardGap -
      2
    ) /
    2;

  /* =====================================================
   * Clear Login
   * ===================================================== */

  const clearLoginSession =
    async () => {
      await AsyncStorage.removeItem(
        AUTH_TOKEN_KEY,
      );

      await AsyncStorage.removeItem(
        AUTH_USER_KEY,
      );

      await AsyncStorage.removeItem(
        AUTH_EMAIL_KEY,
      );

      delete axios
        .defaults
        .headers
        .common
        .Authorization;
    };

  /* =====================================================
   * Login
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
          index:
            0,

          routes: [
            {
              name:
                'Login',
            },
          ],
        }),
      );
    };

  /* =====================================================
   * Fetch Orders
   * ===================================================== */

  const fetchOrders =
    useCallback(
      async (
        refreshing = false,
      ) => {
        try {
          if (
            refreshing
          ) {
            setIsRefreshing(
              true,
            );
          } else {
            setIsLoading(
              true,
            );
          }

          setOrdersError(
            '',
          );

          /* =========================================
           * Token
           * ========================================= */

          const savedToken =
            await AsyncStorage.getItem(
              AUTH_TOKEN_KEY,
            );

          if (
            !savedToken
          ) {
            setOrders(
              [],
            );

            setIsLoading(
              false,
            );

            return;
          }

          /* =========================================
           * API
           * ========================================= */

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

          let normalizedOrders =
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

          /* =========================================
           * Latest First
           * ========================================= */

          normalizedOrders =
            normalizedOrders.sort(
              (
                first,
                second,
              ) => {
                if (
                  second.timestamp !==
                  first.timestamp
                ) {
                  return (
                    second.timestamp -
                    first.timestamp
                  );
                }

                return (
                  Number(
                    second.id,
                  ) -
                  Number(
                    first.id,
                  )
                );
              },
            );

          setOrders(
            normalizedOrders,
          );
        } catch (
          error
        ) {
          console.log(
            'HOME ORDERS API ERROR:',
            {
              message:
                error?.message,

              status:
                error
                  ?.response
                  ?.status,

              response:
                error
                  ?.response
                  ?.data,
            },
          );

          /* =========================================
           * Session expired
           * ========================================= */

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
            try {
              await clearLoginSession();
            } catch (
              storageError
            ) {
              console.log(
                'CLEAR SESSION ERROR:',
                storageError,
              );
            }

            goToLoginScreen();

            return;
          }

          setOrdersError(
            error
              ?.response
              ?.data
              ?.message ||
              error?.message ||
              'Unable to load recent orders.',
          );
        } finally {
          setIsLoading(
            false,
          );

          setIsRefreshing(
            false,
          );
        }
      },
      [
        navigation,
      ],
    );

  /* =====================================================
   * Initial Fetch
   * ===================================================== */

  useEffect(
    () => {
      fetchOrders();
    },
    [
      fetchOrders,
    ],
  );

  /* =====================================================
   * Refresh Whenever Home Gets Focus
   *
   * Important:
   * when status changes on Orders page,
   * Home reflects the latest data.
   * ===================================================== */

  useFocusEffect(
    useCallback(
      () => {
        fetchOrders();
      },
      [
        fetchOrders,
      ],
    ),
  );

  /* =====================================================
   * Counts
   * ===================================================== */

  const totalAssigned =
    useMemo(
      () =>
        orders.length,
      [
        orders,
      ],
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
      [
        orders,
      ],
    );

  const pendingCount =
    useMemo(
      () =>
        orders.filter(
          order =>
            order
              .filterStatus ===
            'Pending',
        ).length,
      [
        orders,
      ],
    );

  const readyCount =
    useMemo(
      () =>
        orders.filter(
          order =>
            isReadyStatus(
              order.status,
            ),
        ).length,
      [
        orders,
      ],
    );

  /* =====================================================
   * Dynamic Statistics
   * ===================================================== */

  const statistics =
    useMemo(
      () => [
        {
          id:
            1,

          title:
            'Total Assigned',

          value:
            String(
              totalAssigned,
            ),

          valueColor:
            '#111111',

          badgeText:
            totalAssigned >
            0
              ? 'In progress'
              : 'No orders',

          badgeBackground:
            '#dfe4f5',

          badgeTextColor:
            '#68718d',
        },

        {
          id:
            2,

          title:
            'Ready for Delivery',

          value:
            String(
              readyCount,
            ),

          valueColor:
            '#c40016',

          badgeText:
            readyCount >
            0
              ? 'Pick up now'
              : 'None ready',

          badgeBackground:
            '#fde8ea',

          badgeTextColor:
            '#d9001b',
        },

        {
          id:
            3,

          title:
            'Delivered',

          value:
            String(
              deliveredCount,
            ),

          valueColor:
            '#007c3d',

          badgeText:
            deliveredCount >
            0
              ? 'Success'
              : 'No delivery',

          badgeBackground:
            '#e3f4e9',

          badgeTextColor:
            '#07803f',
        },

        {
          id:
            4,

          title:
            'Pending',

          value:
            String(
              pendingCount,
            ),

          valueColor:
            pendingCount >
            0
              ? '#c40016'
              : '#777777',

          badgeText:
            pendingCount >
            0
              ? 'Action needed'
              : 'All clear',

          badgeBackground:
            pendingCount >
            0
              ? '#fde8ea'
              : '#eff0f2',

          badgeTextColor:
            pendingCount >
            0
              ? '#d9001b'
              : '#9a9da4',
        },
      ],
      [
        deliveredCount,
        pendingCount,
        readyCount,
        totalAssigned,
      ],
    );

  /* =====================================================
   * Recent Orders
   *
   * Show only latest two on Home.
   * View All opens full Orders page.
   * ===================================================== */

  const recentOrders =
    useMemo(
      () =>
        orders.slice(
          0,
          2,
        ),
      [
        orders,
      ],
    );

  /* =====================================================
   * View All
   * ===================================================== */

  const handleViewAll =
    () => {
      navigation.navigate(
        'Orders',
      );
    };

  /* =====================================================
   * Open Order Details
   * ===================================================== */

  const handleOrderPress =
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
   * Route
   * ===================================================== */

  const handleRoutePress =
    () => {
      /*
       * Keep your existing Active Route behaviour here.
       */
    };

  /* =====================================================
   * Recent Order Status UI
   * ===================================================== */

  const getRecentOrderStyle =
    status => {
      const normalized =
        normalizeStatusValue(
          status,
        );

      if (
        [
          'delivered',
          'completed',
          'complete',
          'delivery_completed',
        ].includes(
          normalized,
        )
      ) {
        return {
          backgroundColor:
            '#e3f2e9',

          circleColor:
            '#00884a',

          symbol:
            '✓',

          title:
            'Delivered',
        };
      }

      if (
        isReadyStatus(
          status,
        )
      ) {
        return {
          backgroundColor:
            '#fde8ea',

          circleColor:
            '#d00018',

          symbol:
            '✓',

          title:
            'Ready',
        };
      }

      return {
        backgroundColor:
          '#fff0dc',

        circleColor:
          '#d98c19',

        symbol:
          '◷',

        title:
          status ||
          'Pending',
      };
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
      ]}>

      <View
        style={
          styles.screen
        }>

        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <View
          style={
            styles.header
          }>

          <View
            style={
              styles.profileSection
            }>

            <Image
              source={{
                uri:
                  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
              }}

              style={
                styles.avatar
              }
            />

            <Text
              numberOfLines={
                1
              }

              style={
                styles.appName
              }>
              Delivery Pro
            </Text>

          </View>

          {/* =============================================== */}
          {/* Notification */}
          {/* =============================================== */}

          <Pressable
            onPress={() =>
              navigation.navigate(
                'Notification',
              )
            }

            style={({
              pressed,
            }) => [
              styles.notificationButton,

              pressed &&
                styles.pressed,
            ]}

            accessibilityRole="button"

            accessibilityLabel="Open notifications">

            <View
              style={
                styles.notificationBell
              }>

              <View
                style={
                  styles.bellTop
                }
              />

              <View
                style={
                  styles.bellBody
                }
              />

              <View
                style={
                  styles.bellBottom
                }
              />

              <View
                style={
                  styles.bellDot
                }
              />

            </View>

            {/* Keep your notification badge implementation here */}

          </Pressable>

        </View>

        {/* ================================================= */}
        {/* SCROLL */}
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
          ]}>

          {/* ================================================= */}
          {/* WELCOME */}
          {/* ================================================= */}

          <View
            style={
              styles.welcomeSection
            }>

            <Text
              style={[
                styles.heading,

                isSmallScreen &&
                  styles.headingSmall,
              ]}>
              Welcome, Delivery{'\n'}Partner
            </Text>

            <Text
              style={
                styles.subtitle
              }>
              Ready for your shift? Here's your daily overview.
            </Text>

          </View>

          {/* ================================================= */}
          {/* STATISTICS */}
          {/* ================================================= */}

          <Text
            style={
              styles.mainSectionTitle
            }>
            Today's Statistics
          </Text>

          {isLoading &&
          orders.length ===
            0 ? (
            <View
              style={
                styles.statisticsLoading
              }>

              <ActivityIndicator
                size="small"

                color="#d00018"
              />

              <Text
                style={
                  styles.statisticsLoadingText
                }>
                Loading order statistics...
              </Text>

            </View>
          ) : (
            <View
              style={[
                styles.statisticsContainer,

                {
                  columnGap:
                    cardGap,

                  rowGap:
                    cardGap,
                },
              ]}>

              {statistics.map(
                item => (
                  <View
                    key={
                      item.id
                    }

                    style={[
                      styles.statisticCard,

                      {
                        width:
                          statisticCardWidth,
                      },

                      isSmallScreen &&
                        styles.statisticCardSmall,
                    ]}>

                    <Text
                      numberOfLines={
                        2
                      }

                      style={[
                        styles.statisticCardTitle,

                        isSmallScreen &&
                          styles.statisticCardTitleSmall,
                      ]}>

                      {
                        item.title
                      }

                    </Text>

                    <Text
                      style={[
                        styles.statisticValue,

                        {
                          color:
                            item.valueColor,
                        },

                        isSmallScreen &&
                          styles.statisticValueSmall,
                      ]}>

                      {
                        item.value
                      }

                    </Text>

                    <View
                      style={[
                        styles.statisticBadge,

                        {
                          backgroundColor:
                            item.badgeBackground,
                        },
                      ]}>

                      <Text
                        numberOfLines={
                          1
                        }

                        style={[
                          styles.statisticBadgeText,

                          {
                            color:
                              item.badgeTextColor,
                          },

                          isSmallScreen &&
                            styles.statisticBadgeTextSmall,
                        ]}>

                        {
                          item.badgeText
                        }

                      </Text>

                    </View>

                  </View>
                ),
              )}

            </View>
          )}

          {/* ================================================= */}
          {/* ORDER API ERROR */}
          {/* ================================================= */}

          {!!ordersError && (
            <View
              style={
                styles.orderErrorCard
              }>

              <View
                style={
                  styles.orderErrorIcon
                }>

                <Text
                  style={
                    styles.orderErrorIconText
                  }>
                  !
                </Text>

              </View>

              <View
                style={
                  styles.orderErrorContent
                }>

                <Text
                  style={
                    styles.orderErrorTitle
                  }>
                  Unable to Load Orders
                </Text>

                <Text
                  style={
                    styles.orderErrorText
                  }>
                  {
                    ordersError
                  }
                </Text>

                <Pressable
                  onPress={() =>
                    fetchOrders()
                  }

                  style={
                    styles.retryButton
                  }>

                  <Text
                    style={
                      styles.retryButtonText
                    }>
                    Try Again
                  </Text>

                </Pressable>

              </View>

            </View>
          )}

          {/* ================================================= */}
          {/* RECENT ORDERS */}
          {/* ================================================= */}

          <View
            style={
              styles.recentActivitySection
            }>

            <View
              style={
                styles.sectionHeader
              }>

              <Text
                style={
                  styles.sectionHeaderTitle
                }>
                Recent Orders
              </Text>

              {/* =========================================== */}
              {/* VIEW ALL → ORDERS PAGE */}
              {/* =========================================== */}

              <Pressable
                onPress={
                  handleViewAll
                }

                style={({
                  pressed,
                }) => [
                  styles.viewAllButton,

                  pressed &&
                    styles.pressed,
                ]}>

                <Text
                  style={
                    styles.viewAllText
                  }>
                  View All
                </Text>

              </Pressable>

            </View>

            {/* ============================================= */}
            {/* Loading */}
            {/* ============================================= */}

            {isLoading &&
            recentOrders.length ===
              0 ? (
              <View
                style={
                  styles.recentLoadingCard
                }>

                <ActivityIndicator
                  size="small"

                  color="#d00018"
                />

                <Text
                  style={
                    styles.recentLoadingText
                  }>
                  Loading recent orders...
                </Text>

              </View>
            ) : recentOrders.length >
              0 ? (
              <View
                style={
                  styles.activitiesContainer
                }>

                {recentOrders.map(
                  order => {
                    const statusUI =
                      getRecentOrderStyle(
                        order.status,
                      );

                    return (
                      <Pressable
                        key={
                          order.id
                        }

                        onPress={() =>
                          handleOrderPress(
                            order,
                          )
                        }

                        style={({
                          pressed,
                        }) => [
                          styles.activityCard,

                          pressed &&
                            styles.pressed,
                        ]}>

                        {/* ================================= */}
                        {/* Status Icon */}
                        {/* ================================= */}

                        <View
                          style={[
                            styles.successIconContainer,

                            {
                              backgroundColor:
                                statusUI.backgroundColor,
                            },
                          ]}>

                          <View
                            style={[
                              styles.successIconCircle,

                              {
                                backgroundColor:
                                  statusUI.circleColor,
                              },
                            ]}>

                            <Text
                              style={
                                styles.successCheck
                              }>

                              {
                                statusUI.symbol
                              }

                            </Text>

                          </View>

                        </View>

                        {/* ================================= */}
                        {/* Information */}
                        {/* ================================= */}

                        <View
                          style={
                            styles.activityInformation
                          }>

                          <Text
                            numberOfLines={
                              1
                            }

                            style={[
                              styles.activityTitle,

                              isSmallScreen &&
                                styles.activityTitleSmall,
                            ]}>

                            Order{' '}
                            {
                              order.orderNumber
                            }{' '}
                            {
                              statusUI.title
                            }

                          </Text>

                          <Text
                            numberOfLines={
                              1
                            }

                            style={[
                              styles.activityAddress,

                              isSmallScreen &&
                                styles.activityAddressSmall,
                            ]}>

                            {
                              order.address
                            }

                          </Text>

                          <Text
                            style={
                              styles.activityTime
                            }>

                            {
                              order.time
                            }

                          </Text>

                        </View>

                        {/* ================================= */}
                        {/* Amount */}
                        {/* ================================= */}

                        <Text
                          numberOfLines={
                            1
                          }

                          style={[
                            styles.activityAmount,

                            isSmallScreen &&
                              styles.activityAmountSmall,
                          ]}>

                          {
                            order.amount
                          }

                        </Text>

                      </Pressable>
                    );
                  },
                )}

              </View>
            ) : (
              <View
                style={
                  styles.noRecentOrderCard
                }>

                <View
                  style={
                    styles.noRecentOrderIcon
                  }>

                  <Text
                    style={
                      styles.noRecentOrderIconText
                    }>
                    □
                  </Text>

                </View>

                <Text
                  style={
                    styles.noRecentOrderTitle
                  }>
                  No Recent Orders
                </Text>

                <Text
                  style={
                    styles.noRecentOrderText
                  }>
                  Your assigned orders will appear here.
                </Text>

              </View>
            )}

          </View>

          {/* ================================================= */}
          {/* ACTIVE ROUTE */}
          {/* ================================================= */}

          <View
            style={
              styles.routeSection
            }>

            <Pressable
              onPress={
                handleRoutePress
              }

              style={({
                pressed,
              }) => [
                styles.routeCard,

                pressed &&
                  styles.routeCardPressed,
              ]}>

              <ImageBackground
                source={{
                  uri:
                    'https://images.unsplash.com/photo-1524661135-423995f22d0b',
                }}

                resizeMode="cover"

                style={
                  styles.routeBackground
                }

                imageStyle={
                  styles.routeBackgroundImage
                }>

                <View
                  style={
                    styles.routeOverlay
                  }
                />

                <View
                  style={
                    styles.mapPin
                  }>

                  <View
                    style={
                      styles.mapPinCircle
                    }>

                    <View
                      style={
                        styles.mapPinInnerDot
                      }
                    />

                  </View>

                  <View
                    style={
                      styles.mapPinTriangle
                    }
                  />

                </View>

                <View
                  style={
                    styles.routeContent
                  }>

                  <View
                    style={
                      styles.routeInformation
                    }>

                    <Text
                      style={
                        styles.activeRouteLabel
                      }>
                      ACTIVE ROUTE
                    </Text>

                    <Text
                      numberOfLines={
                        1
                      }

                      style={[
                        styles.routeTitle,

                        isSmallScreen &&
                          styles.routeTitleSmall,
                      ]}>
                      Heading to Central Hub
                    </Text>

                  </View>

                  <View
                    style={
                      styles.navigationButton
                    }>

                    <Text
                      style={
                        styles.navigationArrow
                      }>
                      ➤
                    </Text>

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

/* =========================================================
 * Styles
 * ========================================================= */

const styles =
  StyleSheet.create({
    safeArea: {
      flex:
        1,

      backgroundColor:
        '#ffffff',
    },

    screen: {
      flex:
        1,

      backgroundColor:
        '#f8f9fb',
    },

    /* =====================================================
     * Header
     * ===================================================== */

    header: {
      minHeight:
        58,

      paddingHorizontal:
        16,

      backgroundColor:
        '#ffffff',

      borderBottomWidth:
        1,

      borderBottomColor:
        '#e8e8eb',

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      elevation:
        2,

      shadowColor:
        '#000000',

      shadowOffset: {
        width:
          0,

        height:
          1,
      },

      shadowOpacity:
        0.06,

      shadowRadius:
        3,
    },

    profileSection: {
      flex:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    avatar: {
      width:
        32,

      height:
        32,

      borderRadius:
        16,

      backgroundColor:
        '#dddddd',
    },

    appName: {
      flexShrink:
        1,

      marginLeft:
        10,

      color:
        '#d10018',

      fontSize:
        18,

      fontWeight:
        '700',
    },

    /* =====================================================
     * Notification
     * ===================================================== */

    notificationButton: {
      position:
        'relative',

      width:
        42,

      height:
        42,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    notificationBell: {
      width:
        22,

      height:
        25,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    bellTop: {
      width:
        5,

      height:
        4,

      backgroundColor:
        '#d10018',

      borderTopLeftRadius:
        3,

      borderTopRightRadius:
        3,
    },

    bellBody: {
      width:
        14,

      height:
        13,

      borderWidth:
        2,

      borderColor:
        '#d10018',

      borderTopLeftRadius:
        8,

      borderTopRightRadius:
        8,

      borderBottomWidth:
        0,
    },

    bellBottom: {
      width:
        18,

      height:
        2,

      backgroundColor:
        '#d10018',

      borderRadius:
        2,
    },

    bellDot: {
      width:
        4,

      height:
        4,

      marginTop:
        1,

      backgroundColor:
        '#d10018',

      borderRadius:
        2,
    },

    pressed: {
      opacity:
        0.65,
    },

    /* =====================================================
     * Scroll
     * ===================================================== */

    scrollContent: {
      flexGrow:
        1,

      paddingTop:
        18,

      paddingBottom:
        100,
    },

    /* =====================================================
     * Welcome
     * ===================================================== */

    welcomeSection: {
      marginBottom:
        22,
    },

    heading: {
      color:
        '#090909',

      fontSize:
        29,

      lineHeight:
        35,

      fontWeight:
        '800',

      letterSpacing:
        -0.6,
    },

    headingSmall: {
      fontSize:
        25,

      lineHeight:
        31,
    },

    subtitle: {
      maxWidth:
        340,

      marginTop:
        7,

      color:
        '#5c6477',

      fontSize:
        15,

      lineHeight:
        21,

      fontWeight:
        '400',
    },

    mainSectionTitle: {
      marginBottom:
        12,

      color:
        '#111111',

      fontSize:
        16,

      lineHeight:
        21,

      fontWeight:
        '700',
    },

    /* =====================================================
     * Statistics
     * ===================================================== */

    statisticsContainer: {
      width:
        '100%',

      flexDirection:
        'row',

      flexWrap:
        'wrap',

      alignItems:
        'stretch',
    },

    statisticCard: {
      minHeight:
        128,

      paddingHorizontal:
        14,

      paddingVertical:
        15,

      backgroundColor:
        '#ffffff',

      borderRadius:
        11,

      elevation:
        3,

      shadowColor:
        '#000000',

      shadowOffset: {
        width:
          0,

        height:
          2,
      },

      shadowOpacity:
        0.07,

      shadowRadius:
        6,
    },

    statisticCardSmall: {
      minHeight:
        122,

      paddingHorizontal:
        10,

      paddingVertical:
        13,
    },

    statisticCardTitle: {
      minHeight:
        32,

      color:
        '#3e4858',

      fontSize:
        12,

      lineHeight:
        16,

      fontWeight:
        '500',
    },

    statisticCardTitleSmall: {
      fontSize:
        10,

      lineHeight:
        14,
    },

    statisticValue: {
      marginTop:
        3,

      fontSize:
        29,

      lineHeight:
        34,

      fontWeight:
        '700',
    },

    statisticValueSmall: {
      fontSize:
        26,

      lineHeight:
        31,
    },

    statisticBadge: {
      alignSelf:
        'flex-start',

      maxWidth:
        '100%',

      marginTop:
        8,

      paddingHorizontal:
        8,

      paddingVertical:
        4,

      borderRadius:
        20,
    },

    statisticBadgeText: {
      fontSize:
        10,

      lineHeight:
        12,

      fontWeight:
        '500',
    },

    statisticBadgeTextSmall: {
      fontSize:
        9,

      lineHeight:
        11,
    },

    statisticsLoading: {
      minHeight:
        100,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#ffffff',

      borderRadius:
        12,

      marginBottom:
        10,
    },

    statisticsLoadingText: {
      color:
        '#68718d',

      fontSize:
        11,

      marginLeft:
        8,
    },

    /* =====================================================
     * Error
     * ===================================================== */

    orderErrorCard: {
      flexDirection:
        'row',

      backgroundColor:
        '#fff1f2',

      borderWidth:
        1,

      borderColor:
        '#f1d3d6',

      borderRadius:
        11,

      padding:
        12,

      marginTop:
        15,
    },

    orderErrorIcon: {
      width:
        31,

      height:
        31,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#d00018',

      borderRadius:
        16,

      marginRight:
        10,
    },

    orderErrorIconText: {
      color:
        '#ffffff',

      fontSize:
        17,

      fontWeight:
        '900',
    },

    orderErrorContent: {
      flex:
        1,
    },

    orderErrorTitle: {
      color:
        '#1a1a1a',

      fontSize:
        11,

      fontWeight:
        '800',
    },

    orderErrorText: {
      color:
        '#6a6265',

      fontSize:
        9,

      lineHeight:
        14,

      marginTop:
        3,
    },

    retryButton: {
      alignSelf:
        'flex-start',

      backgroundColor:
        '#d00018',

      borderRadius:
        7,

      paddingHorizontal:
        10,

      paddingVertical:
        6,

      marginTop:
        8,
    },

    retryButtonText: {
      color:
        '#ffffff',

      fontSize:
        8,

      fontWeight:
        '800',
    },

    /* =====================================================
     * Recent Orders
     * ===================================================== */

    recentActivitySection: {
      marginBottom:
        20,

      marginTop:
        20,
    },

    sectionHeader: {
      marginBottom:
        10,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    sectionHeaderTitle: {
      color:
        '#111111',

      fontSize:
        16,

      lineHeight:
        21,

      fontWeight:
        '700',
    },

    viewAllButton: {
      minHeight:
        32,

      justifyContent:
        'center',

      paddingLeft:
        12,

      paddingVertical:
        4,
    },

    viewAllText: {
      color:
        '#d00018',

      fontSize:
        12,

      lineHeight:
        16,

      fontWeight:
        '700',
    },

    activitiesContainer: {
      rowGap:
        10,
    },

    activityCard: {
      minHeight:
        72,

      paddingHorizontal:
        12,

      paddingVertical:
        10,

      backgroundColor:
        '#ffffff',

      borderRadius:
        11,

      flexDirection:
        'row',

      alignItems:
        'center',

      elevation:
        2,

      shadowColor:
        '#000000',

      shadowOffset: {
        width:
          0,

        height:
          2,
      },

      shadowOpacity:
        0.06,

      shadowRadius:
        5,
    },

    successIconContainer: {
      width:
        40,

      height:
        40,

      marginRight:
        11,

      borderRadius:
        8,

      backgroundColor:
        '#e3f2e9',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    successIconCircle: {
      width:
        17,

      height:
        17,

      borderRadius:
        9,

      backgroundColor:
        '#00884a',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    successCheck: {
      color:
        '#ffffff',

      fontSize:
        10,

      lineHeight:
        12,

      fontWeight:
        '900',
    },

    activityInformation: {
      flex:
        1,

      minWidth:
        0,

      paddingRight:
        8,
    },

    activityTitle: {
      color:
        '#141414',

      fontSize:
        12,

      lineHeight:
        16,

      fontWeight:
        '700',
    },

    activityTitleSmall: {
      fontSize:
        10.5,
    },

    activityAddress: {
      marginTop:
        1,

      color:
        '#4f596d',

      fontSize:
        10,

      lineHeight:
        13,
    },

    activityAddressSmall: {
      fontSize:
        9,
    },

    activityTime: {
      color:
        '#4f596d',

      fontSize:
        10,

      lineHeight:
        13,

      marginTop:
        1,
    },

    activityAmount: {
      color:
        '#111111',

      fontSize:
        12,

      lineHeight:
        16,

      fontWeight:
        '800',
    },

    activityAmountSmall: {
      fontSize:
        10.5,
    },

    recentLoadingCard: {
      minHeight:
        80,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#ffffff',

      borderRadius:
        11,
    },

    recentLoadingText: {
      color:
        '#68718d',

      fontSize:
        10,

      marginLeft:
        8,
    },

    noRecentOrderCard: {
      minHeight:
        130,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#ffffff',

      borderRadius:
        11,

      padding:
        18,
    },

    noRecentOrderIcon: {
      width:
        38,

      height:
        38,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#fde8ea',

      borderRadius:
        19,
    },

    noRecentOrderIconText: {
      color:
        '#d00018',

      fontSize:
        17,
    },

    noRecentOrderTitle: {
      color:
        '#111111',

      fontSize:
        12,

      fontWeight:
        '800',

      marginTop:
        8,
    },

    noRecentOrderText: {
      color:
        '#6e7584',

      fontSize:
        9,

      marginTop:
        4,
    },

    /* =====================================================
     * Route
     * ===================================================== */

    routeSection: {
      marginBottom:
        10,
    },

    routeCard: {
      width:
        '100%',

      height:
        160,

      overflow:
        'hidden',

      backgroundColor:
        '#d8dce0',

      borderRadius:
        12,

      elevation:
        3,

      shadowColor:
        '#000000',

      shadowOffset: {
        width:
          0,

        height:
          3,
      },

      shadowOpacity:
        0.14,

      shadowRadius:
        7,
    },

    routeCardPressed: {
      opacity:
        0.92,

      transform: [
        {
          scale:
            0.995,
        },
      ],
    },

    routeBackground: {
      flex:
        1,

      justifyContent:
        'flex-end',
    },

    routeBackgroundImage: {
      borderRadius:
        12,
    },

    routeOverlay: {
      ...StyleSheet.absoluteFillObject,

      backgroundColor:
        'rgba(18, 23, 29, 0.26)',
    },

    mapPin: {
      position:
        'absolute',

      top:
        50,

      left:
        '49%',

      alignItems:
        'center',
    },

    mapPinCircle: {
      width:
        16,

      height:
        16,

      borderWidth:
        2,

      borderColor:
        '#ffffff',

      borderRadius:
        8,

      backgroundColor:
        '#d00018',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    mapPinInnerDot: {
      width:
        4,

      height:
        4,

      borderRadius:
        2,

      backgroundColor:
        '#ffffff',
    },

    mapPinTriangle: {
      width:
        0,

      height:
        0,

      marginTop:
        -2,

      borderLeftWidth:
        4,

      borderRightWidth:
        4,

      borderTopWidth:
        7,

      borderLeftColor:
        'transparent',

      borderRightColor:
        'transparent',

      borderTopColor:
        '#d00018',
    },

    routeContent: {
      paddingHorizontal:
        12,

      paddingBottom:
        13,

      flexDirection:
        'row',

      alignItems:
        'flex-end',

      justifyContent:
        'space-between',
    },

    routeInformation: {
      flex:
        1,

      minWidth:
        0,

      paddingRight:
        12,
    },

    activeRouteLabel: {
      marginBottom:
        2,

      color:
        '#ffffff',

      fontSize:
        9,

      lineHeight:
        12,

      fontWeight:
        '700',

      letterSpacing:
        0.3,
    },

    routeTitle: {
      color:
        '#ffffff',

      fontSize:
        17,

      lineHeight:
        22,

      fontWeight:
        '800',
    },

    routeTitleSmall: {
      fontSize:
        14,

      lineHeight:
        19,
    },

    navigationButton: {
      width:
        45,

      height:
        45,

      borderRadius:
        23,

      backgroundColor:
        '#d00018',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    navigationArrow: {
      marginLeft:
        -2,

      color:
        '#ffffff',

      fontSize:
        21,

      lineHeight:
        24,

      fontWeight:
        '700',

      transform: [
        {
          rotate:
            '-45deg',
        },
      ],
    },
  });