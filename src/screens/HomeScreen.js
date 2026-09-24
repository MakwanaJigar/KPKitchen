import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
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
 * GET FIRST VALID VALUE
 * ========================================================= */

const getFirstValue = (...values) => {
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
 * GET TEXT VALUE
 * ========================================================= */

const getTextValue = (...values) => {
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
    ).trim();
  }

  if (
    typeof value === 'object'
  ) {
    const objectValue =
      getFirstValue(
        value?.name,
        value?.full_name,
        value?.customer_name,
        value?.title,
        value?.label,
        value?.value,
      );

    if (
      objectValue !== null &&
      objectValue !== undefined &&
      objectValue !== ''
    ) {
      return String(
        objectValue,
      ).trim();
    }
  }

  return '';
};

/* =========================================================
 * DIRECT CUSTOMER ADDRESS
 *
 * IMPORTANT:
 *
 * Your API returns:
 *
 * customer_address:
 * "D - 611 Titanium City Centre..."
 *
 * So we read that exact field FIRST.
 * ========================================================= */

const getCustomerAddress =
  rawOrder => {
    if (
      !rawOrder
    ) {
      return 'Delivery address not available';
    }

    /* =============================================
     * EXACT CURRENT API FIELD
     * ============================================= */

    if (
      rawOrder?.customer_address !== null &&
      rawOrder?.customer_address !== undefined &&
      String(
        rawOrder.customer_address,
      ).trim() !== ''
    ) {
      return String(
        rawOrder.customer_address,
      ).trim();
    }

    /* =============================================
     * IN CASE ORDER IS WRAPPED
     * ============================================= */

    if (
      rawOrder?.order?.customer_address !== null &&
      rawOrder?.order?.customer_address !== undefined &&
      String(
        rawOrder.order.customer_address,
      ).trim() !== ''
    ) {
      return String(
        rawOrder.order.customer_address,
      ).trim();
    }

    /* =============================================
     * OTHER POSSIBLE FALLBACKS
     * ============================================= */

    const fallback =
      rawOrder?.delivery_address ??
      rawOrder?.shipping_address ??
      rawOrder?.address ??
      rawOrder?.order?.delivery_address ??
      rawOrder?.order?.shipping_address ??
      rawOrder?.order?.address ??
      null;

    if (
      fallback !== null &&
      fallback !== undefined &&
      String(
        fallback,
      ).trim() !== ''
    ) {
      return String(
        fallback,
      ).trim();
    }

    return 'Delivery address not available';
  };

/* =========================================================
 * EXTRACT ORDERS ARRAY
 * ========================================================= */

const extractOrdersArray =
  responseData => {
    const possibleArrays = [
      /*
       * EXACT CURRENT API:
       *
       * {
       *   success: true,
       *   orders: [...]
       * }
       */
      responseData?.orders,

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
        return possibleArrays[
          index
        ];
      }
    }

    return [];
  };

/* =========================================================
 * STATUS
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
 * FILTER STATUS
 * ========================================================= */

