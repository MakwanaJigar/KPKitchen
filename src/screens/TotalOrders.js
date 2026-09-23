import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

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
 * HELPERS
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
      typeof value === 'string' ||
      typeof value === 'number'
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
 * EXTRACT ARRAY
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
  status =>
    String(
      status || '',
    )
      .trim()
      .toLowerCase()
      .replace(
        /[-\s]+/g,
        '_',
      );

const isDeliveredStatus =
  status => {
    const normalized =
      normalizeStatus(
        status,
      );

    return [
      'delivered',
      'completed',
      'complete',
      'delivery_completed',
    ].includes(
      normalized,
    );
  };

/* =========================================================
 * ORDER NUMBER
 * ========================================================= */

const formatOrderNumber =
  value => {
    const number =
      String(
        value || '',
      ).trim();

    if (!number) {
      return '#N/A';
    }

    return number.startsWith(
      '#',
    )
      ? number
      : `#${number}`;
  };

/* =========================================================
 * TIME
 * ========================================================= */

const formatTime =
  value => {
    if (!value) {
      return 'Time N/A';
    }

    const raw =
      String(value);

    const date =
      new Date(raw);

    if (
      !Number.isNaN(
        date.getTime(),
      ) &&
      raw.includes('-')
    ) {
      return date.toLocaleString(
        'en-US',

        {
          day:
            '2-digit',

          month:
            'short',

          year:
            'numeric',

          hour:
            '2-digit',

          minute:
            '2-digit',

          hour12:
            true,
        },
      );
    }

    const match =
      raw.match(
        /(\d{1,2}):(\d{2})/,
      );

    if (!match) {
      return raw;
    }

    let hour =
      Number(
        match[1],
      );

    const minute =
      match[2];

    const period =
      hour >= 12
        ? 'PM'
        : 'AM';

    hour %= 12;

    if (
      hour === 0
    ) {
      hour = 12;
    }

    return `${String(
      hour,
    ).padStart(
      2,
      '0',
    )}:${minute} ${period}`;
  };

/* =========================================================
 * ADDRESS
 * ========================================================= */

const formatAddress =
  value => {
    if (!value) {
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
      return [
        value?.address_line_1,
        value?.address_line1,
        value?.address1,
        value?.address_line_2,
        value?.address_line2,
        value?.address2,
        value?.street,
        value?.area,
        value?.city,
        value?.state,
        value?.zipcode,
        value?.zip_code,
        value?.pincode,
        value?.postal_code,
      ]
        .filter(
          Boolean,
        )
        .join(', ');
    }

    return '';
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
    rawOrder
      ?.order_details ??
    rawOrder
      ?.orderDetail ??
    rawOrder;

  const customer =
    actualOrder
      ?.customer ??
    actualOrder
      ?.user ??
    actualOrder
      ?.customer_details ??
    actualOrder
      ?.customerDetail ??
    rawOrder
      ?.customer ??
    rawOrder
      ?.user ??
    {};

  const orderId =
    getFirstValue(
      actualOrder?.id,
      actualOrder?.order_id,
      rawOrder?.order_id,
      rawOrder?.id,
      index + 1,
    );

  const orderNumber =
    getFirstValue(
      actualOrder
        ?.order_number,

      actualOrder
        ?.order_no,

      actualOrder
        ?.invoice_number,

      rawOrder
        ?.order_number,

      actualOrder
        ?.id,

      orderId,
    );

  const customerName =
    getTextValue(
      actualOrder
        ?.customer_name,

      actualOrder
        ?.customer
        ?.name,

      actualOrder
        ?.user
        ?.name,

      rawOrder
        ?.customer_name,

      customer?.name,

      customer
        ?.full_name,
    ) ||
    'Customer';

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

      rawOrder
        ?.customer_phone,

      rawOrder
        ?.customer_mobile,

      customer?.phone,

      customer?.mobile,

      customer
        ?.phone_number,

      customer
        ?.mobile_number,
    ) ||
    'Phone not available';

  const status =
    getTextValue(
      actualOrder
        ?.delivery_status,

      actualOrder
        ?.order_status,

      actualOrder
        ?.status,

      rawOrder
        ?.delivery_status,

      rawOrder
        ?.status,
    ) ||
    'Pending';

  const addressObject =
    getFirstValue(
      actualOrder
        ?.delivery_address,

      actualOrder
        ?.shipping_address,

      actualOrder
        ?.address,

      rawOrder
        ?.delivery_address,

      rawOrder
        ?.address,

      customer
        ?.address,
    );

  const time =
    formatTime(
      getFirstValue(
        actualOrder
          ?.delivered_at,

        actualOrder
          ?.delivery_time,

        actualOrder
          ?.scheduled_time,

        actualOrder
          ?.created_at,

        rawOrder
          ?.assigned_at,

        rawOrder
          ?.created_at,
      ),
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

    customerName,

    mobile,

    status,

    delivered:
      isDeliveredStatus(
        status,
      ),

    time,

    address:
      formatAddress(
        addressObject,
      ) ||
      'Delivery address not available',
  };
};

