import React, { useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import AppAlert from '../components/AppAlert';

import { SafeAreaView } from 'react-native-safe-area-context';

import { launchCamera } from 'react-native-image-picker';

import AsyncStorage from '@react-native-async-storage/async-storage';

/* =========================================================
 * API
 * ========================================================= */

const UPLOAD_POD_API =
  'https://replete-software.com/projects/kp_admin/api/driver/orders/upload-pod';

/* =========================================================
 * DRIVER AUTH TOKEN
 * ========================================================= */

const DRIVER_AUTH_TOKEN_KEY = '@kp_kitchen_driver_token';

/* =========================================================
 * GET DRIVER TOKEN
 * ========================================================= */

const getDriverToken = async () => {
  try {
    const token = await AsyncStorage.getItem(DRIVER_AUTH_TOKEN_KEY);

    console.log('DELIVERY DRIVER TOKEN EXISTS:', !!token);

    if (!token || !String(token).trim()) {
      return null;
    }

    return String(token).trim();
  } catch (error) {
    console.log('DRIVER TOKEN READ ERROR:', error);

    return null;
  }
};

/* =========================================================
 * IMAGE HELPER
 * ========================================================= */

const normalizeImage = image => {
  if (!image) {
    return null;
  }

  if (typeof image === 'string') {
    return {
      uri: image,
      type: 'image/jpeg',
      fileName: `delivery-proof-${Date.now()}.jpg`,
    };
  }

  if (!image?.uri) {
    return null;
  }

  return {
    uri: image.uri,

    type: image.type || 'image/jpeg',

    fileName:
      image.fileName || image.name || `delivery-proof-${Date.now()}.jpg`,

    width: image.width,

    height: image.height,

    fileSize: image.fileSize,
  };
};

/* =========================================================
 * SERVER IMAGE URL
 * ========================================================= */

const normalizeServerImageUrl = value => {
  if (!value) {
    return null;
  }

  const image = String(value).trim();

  if (!image) {
    return null;
  }

  if (
    image.startsWith('http://') ||
    image.startsWith('https://') ||
    image.startsWith('file://') ||
    image.startsWith('content://')
  ) {
    return image;
  }

  const cleanPath = image.replace(/^\/+/, '');

  return 'https://replete-software.com/projects/kp_admin/' + cleanPath;
};

/* =========================================================
 * ORDER DETAILS
 * ========================================================= */

const OrderDetailsScreen = ({ navigation, route }) => {
  const { width } = useWindowDimensions();

  const normalizedOrder = route?.params?.normalizedOrder ?? {};

  const rawOrder = route?.params?.order ?? {};

  const actualOrder =
    rawOrder?.order ??
    rawOrder?.order_details ??
    rawOrder?.orderDetail ??
    rawOrder;

  /* =======================================================
   * INITIAL ORDER
   * ======================================================= */

  const initialOrder = {
    id:
      normalizedOrder?.id ?? actualOrder?.id ?? route?.params?.orderId ?? null,

    orderNumber:
      normalizedOrder?.orderNumber ??
      actualOrder?.order_number ??
      actualOrder?.order_no ??
      route?.params?.orderNumber ??
      `#${route?.params?.orderId ?? ''}`,

    customerName:
      normalizedOrder?.customerName ??
      actualOrder?.customer_name ??
      actualOrder?.customer?.name ??
      'Customer',

    mobile:
      normalizedOrder?.mobile ??
      actualOrder?.customer_phone ??
      actualOrder?.customer_mobile ??
      actualOrder?.customer?.phone ??
      actualOrder?.customer?.mobile ??
      'Phone not available',

    address:
      normalizedOrder?.address ??
      actualOrder?.delivery_address ??
      actualOrder?.address ??
      'Delivery address not available',

    zipcode:
      normalizedOrder?.zipcode ??
      actualOrder?.zipcode ??
      actualOrder?.pincode ??
      'N/A',

    paymentStatus:
      normalizedOrder?.paymentStatus ??
      actualOrder?.payment_status ??
      'PENDING',

    time: normalizedOrder?.time ?? actualOrder?.delivery_time ?? 'N/A',

    status:
      normalizedOrder?.status ??
      actualOrder?.delivery_status ??
      actualOrder?.status ??
      'Pending',

    notes:
      normalizedOrder?.notes ??
      actualOrder?.order_notes ??
      actualOrder?.notes ??
      '',

    items: Array.isArray(normalizedOrder?.items)
      ? normalizedOrder.items
      : Array.isArray(actualOrder?.items)
      ? actualOrder.items
      : [],

    deliveryProof:
      actualOrder?.delivery_proof ??
      actualOrder?.delivery_image ??
      actualOrder?.delivery_image_url ??
      actualOrder?.pod_image ??
      actualOrder?.pod_url ??
      null,

    deliveredAt: actualOrder?.delivered_at ?? actualOrder?.deliveredAt ?? null,
  };

  /* =======================================================
   * STATE
   * ======================================================= */

  const [order, setOrder] = useState(initialOrder);

  const [selectedImage, setSelectedImage] = useState(
    normalizeImage(initialOrder.deliveryProof),
  );

  const [cameraModalVisible, setCameraModalVisible] = useState(false);

  const [successVisible, setSuccessVisible] = useState(false);

  const [uploading, setUploading] = useState(false);

  /* =======================================================
   * RESPONSIVE
   * ======================================================= */

  const isSmallScreen = width <= 360;

  const isTablet = width >= 700;

  const pageWidth = isTablet ? Math.min(width, 760) : width;

  const horizontalPadding = isSmallScreen ? 12 : isTablet ? 24 : 16;

  /* =======================================================
   * STATUS
   * ======================================================= */

  const normalizedStatus = String(order?.status ?? '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_');

  const isDelivered = [
    'delivered',
    'completed',
    'complete',
    'delivery_completed',
  ].includes(normalizedStatus);

  const orderItems = useMemo(
    () => (Array.isArray(order?.items) ? order.items : []),

    [order?.items],
  );

  /* =======================================================
   * CALL CUSTOMER
   * ======================================================= */

  const handleCallCustomer = async () => {
    const mobile = String(order?.mobile ?? '').trim();

    if (!mobile || mobile === 'Phone not available') {
      AppAlert.alert(
        'Phone Unavailable',
        'Customer mobile number is not available.',
      );

      return;
    }

    const cleanPhone = mobile.replace(/[^\d+]/g, '');

    if (!cleanPhone) {
      AppAlert.alert(
        'Invalid Phone Number',
        'The customer mobile number is invalid.',
      );

      return;
    }

    try {
      await Linking.openURL(`tel:${cleanPhone}`);
    } catch (error) {
      console.log('CALL ERROR:', error);

      AppAlert.alert('Call Failed', 'Unable to open the phone application.');
    }
  };

  /* =======================================================
   * NAVIGATE
   * ======================================================= */

  const handleNavigate = async () => {
    if (!order?.address || order.address === 'Delivery address not available') {
      AppAlert.alert(
        'Address Unavailable',
        'Customer delivery address is not available.',
      );

      return;
    }

    const mapUrl =
      'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(order.address);

    try {
      await Linking.openURL(mapUrl);
    } catch (error) {
      console.log('MAP ERROR:', error);

      AppAlert.alert('Navigation Failed', 'Unable to open Google Maps.');
    }
  };

  /* =======================================================
   * CAMERA RESPONSE
   * ======================================================= */

  const handleCameraResponse = response => {
    if (response?.didCancel) {
      return;
    }

    if (response?.errorCode) {
      AppAlert.alert(
        'Camera Error',

        response?.errorMessage || 'Unable to capture delivery photo.',
      );

      return;
    }

    const asset = response?.assets?.[0];

    if (!asset?.uri) {
      AppAlert.alert('Invalid Photo', 'The captured photo could not be loaded.');

      return;
    }

    setSelectedImage(normalizeImage(asset));
  };

  /* =======================================================
   * CAMERA PERMISSION
   * ======================================================= */

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,

        {
          title: 'Camera Permission',

          message: 'Camera access is required to capture delivery proof.',

          buttonPositive: 'Allow',

          buttonNegative: 'Cancel',
        },
      );

      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.log('CAMERA PERMISSION ERROR:', error);

      return false;
    }
  };

  /* =======================================================
   * OPEN CAMERA
   * ======================================================= */

  const handleOpenCamera = async () => {
    setCameraModalVisible(false);

    const granted = await requestCameraPermission();

    if (!granted) {
      AppAlert.alert(
        'Permission Required',
        'Please allow camera permission to take delivery proof.',
      );

      return;
    }

    setTimeout(
      async () => {
        try {
          const response = await launchCamera({
            mediaType: 'photo',

            cameraType: 'back',

            quality: 0.85,

            maxWidth: 1600,

            maxHeight: 1600,

            saveToPhotos: false,

            includeBase64: false,
          });

          handleCameraResponse(response);
        } catch (error) {
          console.log('CAMERA ERROR:', error);

          AppAlert.alert(
            'Camera Error',

            error?.message || 'Unable to open the camera.',
          );
        }
      },

      300,
    );
  };

  /* =======================================================
   * REMOVE PHOTO
   * ======================================================= */

  const handleRemoveImage = () => {
    AppAlert.alert(
      'Remove Photo',

      'Are you sure you want to remove this delivery photo?',

      [
        {
          text: 'Cancel',

          style: 'cancel',
        },

        {
          text: 'Remove',

          style: 'destructive',

          onPress: () => {
            setSelectedImage(null);
          },
        },
      ],
    );
  };

  /* =======================================================
   * UPLOAD DELIVERY PROOF
   * ======================================================= */

  const uploadDeliveryProof = async () => {
    const orderId =
      order?.id ?? actualOrder?.id ?? route?.params?.orderId ?? null;

    const orderNumber =
      order?.orderNumber ??
      actualOrder?.order_number ??
      actualOrder?.order_no ??
      route?.params?.orderNumber ??
      '';

    if (!orderId && !orderNumber) {
      throw new Error(
        'Order identifier is missing. Unable to update this delivery.',
      );
    }

    if (!selectedImage?.uri) {
      throw new Error('Please take a delivery photo first.');
    }

    /*
     * Exact driver login token.
     */

    const token = await getDriverToken();

    if (!token) {
      throw new Error(
        'Driver login token was not found. Please logout and login again.',
      );
    }

    const formData = new FormData();

    /*
     * SEND ORDER ID
     */

    if (orderId !== null && orderId !== undefined && String(orderId).trim()) {
      formData.append('order_id', String(orderId));
    }

    /*
     * SEND ORDER NUMBER
     */

    if (orderNumber && String(orderNumber).trim()) {
      formData.append('order_number', String(orderNumber));
    }

    /*
     * STATUS
     */

    formData.append('status', 'delivered');

    /*
     * DELIVERY PHOTO
     *
     * Do not manually set multipart Content-Type.
     * React Native will add the multipart boundary.
     */

    formData.append(
      'delivery_image',

      {
        uri: selectedImage.uri,

        type: selectedImage.type || 'image/jpeg',

        name:
          selectedImage.fileName ||
          selectedImage.name ||
          `delivery-proof-${Date.now()}.jpg`,
      },
    );

    console.log('=====================================');

    console.log('UPLOAD POD REQUEST');

    console.log('UPLOAD POD API:', UPLOAD_POD_API);

    console.log('ORDER ID:', orderId);

    console.log('ORDER NUMBER:', orderNumber);

    console.log('TOKEN EXISTS:', !!token);

    console.log(
      'TOKEN START:',
      token ? `${token.substring(0, 8)}...` : 'NO TOKEN',
    );

    console.log('IMAGE:', selectedImage.uri);

    console.log('=====================================');

    /*
     * NEW DRIVER POD API
     */

    const response = await fetch(
      UPLOAD_POD_API,

      {
        method: 'POST',

        headers: {
          Accept: 'application/json',

          Authorization: `Bearer ${token}`,
        },

        body: formData,
      },
    );

    const responseText = await response.text();

    console.log('UPLOAD POD HTTP STATUS:', response.status);

    console.log('UPLOAD POD RAW RESPONSE:', responseText);

    let responseData = {};

    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      console.log('UPLOAD POD JSON PARSE ERROR:', parseError);

      responseData = {
        message: responseText,
      };
    }

    /*
     * AUTH ERROR
     */

    if (response.status === 401) {
      throw new Error(
        responseData?.message ||
          'Driver authentication failed. Please logout and login again.',
      );
    }

    /*
     * PERMISSION ERROR
     */

    if (response.status === 403) {
      throw new Error(
        responseData?.message || 'You are not authorized to update this order.',
      );
    }

    /*
     * VALIDATION ERROR
     */

    if (response.status === 422) {
      const validationErrors = responseData?.errors;

      if (validationErrors && typeof validationErrors === 'object') {
        const firstError = Object.values(validationErrors)
          .flat()
          .filter(Boolean)[0];

        throw new Error(
          firstError ||
            responseData?.message ||
            'The delivery information is invalid.',
        );
      }

      throw new Error(
        responseData?.message || 'The delivery information is invalid.',
      );
    }

    /*
     * GENERAL API ERROR
     */

    if (
      !response.ok ||
      responseData?.success === false ||
      responseData?.status === false
    ) {
      throw new Error(
        responseData?.message ||
          responseData?.error ||
          'Unable to upload delivery proof.',
      );
    }

    return responseData;
  };

  /* =======================================================
   * MARK AS DELIVERED
   * ======================================================= */

  const handleMarkDelivered = async () => {
    if (!selectedImage?.uri) {
      AppAlert.alert(
        'Delivery Photo Required',

        'Please take a delivery photo before marking this order as delivered.',
      );

      return;
    }

    if (uploading || isDelivered) {
      return;
    }

    try {
      setUploading(true);

      /*
       * API must succeed before updating frontend.
       */

      const responseData = await uploadDeliveryProof();

      console.log('DELIVERY SUCCESS:', JSON.stringify(responseData, null, 2));

      /*
       * SUPPORT COMMON API RESPONSE SHAPES
       */

      const serverOrder =
        responseData?.data?.order ??
        responseData?.order ??
        (responseData?.data &&
        typeof responseData.data === 'object' &&
        !Array.isArray(responseData.data)
          ? responseData.data
          : null);

      /*
       * GET RETURNED POD IMAGE
       */

      const returnedImage =
        responseData?.data?.pod_url ??
        responseData?.data?.pod_image ??
        responseData?.data?.delivery_image_url ??
        responseData?.data?.delivery_image ??
        responseData?.data?.proof_image_url ??
        responseData?.data?.proof_image ??
        responseData?.pod_url ??
        responseData?.pod_image ??
        responseData?.delivery_image_url ??
        responseData?.delivery_image ??
        responseData?.proof_image_url ??
        responseData?.proof_image ??
        serverOrder?.pod_url ??
        serverOrder?.pod_image ??
        serverOrder?.delivery_image_url ??
        serverOrder?.delivery_image ??
        serverOrder?.delivery_proof ??
        null;

      const serverImageUrl = normalizeServerImageUrl(returnedImage);

      const updatedDeliveryProof = {
        ...selectedImage,

        uri: serverImageUrl || selectedImage.uri,
      };

      const deliveredAt =
        serverOrder?.delivered_at ??
        serverOrder?.deliveredAt ??
        responseData?.data?.delivered_at ??
        responseData?.delivered_at ??
        new Date().toISOString();

      setSelectedImage(updatedDeliveryProof);

      /*
       * MARK LOCAL UI DELIVERED ONLY AFTER API SUCCESS
       */

      setOrder(previous => ({
        ...previous,

        ...(serverOrder && typeof serverOrder === 'object' ? serverOrder : {}),

        status: 'Delivered',

        deliveryProof: updatedDeliveryProof,

        deliveredAt,
      }));

      setSuccessVisible(true);
    } catch (error) {
      console.log('DELIVERY SUBMIT ERROR:', error);

      AppAlert.alert(
        'Delivery Failed',

        error?.message ||
          'Unable to upload the delivery photo or mark this order as delivered.',
      );
    } finally {
      setUploading(false);
    }
  };

  /* =======================================================
   * SUCCESS CLOSE
   * ======================================================= */

  const handleSuccessClose = () => {
    setSuccessVisible(false);

    navigation.goBack();
  };

  /* =======================================================
   * UI
   * ======================================================= */

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#a9090d" />

      <View style={styles.screen}>
        {/* HEADER */}

        <View style={styles.header}>
          <View pointerEvents="none" style={styles.headerCircleOne} />

          <View pointerEvents="none" style={styles.headerCircleTwo} />

          <View style={styles.headerTopRow}>
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={10}
              style={({ pressed }) => [
                styles.backButton,

                pressed && styles.headerPressed,
              ]}
            >
              <Image
                source={require('../assets/login-icons/back.png')}
                style={styles.backIcon}
                resizeMode="contain"
              />
            </Pressable>

            <View style={styles.headerTitleArea}>
              <Text style={styles.headerEyebrow}>KP'S KITCHEN</Text>

              <Text style={styles.headerTitle}>Order Details</Text>
            </View>

            <View
              style={[
                styles.headerStatusBadge,

                isDelivered && styles.headerStatusBadgeDelivered,
              ]}
            >
              <View
                style={[
                  styles.headerStatusDot,

                  isDelivered && styles.headerStatusDotDelivered,
                ]}
              />

              <Text
                style={[
                  styles.headerStatusText,

                  isDelivered && styles.headerStatusTextDelivered,
                ]}
              >
                {isDelivered ? 'DELIVERED' : 'ACTIVE'}
              </Text>
            </View>
          </View>

          <View style={styles.headerOrderArea}>
            <View style={styles.headerOrderLeft}>
              <Text style={styles.headerOrderLabel}>ORDER NUMBER</Text>

              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[
                  styles.headerOrderNumber,

                  isSmallScreen && styles.headerOrderNumberSmall,
                ]}
              >
                {order.orderNumber}
              </Text>

              <View style={styles.headerTimeRow}>
                <Text style={styles.headerTimeIcon}>◷</Text>

                <Text style={styles.headerTimeText}>
                  Delivery • {order.time}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* PAGE */}

        <View
          style={[
            styles.pageContainer,

            {
              maxWidth: pageWidth,
            },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,

              {
                paddingHorizontal: horizontalPadding,
              },
            ]}
          >
            <SectionHeading
              title="Delivery Information"
              subtitle="Customer and delivery location"
            />

            {/* CUSTOMER */}

            <View style={styles.customerCard}>
              <View style={styles.customerTop}>
                <View style={styles.customerAvatar}>
                  <Text style={styles.customerAvatarText}>
                    {order.customerName?.charAt(0)?.toUpperCase() || 'C'}
                  </Text>
                </View>

                <View style={styles.customerInformation}>
                  <Text style={styles.customerLabel}>CUSTOMER</Text>

                  <Text numberOfLines={1} style={styles.customerName}>
                    {order.customerName}
                  </Text>

                  <View style={styles.customerPhoneRow}>
                    <Image
                      source={require('../assets/login-icons/phone-call.png')}
                      style={styles.smallPhoneIcon}
                      resizeMode="contain"
                    />

                    <Text numberOfLines={1} style={styles.customerMobile}>
                      {order.mobile}
                    </Text>
                  </View>
                </View>
              </View>

              {/* ADDRESS */}

              <View style={styles.addressBox}>
                <View style={styles.addressIconBox}>
                  <Text style={styles.addressIcon}>⌖</Text>
                </View>

                <View style={styles.addressContent}>
                  <Text style={styles.addressLabel}>DELIVERY ADDRESS</Text>

                  <Text style={styles.customerAddress}>{order.address}</Text>

                  {!!order?.zipcode && order.zipcode !== 'N/A' && (
                    <View style={styles.zipBadge}>
                      <Text style={styles.zipBadgeText}>
                        ZIP {order.zipcode}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* ACTIONS */}

              <View style={styles.customerActions}>
                <Pressable
                  onPress={handleCallCustomer}
                  style={({ pressed }) => [
                    styles.callCustomerButton,

                    pressed && styles.actionPressed,
                  ]}
                >
                  <View style={styles.callIconCircle}>
                    <Image
                      source={require('../assets/login-icons/phone-call.png')}
                      style={styles.customerActionIcon}
                      resizeMode="contain"
                    />
                  </View>

                  <Text style={styles.callCustomerText}>Call Customer</Text>
                </Pressable>

                <Pressable
                  onPress={handleNavigate}
                  style={({ pressed }) => [
                    styles.navigateCustomerButton,

                    pressed && styles.actionPressed,
                  ]}
                >
                  <Text style={styles.navigateCustomerIcon}>➤</Text>

                  <Text style={styles.navigateCustomerText}>Navigate</Text>
                </Pressable>
              </View>
            </View>

            {/* NOTES */}

            {!!order?.notes && (
              <>
                <SectionHeading
                  title="Order Notes"
                  subtitle="Special customer instructions"
                />

                <View style={styles.notesCard}>
                  <View style={styles.noteIconBox}>
                    <Text style={styles.noteIcon}>i</Text>
                  </View>

                  <Text style={styles.notesText}>{order.notes}</Text>
                </View>
              </>
            )}

            {/* ORDER ITEMS */}

            {orderItems.length > 0 && (
              <>
                <SectionHeading
                  title="Order Items"
                  subtitle="Items included in this delivery"
                />

                <View style={styles.itemsCard}>
                  {orderItems.map((item, index) => (
                    <View
                      key={item?.id ?? `${index}`}
                      style={[
                        styles.itemRow,

                        index === orderItems.length - 1 && styles.lastItemRow,
                      ]}
                    >
                      <View
                        style={{
                          flex: 1,
                        }}
                      >
                        <Text style={styles.itemName}>
                          {item?.name ??
                            item?.tiffin_name ??
                            item?.product_name ??
                            'Tiffin'}
                        </Text>

                        <Text style={styles.itemQuantity}>
                          Qty: {item?.quantity ?? item?.qty ?? 1}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* DELIVERY PROOF */}

            <View style={styles.proofSectionHeading}>
              <View style={styles.proofHeadingContent}>
                <Text style={styles.sectionTitle}>Delivery Proof</Text>

                <Text style={styles.sectionSubtitle}>
                  Confirm delivery with a fresh photo
                </Text>
              </View>

              {!isDelivered && (
                <View style={styles.cameraOnlyBadge}>
                  <View style={styles.cameraOnlyDot} />

                  <Text style={styles.cameraOnlyText}>CAMERA ONLY</Text>
                </View>
              )}
            </View>

            {/* PHOTO */}

            {selectedImage?.uri ? (
              <View style={styles.proofCard}>
                <View style={styles.proofImageWrapper}>
                  <Image
                    source={{
                      uri: selectedImage.uri,
                    }}
                    style={[
                      styles.proofImage,

                      {
                        height: Math.min(
                          width * 0.57,

                          330,
                        ),
                      },
                    ]}
                    resizeMode="cover"
                  />

                  <View style={styles.proofImageBadge}>
                    <View style={styles.proofImageBadgeDot} />

                    <Text style={styles.proofImageBadgeText}>
                      {isDelivered ? 'DELIVERY PROOF' : 'PHOTO CAPTURED'}
                    </Text>
                  </View>
                </View>

                {!isDelivered && (
                  <View style={styles.proofActions}>
                    <Pressable
                      onPress={() => setCameraModalVisible(true)}
                      style={styles.changePhotoButton}
                    >
                      <Image
                        source={require('../assets/login-icons/camera-light.png')}
                        style={styles.changePhotoIcon}
                        resizeMode="contain"
                      />

                      <Text style={styles.changePhotoText}>Retake Photo</Text>
                    </Pressable>

                    <Pressable
                      onPress={handleRemoveImage}
                      style={styles.removePhotoButton}
                    >
                      <Text style={styles.removePhotoText}>Remove</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ) : (
              !isDelivered && (
                <Pressable
                  onPress={() => setCameraModalVisible(true)}
                  style={styles.emptyProof}
                >
                  <View style={styles.emptyProofIconOuter}>
                    <View style={styles.emptyProofIconCircle}>
                      <Image
                        source={require('../assets/login-icons/camera.png')}
                        style={styles.emptyProofCameraIcon}
                        resizeMode="contain"
                      />
                    </View>
                  </View>

                  <Text style={styles.emptyProofTitle}>
                    Take Delivery Photo
                  </Text>

                  <Text style={styles.emptyProofText}>
                    Take a fresh photo at the delivery location to confirm the
                    order was delivered to the customer.
                  </Text>

                  <View style={styles.takePhotoInlineButton}>
                    <Image
                      source={require('../assets/login-icons/camera-light.png')}
                      style={styles.takePhotoInlineIcon}
                      resizeMode="contain"
                    />

                    <Text style={styles.takePhotoInlineText}>Open Camera</Text>
                  </View>

                  <Text style={styles.galleryDisabledText}>
                    Gallery upload is disabled
                  </Text>
                </Pressable>
              )
            )}

            {/* MARK DELIVERED */}

            {!isDelivered ? (
              <Pressable
                disabled={uploading || !selectedImage?.uri}
                onPress={handleMarkDelivered}
                style={[
                  styles.markDeliveredButton,

                  (uploading || !selectedImage?.uri) && styles.disabledButton,
                ]}
              >
                {uploading ? (
                  <>
                    <ActivityIndicator size="small" color="#ffffff" />

                    <Text
                      style={[
                        styles.markDeliveredText,

                        {
                          marginLeft: 10,
                        },
                      ]}
                    >
                      Uploading Delivery...
                    </Text>
                  </>
                ) : (
                  <>
                    <View style={styles.markDeliveredIconCircle}>
                      <Text style={styles.markDeliveredIcon}>✓</Text>
                    </View>

                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Text style={styles.markDeliveredText}>
                        Mark as Delivered
                      </Text>

                      <Text style={styles.markDeliveredSubtext}>
                        Upload photo & complete delivery
                      </Text>
                    </View>

                    <Text style={styles.markDeliveredArrow}>›</Text>
                  </>
                )}
              </Pressable>
            ) : (
              <View style={styles.deliveredCard}>
                <View style={styles.deliveredIconCircle}>
                  <Text style={styles.deliveredIcon}>✓</Text>
                </View>

                <View
                  style={{
                    flex: 1,

                    marginLeft: 11,
                  }}
                >
                  <Text style={styles.deliveredTitle}>
                    Delivered Successfully
                  </Text>

                  <Text style={styles.deliveredText}>
                    Delivery has been completed and proof has been uploaded.
                  </Text>
                </View>
              </View>
            )}

            <View
              style={{
                height: 35,
              }}
            />
          </ScrollView>
        </View>
      </View>

      {/* CAMERA MODAL */}

      <Modal
        visible={cameraModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setCameraModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setCameraModalVisible(false)}
          />

          <View style={styles.cameraModalCard}>
            <View style={styles.modalTopIndicator} />

            <View style={styles.cameraModalIconOuter}>
              <Image
                source={require('../assets/login-icons/camera.png')}
                style={styles.cameraModalIconImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.modalTitle}>Delivery Proof</Text>

            <Text style={styles.modalDescription}>
              Take a fresh photo at the delivery location to confirm the
              customer received the order.
            </Text>

            <Pressable
              onPress={handleOpenCamera}
              style={styles.takePhotoButton}
            >
              <Image
                source={require('../assets/login-icons/camera-light.png')}
                style={styles.modalCameraButtonIcon}
                resizeMode="contain"
              />

              <View
                style={{
                  flex: 1,

                  marginLeft: 10,
                }}
              >
                <Text style={styles.takePhotoTitle}>Take Photo</Text>

                <Text style={styles.takePhotoSubtitle}>Open device camera</Text>
              </View>

              <Text style={styles.takePhotoArrow}>›</Text>
            </Pressable>

            <View style={styles.securityNote}>
              <View style={styles.securityIcon}>
                <Text style={styles.securityIconText}>✓</Text>
              </View>

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text style={styles.securityTitle}>Camera-only proof</Text>

                <Text style={styles.securityNoteText}>
                  Gallery uploads are disabled. A new photo must be captured
                  directly from the device camera.
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => setCameraModalVisible(false)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* SUCCESS MODAL */}

      <Modal
        visible={successVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successCircleOuter}>
              <View style={styles.successCircle}>
                <Text style={styles.successCheck}>✓</Text>
              </View>
            </View>

            <Text style={styles.successTitle}>Delivery Successful!</Text>

            <Text style={styles.successOrderNumber}>{order.orderNumber}</Text>

            <Text style={styles.successMessage}>
              The delivery photo has been uploaded and the order has been marked
              as delivered successfully.
            </Text>

            <View style={styles.successInfoBox}>
              <View style={styles.successInfoDot} />

              <Text style={styles.successInfoText}>
                Delivery proof uploaded successfully
              </Text>
            </View>

            <Pressable
              onPress={handleSuccessClose}
              style={styles.successButton}
            >
              <Text style={styles.successButtonText}>Back to Orders</Text>

              <Text style={styles.successButtonArrow}>›</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

/* =========================================================
 * SECTION HEADING
 * ========================================================= */

const SectionHeading = ({ title, subtitle }) => (
  <View style={styles.sectionHeading}>
    <Text style={styles.sectionTitle}>{title}</Text>

    {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
  </View>
);

export default OrderDetailsScreen;

/* =========================================================
 * STYLES
 * ========================================================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,

    backgroundColor: '#a9090d',
  },

  screen: {
    flex: 1,

    backgroundColor: '#f6f7f9',
  },

  header: {
    minHeight: 205,

    backgroundColor: '#a9090d',

    paddingHorizontal: 17,

    paddingTop: 12,

    paddingBottom: 24,

    borderBottomLeftRadius: 28,

    borderBottomRightRadius: 28,

    overflow: 'hidden',

    elevation: 8,
  },

  headerCircleOne: {
    position: 'absolute',

    width: 200,

    height: 200,

    borderRadius: 100,

    borderWidth: 1,

    borderColor: 'rgba(255,255,255,0.09)',

    top: -95,

    right: -65,
  },

  headerCircleTwo: {
    position: 'absolute',

    width: 130,

    height: 130,

    borderRadius: 65,

    backgroundColor: 'rgba(255,255,255,0.035)',

    bottom: -75,

    left: -35,
  },

  headerTopRow: {
    flexDirection: 'row',

    alignItems: 'center',
  },

  backButton: {
    width: 42,

    height: 42,

    borderRadius: 13,

    backgroundColor: 'rgba(255,255,255,0.13)',

    alignItems: 'center',

    justifyContent: 'center',
  },

  backIcon: {
    width: 18,

    height: 18,

    tintColor: '#ffffff',
  },

  headerPressed: {
    opacity: 0.7,
  },

  headerTitleArea: {
    flex: 1,

    marginLeft: 12,
  },

  headerEyebrow: {
    color: '#f4c454',

    fontSize: 9,

    fontWeight: '900',

    letterSpacing: 1.1,
  },

  headerTitle: {
    color: '#ffffff',

    fontSize: 21,

    fontWeight: '900',

    marginTop: 1,
  },

  headerStatusBadge: {
    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: 'rgba(255,255,255,0.14)',

    borderRadius: 12,

    paddingHorizontal: 8,

    paddingVertical: 6,
  },

  headerStatusBadgeDelivered: {
    backgroundColor: 'rgba(105,230,141,0.16)',
  },

  headerStatusDot: {
    width: 6,

    height: 6,

    borderRadius: 3,

    backgroundColor: '#f4c454',

    marginRight: 5,
  },

  headerStatusDotDelivered: {
    backgroundColor: '#69e68d',
  },

  headerStatusText: {
    color: '#ffffff',

    fontSize: 8.5,

    fontWeight: '900',
  },

  headerStatusTextDelivered: {
    color: '#b8ffd0',
  },

  headerOrderArea: {
    marginTop: 25,
  },

  headerOrderLeft: {
    flex: 1,
  },

  headerOrderLabel: {
    color: 'rgba(255,255,255,0.55)',

    fontSize: 8.5,

    fontWeight: '900',
  },

  headerOrderNumber: {
    color: '#ffffff',

    fontSize: 28,

    fontWeight: '900',

    marginTop: 2,
  },

  headerOrderNumberSmall: {
    fontSize: 24,
  },

  headerTimeRow: {
    flexDirection: 'row',

    alignItems: 'center',

    marginTop: 6,
  },

  headerTimeIcon: {
    color: '#f4c454',

    fontSize: 13,

    marginRight: 5,
  },

  headerTimeText: {
    color: 'rgba(255,255,255,0.72)',

    fontSize: 10.5,

    fontWeight: '600',
  },

  pageContainer: {
    flex: 1,

    width: '100%',

    alignSelf: 'center',
  },

  scrollContent: {
    paddingTop: 17,

    paddingBottom: 55,
  },

  sectionHeading: {
    marginTop: 22,

    marginBottom: 9,
  },

  sectionTitle: {
    color: '#17191d',

    fontSize: 17,

    fontWeight: '900',
  },

  sectionSubtitle: {
    color: '#89909a',

    fontSize: 10,

    marginTop: 3,
  },

  customerCard: {
    backgroundColor: '#ffffff',

    borderRadius: 16,

    borderWidth: 1,

    borderColor: '#e9ebee',

    padding: 14,

    elevation: 2,
  },

  customerTop: {
    flexDirection: 'row',

    alignItems: 'center',
  },

  customerAvatar: {
    width: 50,

    height: 50,

    borderRadius: 15,

    backgroundColor: '#fff0f1',

    alignItems: 'center',

    justifyContent: 'center',
  },

  customerAvatarText: {
    color: '#a9090d',

    fontSize: 20,

    fontWeight: '900',
  },

  customerInformation: {
    flex: 1,

    marginLeft: 11,
  },

  customerLabel: {
    color: '#9a9fa8',

    fontSize: 8,

    fontWeight: '900',
  },

  customerName: {
    color: '#22252b',

    fontSize: 15,

    fontWeight: '900',

    marginTop: 2,
  },

  customerPhoneRow: {
    flexDirection: 'row',

    alignItems: 'center',

    marginTop: 5,
  },

  smallPhoneIcon: {
    width: 13,

    height: 13,

    tintColor: '#a9090d',

    marginRight: 5,
  },

  customerMobile: {
    flexShrink: 1,

    color: '#606978',

    fontSize: 10.5,
  },

  addressBox: {
    flexDirection: 'row',

    backgroundColor: '#f8f9fa',

    borderRadius: 12,

    padding: 11,

    marginTop: 13,
  },

  addressIconBox: {
    width: 35,

    height: 35,

    borderRadius: 11,

    backgroundColor: '#fff0f1',

    alignItems: 'center',

    justifyContent: 'center',

    marginRight: 9,
  },

  addressIcon: {
    color: '#a9090d',

    fontSize: 18,

    fontWeight: '900',
  },

  addressContent: {
    flex: 1,
  },

  addressLabel: {
    color: '#9298a1',

    fontSize: 8,

    fontWeight: '900',
  },

  customerAddress: {
    color: '#4f5866',

    fontSize: 10.5,

    lineHeight: 15,

    marginTop: 3,
  },

  zipBadge: {
    alignSelf: 'flex-start',

    backgroundColor: '#eef0f3',

    borderRadius: 6,

    paddingHorizontal: 7,

    paddingVertical: 4,

    marginTop: 7,
  },

  zipBadgeText: {
    color: '#6d7480',

    fontSize: 8,

    fontWeight: '800',
  },

  customerActions: {
    flexDirection: 'row',

    gap: 8,

    marginTop: 13,
  },

  callCustomerButton: {
    flex: 1,

    height: 47,

    borderRadius: 10,

    borderWidth: 1,

    borderColor: '#eadcdd',

    backgroundColor: '#fffafa',

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',
  },

  callIconCircle: {
    width: 27,

    height: 27,

    borderRadius: 8,

    backgroundColor: '#fff0f1',

    alignItems: 'center',

    justifyContent: 'center',

    marginRight: 6,
  },

  customerActionIcon: {
    width: 14,

    height: 14,

    tintColor: '#a9090d',
  },

  callCustomerText: {
    color: '#a9090d',

    fontSize: 10.5,

    fontWeight: '900',
  },

  navigateCustomerButton: {
    flex: 1,

    height: 47,

    borderRadius: 10,

    backgroundColor: '#a9090d',

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',
  },

  navigateCustomerIcon: {
    color: '#ffffff',

    fontSize: 17,

    marginRight: 7,
  },

  navigateCustomerText: {
    color: '#ffffff',

    fontSize: 10.5,

    fontWeight: '900',
  },

  actionPressed: {
    opacity: 0.7,
  },

  notesCard: {
    flexDirection: 'row',

    backgroundColor: '#fffaf0',

    borderRadius: 13,

    borderWidth: 1,

    borderColor: '#f2e2bf',

    padding: 12,
  },

  noteIconBox: {
    width: 30,

    height: 30,

    borderRadius: 9,

    backgroundColor: '#f4c454',

    alignItems: 'center',

    justifyContent: 'center',

    marginRight: 9,
  },

  noteIcon: {
    color: '#ffffff',

    fontWeight: '900',
  },

  notesText: {
    flex: 1,

    color: '#625949',

    fontSize: 10.5,

    lineHeight: 16,
  },

  itemsCard: {
    backgroundColor: '#ffffff',

    borderRadius: 15,

    borderWidth: 1,

    borderColor: '#e9ebee',

    paddingHorizontal: 12,
  },

  itemRow: {
    minHeight: 54,

    justifyContent: 'center',

    borderBottomWidth: 1,

    borderBottomColor: '#eeeeee',
  },

  lastItemRow: {
    borderBottomWidth: 0,
  },

  itemName: {
    color: '#22252b',

    fontSize: 11,

    fontWeight: '900',
  },

  itemQuantity: {
    color: '#89909a',

    fontSize: 9,

    marginTop: 3,
  },

  proofSectionHeading: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginTop: 22,

    marginBottom: 9,
  },

  proofHeadingContent: {
    flex: 1,
  },

  cameraOnlyBadge: {
    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: '#fff0f1',

    borderRadius: 9,

    paddingHorizontal: 7,

    paddingVertical: 5,
  },

  cameraOnlyDot: {
    width: 5,

    height: 5,

    borderRadius: 3,

    backgroundColor: '#a9090d',

    marginRight: 5,
  },

  cameraOnlyText: {
    color: '#a9090d',

    fontSize: 8,

    fontWeight: '900',
  },

  proofCard: {
    backgroundColor: '#ffffff',

    borderRadius: 16,

    overflow: 'hidden',

    borderWidth: 1,

    borderColor: '#e9ebee',
  },

  proofImageWrapper: {
    position: 'relative',
  },

  proofImage: {
    width: '100%',

    maxHeight: 330,

    backgroundColor: '#efefef',
  },

  proofImageBadge: {
    position: 'absolute',

    top: 10,

    left: 10,

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: 'rgba(0,0,0,0.63)',

    borderRadius: 12,

    paddingHorizontal: 8,

    paddingVertical: 5,
  },

  proofImageBadgeDot: {
    width: 6,

    height: 6,

    borderRadius: 3,

    backgroundColor: '#69e68d',

    marginRight: 5,
  },

  proofImageBadgeText: {
    color: '#ffffff',

    fontSize: 8,

    fontWeight: '900',
  },

  proofActions: {
    flexDirection: 'row',

    gap: 8,

    padding: 10,
  },

  changePhotoButton: {
    flex: 1,

    height: 44,

    borderRadius: 9,

    backgroundColor: '#a9090d',

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',
  },

  changePhotoIcon: {
    width: 15,

    height: 15,

    marginRight: 6,
  },

  changePhotoText: {
    color: '#ffffff',

    fontSize: 10.5,

    fontWeight: '900',
  },

  removePhotoButton: {
    flex: 0.65,

    height: 44,

    borderRadius: 9,

    borderWidth: 1,

    borderColor: '#e5babc',

    backgroundColor: '#ffffff',

    alignItems: 'center',

    justifyContent: 'center',
  },

  removePhotoText: {
    color: '#a9090d',

    fontSize: 10.5,

    fontWeight: '900',
  },

  emptyProof: {
    minHeight: 260,

    backgroundColor: '#ffffff',

    borderRadius: 17,

    borderWidth: 1.3,

    borderStyle: 'dashed',

    borderColor: '#ddbfc1',

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 20,

    paddingVertical: 22,
  },

  emptyProofIconOuter: {
    width: 78,

    height: 78,

    borderRadius: 39,

    backgroundColor: '#fff5f5',

    alignItems: 'center',

    justifyContent: 'center',
  },

  emptyProofIconCircle: {
    width: 57,

    height: 57,

    borderRadius: 29,

    backgroundColor: '#fff0f1',

    alignItems: 'center',

    justifyContent: 'center',
  },

  emptyProofCameraIcon: {
    width: 25,

    height: 25,

    tintColor: '#a9090d',
  },

  emptyProofTitle: {
    color: '#22252b',

    fontSize: 15,

    fontWeight: '900',

    marginTop: 12,
  },

  emptyProofText: {
    maxWidth: 290,

    color: '#7c8490',

    fontSize: 10.5,

    lineHeight: 16,

    textAlign: 'center',

    marginTop: 6,
  },

  takePhotoInlineButton: {
    minWidth: 155,

    height: 40,

    borderRadius: 9,

    backgroundColor: '#a9090d',

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    marginTop: 13,
  },

  takePhotoInlineIcon: {
    width: 15,

    height: 15,

    marginRight: 7,
  },

  takePhotoInlineText: {
    color: '#ffffff',

    fontSize: 10.5,

    fontWeight: '900',
  },

  galleryDisabledText: {
    color: '#23834b',

    fontSize: 9,

    fontWeight: '700',

    marginTop: 10,
  },

  markDeliveredButton: {
    minHeight: 64,

    backgroundColor: '#a9090d',

    borderRadius: 15,

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 13,

    marginTop: 17,

    elevation: 4,
  },

  disabledButton: {
    opacity: 0.4,
  },

  markDeliveredIconCircle: {
    width: 38,

    height: 38,

    borderRadius: 11,

    backgroundColor: 'rgba(255,255,255,0.15)',

    alignItems: 'center',

    justifyContent: 'center',

    marginRight: 10,
  },

  markDeliveredIcon: {
    color: '#ffffff',

    fontSize: 18,

    fontWeight: '900',
  },

  markDeliveredText: {
    color: '#ffffff',

    fontSize: 12,

    fontWeight: '900',
  },

  markDeliveredSubtext: {
    color: 'rgba(255,255,255,0.68)',

    fontSize: 9,

    marginTop: 2,
  },

  markDeliveredArrow: {
    color: '#ffffff',

    fontSize: 28,
  },

  deliveredCard: {
    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: '#eaf8ef',

    borderRadius: 15,

    borderWidth: 1,

    borderColor: '#ccebd7',

    padding: 14,

    marginTop: 17,
  },

  deliveredIconCircle: {
    width: 40,

    height: 40,

    borderRadius: 20,

    backgroundColor: '#24a05b',

    alignItems: 'center',

    justifyContent: 'center',
  },

  deliveredIcon: {
    color: '#ffffff',

    fontSize: 18,

    fontWeight: '900',
  },

  deliveredTitle: {
    color: '#227044',

    fontSize: 12,

    fontWeight: '900',
  },

  deliveredText: {
    color: '#688374',

    fontSize: 9.5,

    lineHeight: 14,

    marginTop: 3,
  },

  modalOverlay: {
    flex: 1,

    backgroundColor: 'rgba(18,23,29,0.68)',

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 20,
  },

  cameraModalCard: {
    width: '100%',

    maxWidth: 400,

    backgroundColor: '#ffffff',

    borderRadius: 24,

    padding: 20,
  },

  modalTopIndicator: {
    width: 42,

    height: 4,

    borderRadius: 2,

    backgroundColor: '#d9dadd',

    alignSelf: 'center',

    marginBottom: 19,
  },

  cameraModalIconOuter: {
    width: 82,

    height: 82,

    borderRadius: 41,

    backgroundColor: '#fff0f1',

    alignSelf: 'center',

    alignItems: 'center',

    justifyContent: 'center',
  },

  cameraModalIconImage: {
    width: 30,

    height: 30,

    tintColor: '#a9090d',
  },

  modalTitle: {
    color: '#202227',

    fontSize: 21,

    fontWeight: '900',

    textAlign: 'center',

    marginTop: 14,
  },

  modalDescription: {
    color: '#777f8b',

    fontSize: 11,

    lineHeight: 17,

    textAlign: 'center',

    marginTop: 6,

    marginBottom: 17,
  },

  takePhotoButton: {
    minHeight: 69,

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: '#a9090d',

    borderRadius: 13,

    paddingHorizontal: 14,
  },

  modalCameraButtonIcon: {
    width: 22,

    height: 22,
  },

  takePhotoTitle: {
    color: '#ffffff',

    fontSize: 13,

    fontWeight: '900',
  },

  takePhotoSubtitle: {
    color: 'rgba(255,255,255,0.72)',

    fontSize: 9.5,

    marginTop: 3,
  },

  takePhotoArrow: {
    color: '#ffffff',

    fontSize: 28,
  },

  securityNote: {
    flexDirection: 'row',

    backgroundColor: '#f4faf6',

    borderWidth: 1,

    borderColor: '#deebe2',

    borderRadius: 11,

    padding: 11,

    marginTop: 12,
  },

  securityIcon: {
    width: 26,

    height: 26,

    borderRadius: 13,

    backgroundColor: '#20a154',

    alignItems: 'center',

    justifyContent: 'center',

    marginRight: 9,
  },

  securityIconText: {
    color: '#ffffff',

    fontSize: 12,

    fontWeight: '900',
  },

  securityTitle: {
    color: '#277047',

    fontSize: 10,

    fontWeight: '900',
  },

  securityNoteText: {
    color: '#68756d',

    fontSize: 9,

    lineHeight: 14,

    marginTop: 2,
  },

  cancelButton: {
    height: 47,

    borderRadius: 10,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: '#f0f1f3',

    marginTop: 12,
  },

  cancelText: {
    color: '#555d69',

    fontSize: 11,

    fontWeight: '800',
  },

  successCard: {
    width: '100%',

    maxWidth: 370,

    backgroundColor: '#ffffff',

    borderRadius: 25,

    padding: 25,

    alignItems: 'center',
  },

  successCircleOuter: {
    width: 100,

    height: 100,

    borderRadius: 50,

    backgroundColor: '#edf9f2',

    alignItems: 'center',

    justifyContent: 'center',
  },

  successCircle: {
    width: 60,

    height: 60,

    borderRadius: 30,

    backgroundColor: '#27a15e',

    alignItems: 'center',

    justifyContent: 'center',
  },

  successCheck: {
    color: '#ffffff',

    fontSize: 30,

    fontWeight: '900',
  },

  successTitle: {
    color: '#202228',

    fontSize: 21,

    fontWeight: '900',

    marginTop: 16,
  },

  successOrderNumber: {
    color: '#a9090d',

    fontSize: 13,

    fontWeight: '900',

    marginTop: 4,
  },

  successMessage: {
    color: '#737b87',

    fontSize: 11,

    lineHeight: 17,

    textAlign: 'center',

    marginTop: 7,
  },

  successInfoBox: {
    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: '#effaf3',

    borderRadius: 9,

    paddingHorizontal: 10,

    paddingVertical: 7,

    marginTop: 13,
  },

  successInfoDot: {
    width: 6,

    height: 6,

    borderRadius: 3,

    backgroundColor: '#24a05b',

    marginRight: 6,
  },

  successInfoText: {
    color: '#297649',

    fontSize: 9,

    fontWeight: '700',
  },

  successButton: {
    width: '100%',

    minHeight: 52,

    backgroundColor: '#a9090d',

    borderRadius: 11,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    marginTop: 19,
  },

  successButtonText: {
    color: '#ffffff',

    fontSize: 11.5,

    fontWeight: '900',
  },

  successButtonArrow: {
    color: '#ffffff',

    fontSize: 24,

    marginLeft: 7,
  },
});