const getFilterStatus =
  statusValue => {
    const status =
      normalizeStatusValue(
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
 * READY STATUS
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
 * OUT FOR DELIVERY
 * ========================================================= */

const isOutForDeliveryStatus =
  statusValue => {
    const status =
      normalizeStatusValue(
        statusValue,
      );

    return [
      'out_for_delivery',
      'on_the_way',
      'on_the_route',
      'in_delivery',
    ].includes(
      status,
    );
  };

/* =========================================================
 * FORMAT TIME
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
      return parsedDate
        .toLocaleTimeString(
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
 * FORMAT DATE
 * ========================================================= */

const formatDate =
  dateValue => {
    if (
      !dateValue
    ) {
      return '';
    }

    const date =
      new Date(
        dateValue,
      );

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return String(
        dateValue,
      );
    }

    return date.toLocaleDateString(
      'en-US',
      {
        day:
          '2-digit',

        month:
          'short',

        year:
          'numeric',
      },
    );
  };

/* =========================================================
 * FORMAT ORDER NUMBER
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
 * ORDER TIMESTAMP
 * ========================================================= */

const getOrderTimestamp =
  rawOrder => {
    const value =
      getFirstValue(
        rawOrder?.updated_at,
        rawOrder?.created_at,
        rawOrder?.date,
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
 * NORMALIZE ADD ONS
 * ========================================================= */

const normalizeAddOns =
  rawOrder => {
    const addOns =
      Array.isArray(
        rawOrder?.add_ons,
      )
        ? rawOrder.add_ons
        : Array.isArray(
            rawOrder?.addons,
          )
          ? rawOrder.addons
          : Array.isArray(
              rawOrder?.adons,
            )
            ? rawOrder.adons
            : [];

    return addOns.map(
      (
        item,
        index,
      ) => ({
        id:
          item?.id ??
          index,

        name:
          item?.name ??
          item?.title ??
          `Add-on ${index + 1}`,

        price:
          Number(
            item?.price ??
            0,
          ) || 0,

        qty:
          Number(
            item?.qty ??
            item?.quantity ??
            1,
          ) || 1,
      }),
    );
  };

/* =========================================================
 * NORMALIZE ORDER
 *
 * EXACT CURRENT PAYLOAD:
 *
 * {
 *   "id": "ORDKAAP3RAY",
 *   "customer": "Jigar Makwana",
 *   "customer_phone": "...",
 *   "customer_address": "...",
 *   "pincode": "3000",
 *   ...
 * }
 * ========================================================= */

const normalizeOrder = (
  rawOrder,
  index,
) => {
  const actualOrder =
    rawOrder?.order ??
    rawOrder;

  /* =====================================================
   * ORDER ID
   * ===================================================== */

  const orderId =
    getFirstValue(
      actualOrder?.id,
      actualOrder?.order_id,
      actualOrder?.orderId,

      rawOrder?.id,
      rawOrder?.order_id,
      rawOrder?.orderId,

      index + 1,
    );

  /* =====================================================
   * ORDER NUMBER
   * ===================================================== */

  const orderNumber =
    getFirstValue(
      actualOrder?.order_number,
      actualOrder?.order_no,
      actualOrder?.orderNumber,

      /*
       * Your current API uses ID as
       * order number.
       */
      actualOrder?.id,

      rawOrder?.order_number,
      rawOrder?.order_no,
      rawOrder?.id,

      orderId,
    );

  /* =====================================================
   * CUSTOMER NAME
   *
   * Exact API:
   *
   * customer: "Jigar Makwana"
   * ===================================================== */

  const customerName =
    getTextValue(
      actualOrder?.customer,

      actualOrder?.customer_name,

      rawOrder?.customer,

      rawOrder?.customer_name,
    ) ||
    'Customer';

  /* =====================================================
   * CUSTOMER ADDRESS
   *
   * IMPORTANT FIX
   * ===================================================== */

  const customerAddress =
    getCustomerAddress(
      rawOrder,
    );

  /* =====================================================
   * ADDRESS DEBUG
   *
   * Keep this temporarily.
   * ===================================================== */

  console.log(
    'ADDRESS DEBUG:',
    {
      orderId,

      directAddress:
        rawOrder
          ?.customer_address,

      actualOrderAddress:
        actualOrder
          ?.customer_address,

      resolvedAddress:
        customerAddress,
    },
  );

  /* =====================================================
   * PHONE
   *
   * INTERNAL ONLY.
   *
   * NOT DISPLAYED ON HOME.
   * ===================================================== */

  const customerPhone =
    getTextValue(
      actualOrder
        ?.customer_phone,

      rawOrder
        ?.customer_phone,

      actualOrder
        ?.customer_mobile,

      rawOrder
        ?.customer_mobile,
    );

  /* =====================================================
   * PINCODE
   * ===================================================== */

  const pincode =
    getTextValue(
      actualOrder?.pincode,

      rawOrder?.pincode,

      actualOrder?.zipcode,

      rawOrder?.zipcode,

      actualOrder?.zip_code,

      rawOrder?.zip_code,

      actualOrder?.postal_code,

      rawOrder?.postal_code,
    ) ||
    'N/A';

  /* =====================================================
   * AREA
   * ===================================================== */

  const area =
    getTextValue(
      actualOrder?.area,

      rawOrder?.area,
    );

  /* =====================================================
   * DRIVER
   * ===================================================== */

  const driverName =
    getTextValue(
      actualOrder?.driver,

      rawOrder?.driver,

      actualOrder?.driver_name,

      rawOrder?.driver_name,
    );

  /* =====================================================
   * TIFFIN
   * ===================================================== */

  const tiffinName =
    getTextValue(
      actualOrder?.tiffin,

      rawOrder?.tiffin,

      actualOrder?.tiffin_name,

      rawOrder?.tiffin_name,
    ) ||
    'Tiffin';

  const tiffinId =
    getFirstValue(
      actualOrder?.tiffin_id,

      rawOrder?.tiffin_id,
    );

  /* =====================================================
   * QUANTITY
   * ===================================================== */

  const quantity =
    Number(
      getFirstValue(
        actualOrder?.quantity,

        rawOrder?.quantity,

        1,
      ),
    ) || 1;

  /* =====================================================
   * AMOUNT
   * ===================================================== */

  const amount =
    Number(
      getFirstValue(
        actualOrder?.amount,

        rawOrder?.amount,

        actualOrder
          ?.total_amount,

        rawOrder
          ?.total_amount,

        0,
      ),
    ) || 0;

  /* =====================================================
   * STATUS
   * ===================================================== */

  const statusValue =
    getTextValue(
      actualOrder?.status,

      rawOrder?.status,

      actualOrder
        ?.delivery_status,

      rawOrder
        ?.delivery_status,

      actualOrder
        ?.order_status,

      rawOrder
        ?.order_status,
    ) ||
    'Pending';

  const filterStatus =
    getFilterStatus(
      statusValue,
    );

  /* =====================================================
   * DATE
   * ===================================================== */

  const orderDate =
    getTextValue(
      actualOrder?.date,

      rawOrder?.date,

      actualOrder?.order_date,

      rawOrder?.order_date,
    );

  /* =====================================================
   * NOTES
   *
   * Exact API:
   * note
   * ===================================================== */

  const notes =
    getTextValue(
      actualOrder?.note,

      rawOrder?.note,

      actualOrder?.notes,

      rawOrder?.notes,

      actualOrder
        ?.order_notes,

      rawOrder
        ?.order_notes,
    );

  /* =====================================================
   * ADD ONS
   * ===================================================== */

  const addOns =
    normalizeAddOns(
      actualOrder,
    );

  /* =====================================================
   * RETURN
   * ===================================================== */

  return {
    id:
      String(
        orderId,
      ),

    rawOrder,

    actualOrder,

    /* ORDER */

    orderNumber:
      formatOrderNumber(
        orderNumber,
      ),

    status:
      statusValue,

    filterStatus,

    date:
      orderDate,

    formattedDate:
      formatDate(
        orderDate,
      ),

    timestamp:
      getOrderTimestamp(
        rawOrder,
      ),

    /* CUSTOMER */

    customerId:
      actualOrder
        ?.customer_id ??
      rawOrder
        ?.customer_id ??
      null,

    customerName,

    /*
     * PHONE INTERNAL ONLY
     */
    mobile:
      customerPhone,

    /*
     * ADDRESS
     */
    address:
      customerAddress,

    zipcode:
      pincode,

    area,

    /* DRIVER */

    driverId:
      actualOrder
        ?.driver_id ??
      rawOrder
        ?.driver_id ??
      null,

    driverName,

    /* TIFFIN */

    tiffinId,

    tiffinName,

    quantity,

    amount,

    addOns,

    selections:
      actualOrder
        ?.selections ??
      rawOrder
        ?.selections ??
      null,

    notes,

    proofOfDeliveryPhoto:
      actualOrder
        ?.proof_of_delivery_photo ??
      rawOrder
        ?.proof_of_delivery_photo ??
      null,

    proofOfDeliverySignature:
      actualOrder
        ?.proof_of_delivery_signature ??
      rawOrder
        ?.proof_of_delivery_signature ??
      null,

    createdAt:
      actualOrder
        ?.created_at ??
      rawOrder
        ?.created_at ??
      null,

    updatedAt:
      actualOrder
        ?.updated_at ??
      rawOrder
        ?.updated_at ??
      null,
  };
};

/* =========================================================
 * HOME SCREEN
 * ========================================================= */

const HomeScreen = ({
  navigation,
}) => {
  const {
    width,
  } =
    useWindowDimensions();

  /* =======================================================
   * STATE
   * ======================================================= */

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

  const [
    driverName,
    setDriverName,
  ] =
    useState(
      'Delivery Partner',
    );

  /* =======================================================
   * RESPONSIVE
   * ======================================================= */

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
      screenPadding * 2 -
      cardGap -
      2
    ) /
    2;

  /* =======================================================
   * LOAD DRIVER INFO
   * ======================================================= */

  const loadDriverInfo =
    useCallback(
      async () => {
        try {
          const storedUser =
            await AsyncStorage.getItem(
              AUTH_USER_KEY,
            );

          if (
            !storedUser
          ) {
            return;
          }

          const parsedUser =
            JSON.parse(
              storedUser,
            );

          const name =
            getTextValue(
              parsedUser?.name,

              parsedUser?.full_name,

              parsedUser?.driver_name,

              parsedUser
                ?.data
                ?.name,
            );

          if (
            name
          ) {
            setDriverName(
              name,
            );
          }
        } catch (
          error
        ) {
          console.log(
            'DRIVER INFO ERROR:',
            error,
          );
        }
      },
      [],
    );

  /* =======================================================
   * CLEAR SESSION
   * ======================================================= */

  const clearLoginSession =
    async () => {
      try {
        await AsyncStorage.removeItem(
          AUTH_TOKEN_KEY,
        );

        await AsyncStorage.removeItem(
          AUTH_USER_KEY,
        );

        await AsyncStorage.removeItem(
          AUTH_EMAIL_KEY,
        );

        if (
          axios.defaults &&
          axios.defaults.headers &&
          axios.defaults.headers
            .common
        ) {
          delete axios.defaults
            .headers
            .common
            .Authorization;
        }
      } catch (
        error
      ) {
        console.log(
          'CLEAR SESSION ERROR:',
          error,
        );
      }
    };

  /* =======================================================
   * GO TO LOGIN
   * ======================================================= */

  const goToLoginScreen =
    useCallback(
      () => {
        let targetNavigation =
          navigation;

        let parent =
          targetNavigation
            .getParent?.();

        while (
          parent
        ) {
          targetNavigation =
            parent;

          parent =
            targetNavigation
              .getParent?.();
        }

        targetNavigation.dispatch(
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
      },
      [
        navigation,
      ],
    );

  /* =======================================================
   * FETCH ORDERS
   * ======================================================= */

  const fetchOrders =
    useCallback(
      async (
        refreshing =
          false,
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

            await clearLoginSession();

            goToLoginScreen();

            return;
          }

          /* =============================================
           * API
           * ============================================= */

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

          console.log(
            '========================================',
          );

          console.log(
            'DRIVER ASSIGNED ORDERS RAW RESPONSE:',
          );

          console.log(
            JSON.stringify(
              responseData,
              null,
              2,
            ),
          );

          console.log(
            '========================================',
          );

          if (
            responseData?.status ===
              false ||
            responseData?.success ===
              false
          ) {
            throw new Error(
              responseData?.message ||
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

          normalizedOrders =
            normalizedOrders.sort(
              (
                first,
                second,
              ) =>
                second.timestamp -
                first.timestamp,
            );

          console.log(
            '========================================',
          );

          console.log(
            'NORMALIZED HOME ORDERS:',
          );

          console.log(
            JSON.stringify(
              normalizedOrders,
              null,
              2,
            ),
          );

          console.log(
            '========================================',
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

            goToLoginScreen();

            return;
          }

          setOrdersError(
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
        goToLoginScreen,
      ],
    );

  /* =======================================================
   * INITIAL LOAD
   * ======================================================= */

  useEffect(
    () => {
      loadDriverInfo();

      fetchOrders();
    },
    [
      fetchOrders,
      loadDriverInfo,
    ],
  );

  /* =======================================================
   * FOCUS
   * ======================================================= */

  useFocusEffect(
    useCallback(
      () => {
        loadDriverInfo();

        fetchOrders();
      },
      [
        fetchOrders,
        loadDriverInfo,
      ],
    ),
  );

  /* =======================================================
   * COUNTS
   * ======================================================= */

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
            order.filterStatus ===
            'Delivered',
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

  const outForDeliveryCount =
    useMemo(
      () =>
        orders.filter(
          order =>
            isOutForDeliveryStatus(
              order.status,
            ),
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
            order.filterStatus ===
              'Pending' &&
            !isOutForDeliveryStatus(
              order.status,
            ),
        ).length,
      [
        orders,
      ],
    );

  /* =======================================================
   * STATISTICS
   * ======================================================= */

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
            totalAssigned > 0
              ? 'In progress'
              : 'No orders',

          badgeBackground:
            '#eef1f7',

          badgeTextColor:
            '#59677f',

          symbol:
            '▦',

          iconBackground:
            '#edf0f7',

          iconColor:
            '#576783',
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
            readyCount > 0
              ? 'Pick up now'
              : 'None ready',

          badgeBackground:
            '#fde8ea',

          badgeTextColor:
            '#d9001b',

          symbol:
            '✓',

          iconBackground:
            '#fff0f1',

          iconColor:
            '#d00018',
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
            deliveredCount > 0
              ? 'Success'
              : 'No delivery',

          badgeBackground:
            '#e3f4e9',

          badgeTextColor:
            '#07803f',

          symbol:
            '✓',

          iconBackground:
            '#e8f7ee',

          iconColor:
            '#07803f',
        },

        {
          id:
            4,

          title:
            outForDeliveryCount >
            0
              ? 'Out for Delivery'
              : 'Pending',

          value:
            String(
              outForDeliveryCount >
              0
                ? outForDeliveryCount
                : pendingCount,
            ),

          valueColor:
            '#c40016',

          badgeText:
            outForDeliveryCount >
            0
              ? 'On route'
              : pendingCount >
                0
                ? 'Action needed'
                : 'All clear',

          badgeBackground:
            '#fde8ea',

          badgeTextColor:
            '#d9001b',

          symbol:
            '◷',

          iconBackground:
            '#fff3e2',

          iconColor:
            '#d88916',
        },
      ],
      [
        totalAssigned,
        readyCount,
        deliveredCount,
        pendingCount,
        outForDeliveryCount,
      ],
    );

  /* =======================================================
   * RECENT ORDERS
   * ======================================================= */

  /*
   * Delivered orders are hidden from
   * Today's Deliveries; only pending
   * orders are shown here.
   */
  const recentOrders =
    useMemo(
      () =>
        orders
          .filter(
            order =>
              order.filterStatus !==
              'Delivered',
          )
          .slice(
            0,
            2,
          ),
      [
        orders,
      ],
    );

  /* =======================================================
   * NAVIGATION
   * ======================================================= */

  const handleViewAll =
    () => {
      navigation.navigate(
        'Orders',
      );
    };

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

  const handleProfilePress =
    () => {
      navigation.navigate(
        'Profile',
      );
    };

  const handleNotificationPress =
    () => {
      navigation.navigate(
        'Notification',
      );
    };

  /* =======================================================
   * DRIVER NAME
   * ======================================================= */

  const firstName =
    String(
      driverName ||
      'Delivery Partner',
    )
      .trim()
      .split(
        ' ',
      )[0];

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
      <StatusBar
        barStyle="light-content"
        backgroundColor="#a9090d"
      />

      <View
        style={
          styles.screen
        }
      >
        {/* HEADER */}

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
            <View
              style={
                styles.headerBrandArea
              }
            >
              <View
                style={
                  styles.brandIcon
                }
              >
                <Text
                  style={
                    styles.brandIconText
                  }
                >
                  KP
                </Text>
              </View>

              <View
                style={
                  styles.brandTextArea
                }
              >
                <Text
                  style={
                    styles.brandSmallText
                  }
                >
                  KP&apos;S KITCHEN
                </Text>

                <Text
                  numberOfLines={
                    1
                  }
                  style={
                    styles.dashboardTitle
                  }
                >
                  Driver Dashboard
                </Text>
              </View>
            </View>

            <View
              style={
                styles.headerActions
              }
            >
              <Pressable
                onPress={
                  handleNotificationPress
                }
                hitSlop={
                  8
                }
                style={({
                  pressed,
                }) => [
                  styles.headerActionButton,

                  pressed &&
                  styles.headerActionPressed,
                ]}
              >
                <View
                  style={
                    styles.newBell
                  }
                >
                  <View
                    style={
                      styles.newBellBody
                    }
                  />

                  <View
                    style={
                      styles.newBellBottom
                    }
                  />

                  <View
                    style={
                      styles.notificationDot
                    }
                  />
                </View>
              </Pressable>

              <Pressable
                onPress={
                  handleProfilePress
                }
                hitSlop={
                  8
                }
                style={({
                  pressed,
                }) => [
                  styles.profileHeaderButton,

                  pressed &&
                  styles.headerActionPressed,
                ]}
              >
                <Text
                  style={
                    styles.profileHeaderInitial
                  }
                >
                  {firstName
                    ?.charAt(
                      0,
                    )
                    ?.toUpperCase() ||
                    'D'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View
            style={
              styles.headerGreeting
            }
          >
            <Text
              style={
                styles.greetingLabel
              }
            >
              GOOD TO SEE YOU
            </Text>

            <Text
              numberOfLines={
                1
              }
              style={[
                styles.greetingName,

                isSmallScreen &&
                styles.greetingNameSmall,
              ]}
            >
              Hello, {firstName} 👋
            </Text>

            <View
              style={
                styles.onlineStatus
              }
            >
              <View
                style={
                  styles.onlineDot
                }
              />

              <Text
                style={
                  styles.onlineText
                }
              >
                Online • Ready for deliveries
              </Text>
            </View>
          </View>
        </View>

        {/* CONTENT */}

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
          {/* OVERVIEW */}

          <View
            style={
              styles.welcomeSection
            }
          >
            <View
              style={
                styles.welcomeTextArea
              }
            >
              <Text
                style={
                  styles.welcomeTitle
                }
              >
                Today&apos;s Overview
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                Check your assigned orders and deliveries for today.
              </Text>
            </View>

            <View
              style={
                styles.overviewIcon
              }
            >
              <Text
                style={
                  styles.overviewIconText
                }
              >
                ☰
              </Text>
            </View>
          </View>

          {/* TODAY'S DELIVERIES */}

          <View
            style={
              styles.recentActivitySection
            }
          >
            <View
              style={
                styles.sectionHeader
              }
            >
              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={
                    styles.sectionHeaderTitle
                  }
                >
                  Today&apos;s Deliveries
                </Text>

                <Text
                  style={
                    styles.sectionHeaderSubtitle
                  }
                >
                  Latest assigned customer orders
                </Text>
              </View>

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
                ]}
              >
                <Text
                  style={
                    styles.viewAllText
                  }
                >
                  View All
                </Text>

                <Text
                  style={
                    styles.viewAllArrow
                  }
                >
                  ›
                </Text>
              </Pressable>
            </View>

            {isLoading &&
            recentOrders.length ===
              0 ? (
              <View
                style={
                  styles.recentLoadingCard
                }
              >
                <ActivityIndicator
                  size="small"
                  color="#d00018"
                />

                <Text
                  style={
                    styles.recentLoadingText
                  }
                >
                  Loading recent orders...
                </Text>
              </View>
            ) : recentOrders.length >
              0 ? (
              <View
                style={
                  styles.activitiesContainer
                }
              >
                {recentOrders.map(
                  order => {
                    /*
                     * DIRECT FALLBACK AGAIN
                     * AT RENDER LEVEL.
                     *
                     * This makes address display
                     * even if normalized object
                     * somehow misses it.
                     */
                    const displayAddress =
                      order?.address ||
                      order
                        ?.rawOrder
                        ?.customer_address ||
                      order
                        ?.rawOrder
                        ?.order
                        ?.customer_address ||
                      'Delivery address not available';

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
                          styles.activityCardPressed,
                        ]}
                      >
                        {/* AVATAR */}

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

                        {/* INFO */}

                        <View
                          style={
                            styles.activityInformation
                          }
                        >
                          <Text
                            numberOfLines={
                              1
                            }
                            style={
                              styles.orderNumberLabel
                            }
                          >
                            ORDER {order.orderNumber}
                          </Text>

                          <Text
                            numberOfLines={
                              1
                            }
                            style={[
                              styles.activityTitle,

                              isSmallScreen &&
                              styles.activityTitleSmall,
                            ]}
                          >
                            {order.customerName}
                          </Text>

                          {/* ADDRESS */}

                          <View
                            style={
                              styles.customerAddressRow
                            }
                          >
                            <View
                              style={
                                styles.customerAddressIconBox
                              }
                            >
                              <View
                                style={
                                  styles.customerAddressDot
                                }
                              />
                            </View>

                            <Text
                              numberOfLines={
                                3
                              }
                              ellipsizeMode="tail"
                              style={[
                                styles.customerAddressText,

                                displayAddress ===
                                  'Delivery address not available' &&
                                styles.addressUnavailable,
                              ]}
                            >
                              {displayAddress}
                            </Text>
                          </View>
                        </View>

                        {/* ARROW */}

                        <View
                          style={
                            styles.activityRight
                          }
                        >
                          <View
                            style={
                              styles.activityArrowCircle
                            }
                          >
                            <Text
                              style={
                                styles.activityArrow
                              }
                            >
                              ›
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  },
                )}
              </View>
            ) : (
              <View
                style={
                  styles.noRecentOrderCard
                }
              >
                <View
                  style={
                    styles.noRecentOrderIcon
                  }
                >
                  <Text
                    style={
                      styles.noRecentOrderIconText
                    }
                  >
                    □
                  </Text>
                </View>

                <Text
                  style={
                    styles.noRecentOrderTitle
                  }
                >
                  No Pending Deliveries
                </Text>

                <Text
                  style={
                    styles.noRecentOrderText
                  }
                >
                  New assigned orders will appear here.
                </Text>
              </View>
            )}
          </View>

          {/* STATISTICS */}

          <View
            style={
              styles.sectionTitleRow
            }
          >
            <Text
              style={
                styles.mainSectionTitle
              }
            >
              Today&apos;s Statistics
            </Text>

            {!isLoading && (
              <View
                style={
                  styles.totalOrdersPill
                }
              >
                <Text
                  style={
                    styles.totalOrdersPillText
                  }
                >
                  {totalAssigned} Total
                </Text>
              </View>
            )}
          </View>

          {isLoading &&
          orders.length ===
            0 ? (
            <View
              style={
                styles.statisticsLoading
              }
            >
              <ActivityIndicator
                size="small"
                color="#d00018"
              />

              <Text
                style={
                  styles.statisticsLoadingText
                }
              >
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
              ]}
            >
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
                    ]}
                  >
                    <View
                      style={
                        styles.statCardTop
                      }
                    >
                      <View
                        style={[
                          styles.statIcon,

                          {
                            backgroundColor:
                              item.iconBackground,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statIconText,

                            {
                              color:
                                item.iconColor,
                            },
                          ]}
                        >
                          {item.symbol}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.statisticValue,

                          {
                            color:
                              item.valueColor,
                          },

                          isSmallScreen &&
                          styles.statisticValueSmall,
                        ]}
                      >
                        {item.value}
                      </Text>
                    </View>

                    <Text
                      numberOfLines={
                        2
                      }
                      style={[
                        styles.statisticCardTitle,

                        isSmallScreen &&
                        styles.statisticCardTitleSmall,
                      ]}
                    >
                      {item.title}
                    </Text>

                    <View
                      style={[
                        styles.statisticBadge,

                        {
                          backgroundColor:
                            item.badgeBackground,
                        },
                      ]}
                    >
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
                        ]}
                      >
                        {item.badgeText}
                      </Text>
                    </View>
                  </View>
                ),
              )}
            </View>
          )}

          {/* ERROR */}

          {!!ordersError && (
            <View
              style={
                styles.orderErrorCard
              }
            >
              <View
                style={
                  styles.orderErrorIcon
                }
              >
                <Text
                  style={
                    styles.orderErrorIconText
                  }
                >
                  !
                </Text>
              </View>

              <View
                style={
                  styles.orderErrorContent
                }
              >
                <Text
                  style={
                    styles.orderErrorTitle
                  }
                >
                  Unable to Load Orders
                </Text>

                <Text
                  style={
                    styles.orderErrorText
                  }
                >
                  {ordersError}
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
                      styles.retryButtonText
                    }
                  >
                    Try Again
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;

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

    pressed: {
      opacity: 0.68,
    },

    /* =====================================================
     * HEADER
     * ===================================================== */

    header: {
      minHeight: 215,

      backgroundColor:
        '#a9090d',

      paddingHorizontal: 18,

      paddingTop: 14,

      paddingBottom: 27,

      borderBottomLeftRadius: 28,

      borderBottomRightRadius: 28,

      overflow: 'hidden',

      elevation: 8,

      shadowColor:
        '#700000',

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity: 0.25,

      shadowRadius: 10,
    },

    headerCircleOne: {
      position: 'absolute',

      width: 190,

      height: 190,

      borderRadius: 95,

      borderWidth: 1,

      borderColor:
        'rgba(255,255,255,0.09)',

      top: -80,

      right: -60,
    },

    headerCircleTwo: {
      position: 'absolute',

      width: 130,

      height: 130,

      borderRadius: 65,

      backgroundColor:
        'rgba(255,255,255,0.035)',

      bottom: -60,

      left: -25,
    },

    headerTopRow: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',
    },

    headerBrandArea: {
      flex: 1,

      minWidth: 0,

      flexDirection: 'row',

      alignItems: 'center',
    },

    brandIcon: {
      width: 43,

      height: 43,

      borderRadius: 13,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        '#ffffff',

      marginRight: 11,

      elevation: 3,
    },

    brandIconText: {
      color:
        '#a9090d',

      fontSize: 16,

      fontWeight: '900',

      letterSpacing: -0.4,
    },

    brandTextArea: {
      flex: 1,

      minWidth: 0,
    },

    brandSmallText: {
      color:
        '#f4c454',

      fontSize: 9.5,

      lineHeight: 12,

      letterSpacing: 1.2,

      fontWeight: '900',
    },

    dashboardTitle: {
      color:
        '#ffffff',

      fontSize: 18,

      lineHeight: 23,

      fontWeight: '800',

      marginTop: 1,
    },

    headerActions: {
      flexDirection: 'row',

      alignItems: 'center',

      columnGap: 8,

      marginLeft: 9,
    },

    headerActionButton: {
      width: 42,

      height: 42,

      borderRadius: 13,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        'rgba(255,255,255,0.13)',

      borderWidth: 1,

      borderColor:
        'rgba(255,255,255,0.10)',
    },

    profileHeaderButton: {
      width: 42,

      height: 42,

      borderRadius: 21,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        '#ffffff',

      borderWidth: 2,

      borderColor:
        'rgba(255,255,255,0.35)',
    },

    profileHeaderInitial: {
      color:
        '#a9090d',

      fontSize: 17,

      fontWeight: '900',
    },

    headerActionPressed: {
      opacity: 0.75,

      transform: [
        {
          scale: 0.96,
        },
      ],
    },

    /* =====================================================
     * BELL
     * ===================================================== */

    newBell: {
      position: 'relative',

      width: 22,

      height: 24,

      alignItems: 'center',

      justifyContent: 'center',
    },

    newBellBody: {
      width: 14,

      height: 15,

      borderWidth: 2,

      borderColor:
        '#ffffff',

      borderTopLeftRadius: 8,

      borderTopRightRadius: 8,

      borderBottomLeftRadius: 4,

      borderBottomRightRadius: 4,
    },

    newBellBottom: {
      position: 'absolute',

      bottom: 2,

      width: 5,

      height: 2,

      borderRadius: 2,

      backgroundColor:
        '#ffffff',
    },

    notificationDot: {
      position: 'absolute',

      top: 0,

      right: 0,

      width: 7,

      height: 7,

      borderRadius: 4,

      backgroundColor:
        '#f4c454',

      borderWidth: 1.5,

      borderColor:
        '#a9090d',
    },

    /* =====================================================
     * GREETING
     * ===================================================== */

    headerGreeting: {
      marginTop: 28,
    },

    greetingLabel: {
      color:
        'rgba(255,255,255,0.62)',

      fontSize: 9.5,

      fontWeight: '800',

      letterSpacing: 1.1,
    },

    greetingName: {
      color:
        '#ffffff',

      fontSize: 30,

      lineHeight: 36,

      fontWeight: '900',

      letterSpacing: -0.6,

      marginTop: 3,
    },

    greetingNameSmall: {
      fontSize: 26,

      lineHeight: 32,
    },

    onlineStatus: {
      alignSelf:
        'flex-start',

      flexDirection: 'row',

      alignItems: 'center',

      backgroundColor:
        'rgba(0,0,0,0.12)',

      paddingHorizontal: 10,

      paddingVertical: 6,

      borderRadius: 20,

      marginTop: 9,
    },

    onlineDot: {
      width: 7,

      height: 7,

      borderRadius: 4,

      backgroundColor:
        '#69e68d',

      marginRight: 6,
    },

    onlineText: {
      color:
        'rgba(255,255,255,0.90)',

      fontSize: 10.5,

      fontWeight: '600',
    },

    /* =====================================================
     * CONTENT
     * ===================================================== */

    scrollContent: {
      flexGrow: 1,

      paddingTop: 18,

      paddingBottom: 100,
    },

    welcomeSection: {
      minHeight: 82,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',

      backgroundColor:
        '#ffffff',

      borderRadius: 15,

      borderWidth: 1,

      borderColor:
        '#eceef1',

      paddingHorizontal: 15,

      paddingVertical: 13,

      marginBottom: 23,

      elevation: 2,
    },

    welcomeTextArea: {
      flex: 1,

      minWidth: 0,

      paddingRight: 10,
    },

    welcomeTitle: {
      color:
        '#17191d',

      fontSize: 18,

      lineHeight: 23,

      fontWeight: '900',
    },

    subtitle: {
      color:
        '#707887',

      fontSize: 12,

      lineHeight: 17,

      marginTop: 3,
    },

    overviewIcon: {
      width: 40,

      height: 40,

      borderRadius: 12,

      backgroundColor:
        '#fff0f1',

      alignItems: 'center',

      justifyContent: 'center',
    },

    overviewIconText: {
      color:
        '#d00018',

      fontSize: 20,

      fontWeight: '700',
    },

    /* =====================================================
     * RECENT
     * ===================================================== */

    recentActivitySection: {
      marginBottom: 24,
    },

    sectionHeader: {
      marginBottom: 12,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',
    },

    sectionHeaderTitle: {
      color:
        '#15171b',

      fontSize: 18,

      lineHeight: 23,

      fontWeight: '900',
    },

    sectionHeaderSubtitle: {
      color:
        '#8a909b',

      fontSize: 10.5,

      marginTop: 2,
    },

    viewAllButton: {
      minHeight: 36,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        '#fff0f1',

      paddingHorizontal: 11,

      borderRadius: 18,
    },

    viewAllText: {
      color:
        '#d00018',

      fontSize: 11,

      fontWeight: '800',
    },

    viewAllArrow: {
      color:
        '#d00018',

      fontSize: 20,

      marginLeft: 3,
    },

    activitiesContainer: {
      rowGap: 10,
    },

    /* =====================================================
     * ORDER CARD
     * ===================================================== */

    activityCard: {
      minHeight: 126,

      paddingHorizontal: 13,

      paddingVertical: 13,

      backgroundColor:
        '#ffffff',

      borderRadius: 15,

      borderWidth: 1,

      borderColor:
        '#eceef1',

      flexDirection: 'row',

      alignItems: 'center',

      elevation: 2,
    },

    activityCardPressed: {
      opacity: 0.8,

      transform: [
        {
          scale: 0.995,
        },
      ],
    },

    customerAvatar: {
      width: 50,

      height: 50,

      marginRight: 12,

      borderRadius: 15,

      backgroundColor:
        '#fff0f1',

      alignItems: 'center',

      justifyContent: 'center',
    },

    customerAvatarText: {
      color:
        '#a9090d',

      fontSize: 20,

      fontWeight: '900',
    },

    activityInformation: {
      flex: 1,

      minWidth: 0,

      paddingRight: 8,
    },

    orderNumberLabel: {
      color:
        '#a9090d',

      fontSize: 11.5,

      lineHeight: 15,

      fontWeight: '900',

      letterSpacing: 0.35,
    },

    activityTitle: {
      color:
        '#15171b',

      fontSize: 16,

      lineHeight: 20,

      fontWeight: '900',

      marginTop: 4,
    },

    activityTitleSmall: {
      fontSize: 14.5,
    },

    /* =====================================================
     * ADDRESS
     * ===================================================== */

    customerAddressRow: {
      flexDirection: 'row',

      alignItems:
        'flex-start',

      marginTop: 7,

      paddingRight: 2,
    },

    customerAddressIconBox: {
      width: 20,

      height: 20,

      borderRadius: 6,

      backgroundColor:
        '#fff0f1',

      alignItems: 'center',

      justifyContent: 'center',

      marginRight: 7,

      marginTop: 1,
    },

    customerAddressDot: {
      width: 7,

      height: 7,

      borderRadius: 4,

      backgroundColor:
        '#a9090d',
    },

    customerAddressText: {
      flex: 1,

      color:
        '#687182',

      fontSize: 11,

      lineHeight: 16,

      fontWeight: '600',

      flexShrink: 1,
    },

    addressUnavailable: {
      color:
        '#a8adb5',

      fontStyle: 'italic',
    },

    activityRight: {
      alignItems: 'center',

      justifyContent: 'center',
    },

    activityArrowCircle: {
      width: 34,

      height: 34,

      borderRadius: 11,

      backgroundColor:
        '#f6f7f9',

      alignItems: 'center',

      justifyContent: 'center',
    },

    activityArrow: {
      color:
        '#a9090d',

      fontSize: 25,

      lineHeight: 26,

      fontWeight: '500',
    },

    /* =====================================================
     * LOADING / EMPTY
     * ===================================================== */

    recentLoadingCard: {
      minHeight: 90,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        '#ffffff',

      borderRadius: 14,

      borderWidth: 1,

      borderColor:
        '#eceef1',
    },

    recentLoadingText: {
      color:
        '#68718d',

      fontSize: 12,

      marginLeft: 8,
    },

    noRecentOrderCard: {
      minHeight: 150,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        '#ffffff',

      borderRadius: 14,

      borderWidth: 1,

      borderColor:
        '#eceef1',

      padding: 18,
    },

    noRecentOrderIcon: {
      width: 44,

      height: 44,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        '#fde8ea',

      borderRadius: 22,
    },

    noRecentOrderIconText: {
      color:
        '#d00018',

      fontSize: 20,
    },

    noRecentOrderTitle: {
      color:
        '#111111',

      fontSize: 14,

      fontWeight: '800',

      marginTop: 8,
    },

    noRecentOrderText: {
      color:
        '#6e7584',

      fontSize: 11,

      marginTop: 4,

      textAlign: 'center',
    },

    /* =====================================================
     * STATS
     * ===================================================== */

    sectionTitleRow: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',

      marginBottom: 12,
    },

    mainSectionTitle: {
      color:
        '#15171b',

      fontSize: 18,

      lineHeight: 23,

      fontWeight: '900',
    },

    totalOrdersPill: {
      backgroundColor:
        '#fff0f1',

      paddingHorizontal: 9,

      paddingVertical: 5,

      borderRadius: 15,
    },

    totalOrdersPillText: {
      color:
        '#d00018',

      fontSize: 10,

      fontWeight: '800',
    },

    statisticsContainer: {
      width: '100%',

      flexDirection: 'row',

      flexWrap: 'wrap',

      alignItems: 'stretch',
    },

    statisticCard: {
      minHeight: 140,

      paddingHorizontal: 13,

      paddingVertical: 13,

      backgroundColor:
        '#ffffff',

      borderRadius: 14,

      borderWidth: 1,

      borderColor:
        '#eceef1',

      elevation: 2,
    },

    statisticCardSmall: {
      minHeight: 136,

      paddingHorizontal: 10,
    },

    statCardTop: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',
    },

    statIcon: {
      width: 35,

      height: 35,

      borderRadius: 10,

      alignItems: 'center',

      justifyContent: 'center',
    },

    statIconText: {
      fontSize: 18,

      fontWeight: '900',
    },

    statisticValue: {
      fontSize: 29,

      lineHeight: 34,

      fontWeight: '900',
    },

    statisticValueSmall: {
      fontSize: 26,
    },

    statisticCardTitle: {
      minHeight: 34,

      color:
        '#3e4858',

      fontSize: 13,

      lineHeight: 17,

      fontWeight: '700',

      marginTop: 8,
    },

    statisticCardTitleSmall: {
      fontSize: 11.5,

      lineHeight: 15,
    },

    statisticBadge: {
      alignSelf:
        'flex-start',

      maxWidth: '100%',

      marginTop: 'auto',

      paddingHorizontal: 8,

      paddingVertical: 4,

      borderRadius: 20,
    },

    statisticBadgeText: {
      fontSize: 10.5,

      lineHeight: 13,

      fontWeight: '700',
    },

    statisticsLoading: {
      minHeight: 100,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        '#ffffff',

      borderRadius: 14,

      borderWidth: 1,

      borderColor:
        '#eceef1',
    },

    statisticsLoadingText: {
      color:
        '#68718d',

      fontSize: 12,

      marginLeft: 8,
    },

    /* =====================================================
     * ERROR
     * ===================================================== */

    orderErrorCard: {
      flexDirection: 'row',

      backgroundColor:
        '#fff1f2',

      borderWidth: 1,

      borderColor:
        '#f1d3d6',

      borderRadius: 12,

      padding: 12,

      marginTop: 15,

      marginBottom: 20,
    },

    orderErrorIcon: {
      width: 34,

      height: 34,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        '#d00018',

      borderRadius: 17,

      marginRight: 10,
    },

    orderErrorIconText: {
      color:
        '#ffffff',

      fontSize: 19,

      fontWeight: '900',
    },

    orderErrorContent: {
      flex: 1,
    },

    orderErrorTitle: {
      color:
        '#1a1a1a',

      fontSize: 13,

      fontWeight: '800',
    },

    orderErrorText: {
      color:
        '#6a6265',

      fontSize: 11,

      lineHeight: 16,

      marginTop: 3,
    },

    retryButton: {
      alignSelf:
        'flex-start',

      backgroundColor:
        '#d00018',

      borderRadius: 7,

      paddingHorizontal: 10,

      paddingVertical: 6,

      marginTop: 8,
    },

    retryButtonText: {
      color:
        '#ffffff',

      fontSize: 10,

      fontWeight: '800',
    },
  });