/* =========================================================
 * TOTAL ORDERS SCREEN
 * ========================================================= */

const TotalOrders = ({
  navigation,
}) => {
  const [
    orders,
    setOrders,
  ] =
    useState([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState('');

  /* =======================================================
   * LOGIN
   * ======================================================= */

  const clearSession =
    async () => {
      await AsyncStorage.multiRemove(
        [
          AUTH_TOKEN_KEY,
          AUTH_USER_KEY,
          AUTH_EMAIL_KEY,
        ],
      );
    };

  const goToLogin =
    () => {
      const parent =
        navigation.getParent?.();

      const target =
        parent ||
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

  /* =======================================================
   * FETCH
   * ======================================================= */

  const fetchOrders =
    useCallback(
      async (
        isRefresh =
          false,
      ) => {
        try {
          if (
            isRefresh
          ) {
            setRefreshing(
              true,
            );
          } else {
            setLoading(
              true,
            );
          }

          setErrorMessage(
            '',
          );

          const token =
            await AsyncStorage.getItem(
              AUTH_TOKEN_KEY,
            );

          if (!token) {
            await clearSession();

            goToLogin();

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
                    `Bearer ${token}`,
                },

                timeout:
                  20000,
              },
            );

          if (
            response
              .data
              ?.status ===
              false ||
            response
              .data
              ?.success ===
              false
          ) {
            throw new Error(
              response
                .data
                ?.message ||
                'Unable to load orders.',
            );
          }

          const rawOrders =
            extractOrdersArray(
              response.data,
            );

          const normalized =
            rawOrders.map(
              (
                order,
                index,
              ) =>
                normalizeOrder(
                  order,
                  index,
                ),
            );

          setOrders(
            normalized,
          );
        } catch (error) {
          console.log(
            'TOTAL ORDERS ERROR:',
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
            await clearSession();

            goToLogin();

            return;
          }

          setErrorMessage(
            error
              ?.response
              ?.data
              ?.message ||
              error?.message ||
              'Unable to load orders.',
          );
        } finally {
          setLoading(
            false,
          );

          setRefreshing(
            false,
          );
        }
      },

      [
        navigation,
      ],
    );

  useEffect(
    () => {
      fetchOrders();
    },

    [
      fetchOrders,
    ],
  );

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

  /* =======================================================
   * COUNTS
   * ======================================================= */

  const deliveredCount =
    useMemo(
      () =>
        orders.filter(
          order =>
            order.delivered,
        ).length,

      [
        orders,
      ],
    );

  const activeCount =
    useMemo(
      () =>
        orders.length -
        deliveredCount,

      [
        orders.length,
        deliveredCount,
      ],
    );

  /* =======================================================
   * CALL
   * ======================================================= */

  const handleCall =
    async order => {
      if (
        !order.mobile ||
        order.mobile ===
          'Phone not available'
      ) {
        Alert.alert(
          'Phone Unavailable',

          'Customer phone number is not available.',
        );

        return;
      }

      const cleanPhone =
        order.mobile.replace(
          /[^\d+]/g,
          '',
        );

      try {
        await Linking.openURL(
          `tel:${cleanPhone}`,
        );
      } catch (error) {
        Alert.alert(
          'Call Failed',

          'Unable to open phone application.',
        );
      }
    };

  /* =======================================================
   * DETAILS
   * ======================================================= */

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

  /* =======================================================
   * UI
   * ======================================================= */

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
              styles.headerTop
            }
          >
            <Pressable
              onPress={() =>
                navigation.goBack()
              }
              style={
                styles.backButton
              }
            >
              <Image
                source={require('../assets/login-icons/back.png')}
                style={
                  styles.backIcon
                }
                resizeMode="contain"
              />
            </Pressable>

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
                Total Orders
              </Text>
            </View>

            <View
              style={
                styles.headerTotalBadge
              }
            >
              <Text
                style={
                  styles.headerTotalValue
                }
              >
                {orders.length}
              </Text>

              <Text
                style={
                  styles.headerTotalLabel
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
            Complete order activity for this driver
          </Text>

          <View
            style={
              styles.headerStats
            }
          >
            <View
              style={
                styles.headerStat
              }
            >
              <View
                style={
                  styles.activeIcon
                }
              >
                <Text
                  style={
                    styles.activeIconText
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
                  {activeCount}
                </Text>

                <Text
                  style={
                    styles.headerStatLabel
                  }
                >
                  Active
                </Text>
              </View>
            </View>

            <View
              style={
                styles.statDivider
              }
            />

            <View
              style={
                styles.headerStat
              }
            >
              <View
                style={
                  styles.deliveredIcon
                }
              >
                <Text
                  style={
                    styles.deliveredIconText
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
                  {deliveredCount}
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
        {/* LIST */}
        {/* ================================================= */}

        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={() =>
                fetchOrders(
                  true,
                )
              }
              colors={[
                '#a9090d',
              ]}
              tintColor="#a9090d"
            />
          }
          contentContainerStyle={
            styles.content
          }
        >
          <View
            style={
              styles.sectionHeading
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Order History
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Tap an order to view complete details
            </Text>
          </View>

          {/* LOADING */}

          {loading && (
            <View
              style={
                styles.loadingBox
              }
            >
              <ActivityIndicator
                size="large"
                color="#a9090d"
              />

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
                Please wait...
              </Text>
            </View>
          )}

          {/* ERROR */}

          {!loading &&
            !!errorMessage && (
              <View
                style={
                  styles.errorCard
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
                  {errorMessage}
                </Text>

                <Pressable
                  onPress={() =>
                    fetchOrders()
                  }
                  style={
                    styles.retryButton
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
            )}

          {/* ORDERS */}

          {!loading &&
            !errorMessage &&
            orders.map(
              order => (
                <Pressable
                  key={
                    order.id
                  }
                  onPress={() =>
                    handleViewDetails(
                      order,
                    )
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.orderCard,

                    pressed &&
                      styles.orderCardPressed,
                  ]}
                >
                  {/* TOP */}

                  <View
                    style={
                      styles.orderTop
                    }
                  >
                    <View
                      style={
                        styles.orderNumberArea
                      }
                    >
                      <Text
                        style={
                          styles.orderLabel
                        }
                      >
                        ORDER NUMBER
                      </Text>

                      <Text
                        style={
                          styles.orderNumber
                        }
                      >
                        {order.orderNumber}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,

                        order.delivered
                          ? styles.deliveredBadge
                          : styles.activeBadge,
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,

                          {
                            backgroundColor:
                              order.delivered
                                ? '#20844b'
                                : '#d88916',
                          },
                        ]}
                      />

                      <Text
                        style={[
                          styles.statusText,

                          {
                            color:
                              order.delivered
                                ? '#20844b'
                                : '#9a6510',
                          },
                        ]}
                      >
                        {order.status}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={
                      styles.divider
                    }
                  />

                  {/* CUSTOMER */}

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
                          ?.charAt(
                            0,
                          )
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
                        numberOfLines={
                          1
                        }
                        style={
                          styles.customerName
                        }
                      >
                        {order.customerName}
                      </Text>

                      <Text
                        numberOfLines={
                          1
                        }
                        style={
                          styles.customerPhone
                        }
                      >
                        ☎ {order.mobile}
                      </Text>
                    </View>

                    <Pressable
                      onPress={event => {
                        event.stopPropagation?.();

                        handleCall(
                          order,
                        );
                      }}
                      style={
                        styles.callButton
                      }
                    >
                      <Image
                        source={require('../assets/login-icons/phone-call.png')}
                        style={
                          styles.callIcon
                        }
                        resizeMode="contain"
                      />
                    </Pressable>
                  </View>

                  {/* TIME */}

                  <View
                    style={
                      styles.orderBottom
                    }
                  >
                    <View
                      style={
                        styles.timeRow
                      }
                    >
                      <View
                        style={
                          styles.timeIcon
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

                      <View>
                        <Text
                          style={
                            styles.timeLabel
                          }
                        >
                          DELIVERY TIME
                        </Text>

                        <Text
                          style={
                            styles.timeValue
                          }
                        >
                          {order.time}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={
                        styles.detailsButton
                      }
                    >
                      <Text
                        style={
                          styles.detailsButtonText
                        }
                      >
                        View Details
                      </Text>

                      <Text
                        style={
                          styles.detailsArrow
                        }
                      >
                        ›
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ),
            )}

          {/* EMPTY */}

          {!loading &&
            !errorMessage &&
            orders.length ===
              0 && (
              <View
                style={
                  styles.emptyCard
                }
              >
                <View
                  style={
                    styles.emptyIcon
                  }
                >
                  <Text
                    style={
                      styles.emptyIconText
                    }
                  >
                    ▦
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
                  Driver order history will appear here.
                </Text>
              </View>
            )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default TotalOrders;

/* =========================================================
 * STYLES
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

    /* HEADER */

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

    headerTop: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    backButton: {
      width: 42,
      height: 42,

      borderRadius: 13,

      backgroundColor:
        'rgba(255,255,255,0.13)',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    backIcon: {
      width: 18,
      height: 18,

      tintColor:
        '#ffffff',
    },

    headerTitleArea: {
      flex: 1,

      marginLeft: 12,
    },

    headerEyebrow: {
      color:
        '#f4c454',

      fontSize: 9,

      fontWeight:
        '900',

      letterSpacing: 1.1,
    },

    headerTitle: {
      color:
        '#ffffff',

      fontSize: 22,

      fontWeight:
        '900',

      marginTop: 2,
    },

    headerTotalBadge: {
      width: 50,
      height: 50,

      borderRadius: 14,

      backgroundColor:
        '#ffffff',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    headerTotalValue: {
      color:
        '#a9090d',

      fontSize: 17,

      fontWeight:
        '900',
    },

    headerTotalLabel: {
      color:
        '#8e5557',

      fontSize: 7,

      fontWeight:
        '900',
    },

    headerSubtitle: {
      color:
        'rgba(255,255,255,0.72)',

      fontSize: 12,

      marginTop: 14,
    },

    headerStats: {
      minHeight: 70,

      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        'rgba(0,0,0,0.12)',

      borderRadius: 16,

      marginTop: 13,
    },

    headerStat: {
      flex: 1,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    statDivider: {
      width: 1,
      height: 35,

      backgroundColor:
        'rgba(255,255,255,0.15)',
    },

    activeIcon: {
      width: 37,
      height: 37,

      borderRadius: 11,

      backgroundColor:
        'rgba(244,196,84,0.18)',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight: 9,
    },

    activeIconText: {
      color:
        '#f4c454',

      fontSize: 19,
    },

    deliveredIcon: {
      width: 37,
      height: 37,

      borderRadius: 11,

      backgroundColor:
        'rgba(105,230,141,0.16)',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight: 9,
    },

    deliveredIconText: {
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

      fontWeight:
        '900',
    },

    headerStatLabel: {
      color:
        'rgba(255,255,255,0.7)',

      fontSize: 9,

      marginTop: 1,
    },

    /* CONTENT */

    content: {
      paddingHorizontal: 16,

      paddingTop: 18,

      paddingBottom: 70,
    },

    sectionHeading: {
      marginBottom: 12,
    },

    sectionTitle: {
      color:
        '#17191d',

      fontSize: 18,

      fontWeight:
        '900',
    },

    sectionSubtitle: {
      color:
        '#89909a',

      fontSize: 10.5,

      marginTop: 3,
    },

    /* ORDER CARD */

    orderCard: {
      backgroundColor:
        '#ffffff',

      borderRadius: 17,

      borderWidth: 1,

      borderColor:
        '#e9ebee',

      padding: 15,

      marginBottom: 12,

      elevation: 3,
    },

    orderCardPressed: {
      opacity: 0.78,

      transform: [
        {
          scale: 0.995,
        },
      ],
    },

    orderTop: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',
    },

    orderNumberArea: {
      flex: 1,
    },

    orderLabel: {
      color:
        '#969da7',

      fontSize: 8,

      fontWeight:
        '900',

      letterSpacing: 0.7,
    },

    orderNumber: {
      color:
        '#17191d',

      fontSize: 20,

      fontWeight:
        '900',

      marginTop: 4,
    },

    statusBadge: {
      flexDirection:
        'row',

      alignItems:
        'center',

      borderRadius: 10,

      paddingHorizontal: 8,

      paddingVertical: 6,

      marginLeft: 10,
    },

    activeBadge: {
      backgroundColor:
        '#fff4db',
    },

    deliveredBadge: {
      backgroundColor:
        '#e9f8ef',
    },

    statusDot: {
      width: 6,
      height: 6,

      borderRadius: 3,

      marginRight: 5,
    },

    statusText: {
      fontSize: 9,

      fontWeight:
        '900',

      textTransform:
        'uppercase',
    },

    divider: {
      height: 1,

      backgroundColor:
        '#f0f1f3',

      marginVertical: 13,
    },

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
    },

    customerName: {
      color:
        '#17191d',

      fontSize: 15,

      fontWeight:
        '900',

      marginTop: 2,
    },

    customerPhone: {
      color:
        '#687182',

      fontSize: 11,

      marginTop: 5,
    },

    callButton: {
      width: 42,
      height: 42,

      borderRadius: 12,

      backgroundColor:
        '#fff0f1',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginLeft: 8,
    },

    callIcon: {
      width: 17,
      height: 17,

      tintColor:
        '#a9090d',
    },

    orderBottom: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      backgroundColor:
        '#f8f9fa',

      borderRadius: 11,

      padding: 10,

      marginTop: 13,
    },

    timeRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      flex: 1,
    },

    timeIcon: {
      width: 30,
      height: 30,

      borderRadius: 9,

      backgroundColor:
        '#fff0f1',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight: 8,
    },

    timeIconText: {
      color:
        '#a9090d',

      fontSize: 14,
    },

    timeLabel: {
      color:
        '#969da7',

      fontSize: 7.5,

      fontWeight:
        '900',
    },

    timeValue: {
      color:
        '#4c5563',

      fontSize: 10.5,

      fontWeight:
        '700',

      marginTop: 2,
    },

    detailsButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        '#a9090d',

      paddingHorizontal: 10,

      paddingVertical: 8,

      borderRadius: 9,

      marginLeft: 8,
    },

    detailsButtonText: {
      color:
        '#ffffff',

      fontSize: 9.5,

      fontWeight:
        '900',
    },

    detailsArrow: {
      color:
        '#ffffff',

      fontSize: 19,

      marginLeft: 4,
    },

    /* LOADING */

    loadingBox: {
      minHeight: 250,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    loadingTitle: {
      color:
        '#17191d',

      fontSize: 18,

      fontWeight:
        '900',

      marginTop: 12,
    },

    loadingText: {
      color:
        '#7a828e',

      fontSize: 11,

      marginTop: 4,
    },

    /* ERROR */

    errorCard: {
      backgroundColor:
        '#fff1f2',

      borderRadius: 14,

      padding: 15,
    },

    errorTitle: {
      color:
        '#9f1239',

      fontSize: 15,

      fontWeight:
        '900',
    },

    errorText: {
      color:
        '#881337',

      fontSize: 11,

      lineHeight: 16,

      marginTop: 5,
    },

    retryButton: {
      alignSelf:
        'flex-start',

      backgroundColor:
        '#a9090d',

      paddingHorizontal: 12,

      paddingVertical: 8,

      borderRadius: 8,

      marginTop: 10,
    },

    retryText: {
      color:
        '#ffffff',

      fontSize: 10,

      fontWeight:
        '900',
    },

    /* EMPTY */

    emptyCard: {
      minHeight: 260,

      backgroundColor:
        '#ffffff',

      borderRadius: 17,

      alignItems:
        'center',

      justifyContent:
        'center',

      padding: 20,
    },

    emptyIcon: {
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

    emptyIconText: {
      color:
        '#a9090d',

      fontSize: 26,
    },

    emptyTitle: {
      color:
        '#17191d',

      fontSize: 18,

      fontWeight:
        '900',

      marginTop: 11,
    },

    emptyText: {
      color:
        '#7b838f',

      fontSize: 11,

      textAlign:
        'center',

      marginTop: 5,
    },
  });