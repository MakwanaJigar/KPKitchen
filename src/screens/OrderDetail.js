import React, { useMemo, useState } from 'react';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ActivityIndicator,
  Alert,
  Image,
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

import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

const fallbackOrder = {
  id: 1,
  orderNumber: '#1024',
  customerName: 'John Doe',
  mobile: '+91 98765 43210',
  address: '123 Street, Area Name, 380015',
  amount: '₹540',
  paymentStatus: 'COD',
  time: '12:45 PM',
  estimatedArrival: '15–20 mins',
  distance: '740 m',
  status: 'Out for Delivery',
  deliveryProof: null,
  deliveredAt: null,

  items: [
    {
      id: 1,
      name: 'Premium Vegetarian Tiffin',
      description: 'Paneer curry, dal, rice and rotis',
      quantity: 1,
      price: '₹280',
      emoji: '🍱',
    },
    {
      id: 2,
      name: 'Masala Buttermilk',
      description: 'Freshly prepared chilled buttermilk',
      quantity: 2,
      price: '₹80',
      emoji: '🥤',
    },
    {
      id: 3,
      name: 'Gulab Jamun',
      description: 'Sweet dessert portion',
      quantity: 1,
      price: '₹100',
      emoji: '🍮',
    },
  ],
};

const deliverySteps = [
  {
    id: 0,
    title: 'Confirmed',
    icon: '✓',
  },
  {
    id: 1,
    title: 'Preparing',
    icon: '✓',
  },
  {
    id: 2,
    title: 'On the way',
    icon: '⌖',
  },
  {
    id: 3,
    title: 'Delivered',
    icon: '⌂',
  },
];

const getStatusStep = status => {
  const normalizedStatus = String(status || '').toLowerCase();

  if (normalizedStatus === 'delivered') {
    return 3;
  }

  if (
    normalizedStatus === 'out for delivery' ||
    normalizedStatus === 'on the way'
  ) {
    return 2;
  }

  if (normalizedStatus === 'ready' || normalizedStatus === 'preparing') {
    return 1;
  }

  return 0;
};

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

  if (!image.uri) {
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

const OrderDetailsScreen = ({ navigation, route }) => {
  const { width, height } = useWindowDimensions();

  const receivedOrder = route.params?.order || fallbackOrder;

  const [order, setOrder] = useState(receivedOrder);

  const [selectedImage, setSelectedImage] = useState(
    normalizeImage(receivedOrder.deliveryProof),
  );

  const [imagePickerVisible, setImagePickerVisible] = useState(false);

  const [successVisible, setSuccessVisible] = useState(false);

  const [uploading, setUploading] = useState(false);

  const isSmallScreen = width <= 360;
  const isTablet = width >= 700;

  const pageWidth = isTablet ? Math.min(width, 760) : width;

  const horizontalPadding = isSmallScreen ? 13 : isTablet ? 24 : 17;

  const mapHeight = isTablet
    ? 285
    : Math.max(205, Math.min(245, height * 0.29));

  const currentStep = useMemo(
    () => getStatusStep(order.status),
    [order.status],
  );

  const isDelivered = order.status === 'Delivered';

  const orderItems =
    Array.isArray(order.items) && order.items.length > 0
      ? order.items
      : fallbackOrder.items;

  /*
  |--------------------------------------------------------------------------
  | Image Picker Response
  |--------------------------------------------------------------------------
  */

  const handleImagePickerResponse = response => {
    if (response.didCancel) {
      return;
    }

    if (response.errorCode) {
      Alert.alert(
        'Image Selection Failed',
        response.errorMessage || 'Unable to select the image.',
      );

      return;
    }

    const asset = response.assets?.[0];

    if (!asset?.uri) {
      Alert.alert('Invalid Image', 'The selected image could not be loaded.');

      return;
    }

    setSelectedImage(normalizeImage(asset));
  };

  /*
  |--------------------------------------------------------------------------
  | Camera Permission
  |--------------------------------------------------------------------------
  */

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const permission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'Camera access is required to capture delivery proof.',
          buttonPositive: 'Allow',
          buttonNegative: 'Cancel',
        },
      );

      return permission === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.log('Camera permission error:', error);

      return false;
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Open Camera
  |--------------------------------------------------------------------------
  */

  const handleOpenCamera = async () => {
    setImagePickerVisible(false);

    const permissionGranted = await requestCameraPermission();

    if (!permissionGranted) {
      Alert.alert(
        'Permission Required',
        'Please allow camera permission to capture delivery proof.',
      );

      return;
    }

    /*
     * Wait for the modal to completely close before
     * opening Android's native camera.
     */
    setTimeout(async () => {
      try {
        const response = await launchCamera({
          mediaType: 'photo',
          cameraType: 'back',
          quality: 0.8,
          maxWidth: 1600,
          maxHeight: 1600,
          saveToPhotos: false,
          includeBase64: false,
        });

        handleImagePickerResponse(response);
      } catch (error) {
        Alert.alert(
          'Camera Error',
          error?.message || 'Unable to open the camera.',
        );
      }
    }, 350);
  };

  /*
  |--------------------------------------------------------------------------
  | Open Gallery
  |--------------------------------------------------------------------------
  */

  const handleOpenGallery = () => {
    setImagePickerVisible(false);

    setTimeout(async () => {
      try {
        const response = await launchImageLibrary({
          mediaType: 'photo',
          quality: 0.8,
          maxWidth: 1600,
          maxHeight: 1600,
          selectionLimit: 1,
          includeBase64: false,
        });

        handleImagePickerResponse(response);
      } catch (error) {
        Alert.alert(
          'Gallery Error',
          error?.message || 'Unable to open the gallery.',
        );
      }
    }, 350);
  };

  /*
  |--------------------------------------------------------------------------
  | Remove Selected Image
  |--------------------------------------------------------------------------
  */

  const handleRemoveImage = () => {
    Alert.alert(
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

  /*
  |--------------------------------------------------------------------------
  | Mark Delivered
  |--------------------------------------------------------------------------
  */

  const handleMarkDelivered = async () => {
    if (!selectedImage?.uri) {
      Alert.alert(
        'Photo Required',
        'Please upload a delivery photo before marking this order as delivered.',
      );

      return;
    }

    if (uploading || isDelivered) {
      return;
    }

    setUploading(true);

    try {
      /*
        |--------------------------------------------------------------------------
        | Replace this delay with your Laravel API
        |--------------------------------------------------------------------------
        |
        | const formData = new FormData();
        |
        | formData.append('status', 'delivered');
        |
        | formData.append('delivery_image', {
        |   uri: selectedImage.uri,
        |   type: selectedImage.type,
        |   name: selectedImage.fileName,
        | });
        |
        | await fetch(
        |   `${API_URL}/driver/orders/${order.id}/deliver`,
        |   {
        |     method: 'POST',
        |     headers: {
        |       Accept: 'application/json',
        |       Authorization: `Bearer ${token}`,
        |     },
        |     body: formData,
        |   },
        | );
        |
        */

      await new Promise(resolve => {
        setTimeout(resolve, 900);
      });

      const updatedOrder = {
        ...order,
        status: 'Delivered',

        deliveryProof: {
          ...selectedImage,
        },

        deliveredAt: new Date().toISOString(),
      };

      setOrder(updatedOrder);
      setSuccessVisible(true);
    } catch (error) {
      Alert.alert(
        'Upload Failed',
        error?.message || 'Unable to upload the delivery photo.',
      );
    } finally {
      setUploading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Return to Orders
  |--------------------------------------------------------------------------
  */

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSuccessClose = () => {
    setSuccessVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

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
          contentContainerStyle={styles.scrollContent}
        >
          {/* Delivery Tracker */}

          <View
            style={[
              styles.contentSection,
              {
                paddingHorizontal: horizontalPadding,
              },
            ]}
          >
            {/* Order Summary Header */}

            <View style={styles.summaryHeader}>
              <View>
                <Text
                  style={[
                    styles.summaryTitle,
                    {
                      fontSize: isSmallScreen ? 22 : 26,
                    },
                  ]}
                >
                  Order Summary
                </Text>

                <Text style={styles.summarySubtitle}>
                  {orderItems.length}{' '}
                  {orderItems.length === 1 ? 'item' : 'items'} in this order
                </Text>
              </View>

              {!isDelivered ? (
                <Pressable
                  onPress={() => setImagePickerVisible(true)}
                  style={({ pressed }) => [
                    styles.uploadPhotoButton,
                    pressed && styles.uploadPhotoButtonPressed,
                  ]}
                >
                  <Text style={styles.uploadPhotoIcon}>▣</Text>

                  <Text style={styles.uploadPhotoText}>
                    {selectedImage ? 'Change Photo' : 'Upload Photo'}
                  </Text>
                </Pressable>
              ) : (
                <View style={styles.uploadedBadge}>
                  <Text style={styles.uploadedBadgeText}>✓ Uploaded</Text>
                </View>
              )}
            </View>

            {/* Order Items */}

            <View style={styles.orderItemsCard}>
              {orderItems.map((item, index) => (
                <View key={item.id || String(index)}>
                  <View style={styles.orderItem}>
                    {item.image ? (
                      <Image
                        source={{
                          uri: item.image,
                        }}
                        resizeMode="cover"
                        style={styles.itemImage}
                      />
                    ) : (
                      <View style={styles.itemPlaceholder}>
                        <Text style={styles.itemEmoji}>
                          {item.emoji || '🍱'}
                        </Text>
                      </View>
                    )}

                    <View style={styles.itemInformation}>
                      <View style={styles.itemHeader}>
                        <Text numberOfLines={2} style={styles.itemName}>
                          {item.name}
                        </Text>

                        <Text style={styles.itemPrice}>{item.price}</Text>
                      </View>

                      <Text numberOfLines={2} style={styles.itemDescription}>
                        {item.description}
                      </Text>

                      <View style={styles.quantityBadge}>
                        <Text style={styles.quantityText}>
                          Qty: {item.quantity || 1}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {index < orderItems.length - 1 ? (
                    <View style={styles.itemDivider} />
                  ) : null}
                </View>
              ))}

              <View style={styles.totalDivider} />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>

                <Text style={styles.totalAmount}>{order.amount}</Text>
              </View>

              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Payment</Text>

                <View style={styles.paymentBadge}>
                  <Text style={styles.paymentBadgeText}>
                    {order.paymentStatus}
                  </Text>
                </View>
              </View>
            </View>

            {/* Customer Information */}

            <View style={styles.customerCard}>
              <Text style={styles.cardSectionTitle}>Delivery Information</Text>

              <View style={styles.customerRow}>
                <View style={styles.customerAvatar}>
                  <Text style={styles.customerAvatarText}>
                    {order.customerName?.charAt(0)?.toUpperCase() || 'C'}
                  </Text>
                </View>

                <View style={styles.customerInformation}>
                  <Text style={styles.customerName}>{order.customerName}</Text>

                  <Text style={styles.customerMobile}>{order.mobile}</Text>

                  <Text style={styles.customerAddress}>{order.address}</Text>
                </View>
              </View>
            </View>

            {/* Delivery Proof Preview */}

            {selectedImage?.uri ? (
              <View style={styles.proofCard}>
                <View style={styles.proofHeader}>
                  <View>
                    <Text style={styles.cardSectionTitle}>Delivery Proof</Text>

                    <Text style={styles.proofSubtitle}>
                      Photo selected for this delivery
                    </Text>
                  </View>

                  {!isDelivered ? (
                    <Pressable
                      onPress={handleRemoveImage}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.removePhotoButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.removePhotoText}>Remove</Text>
                    </Pressable>
                  ) : null}
                </View>

                <Image
                  source={{
                    uri: selectedImage.uri,
                  }}
                  resizeMode="cover"
                  style={[
                    styles.proofImage,
                    {
                      height: isTablet ? 340 : width * 0.58,
                    },
                  ]}
                />

                {isDelivered ? (
                  <View style={styles.deliverySuccessStrip}>
                    <View style={styles.deliverySuccessIcon}>
                      <Text style={styles.deliverySuccessIconText}>✓</Text>
                    </View>

                    <View style={styles.deliverySuccessContent}>
                      <Text style={styles.deliverySuccessTitle}>
                        Delivered Successfully
                      </Text>

                      <Text style={styles.deliverySuccessMessage}>
                        Delivery proof has been saved.
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : (
              <Pressable
                onPress={() => setImagePickerVisible(true)}
                style={({ pressed }) => [
                  styles.emptyProofCard,
                  pressed && styles.emptyProofCardPressed,
                ]}
              >
                <View style={styles.emptyProofIcon}>
                  <Text style={styles.emptyProofIconText}>＋</Text>
                </View>

                <Text style={styles.emptyProofTitle}>
                  Upload delivery proof
                </Text>

                <Text style={styles.emptyProofDescription}>
                  Capture or select a clear photo of the delivered order.
                </Text>
              </Pressable>
            )}

            {/* Mark Delivered Button */}

            {!isDelivered ? (
              <Pressable
                onPress={handleMarkDelivered}
                disabled={uploading || !selectedImage?.uri}
                style={({ pressed }) => [
                  styles.markDeliveredButton,

                  (!selectedImage?.uri || uploading) &&
                    styles.markDeliveredButtonDisabled,

                  pressed &&
                    selectedImage?.uri &&
                    !uploading &&
                    styles.markDeliveredButtonPressed,
                ]}
              >
                {uploading ? (
                  <>
                    <ActivityIndicator size="small" color="#ffffff" />

                    <Text style={styles.markDeliveredText}>
                      Uploading Photo...
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.markDeliveredIcon}>✓</Text>

                    <Text style={styles.markDeliveredText}>
                      Mark as Delivered
                    </Text>
                  </>
                )}
              </Pressable>
            ) : (
              <Pressable
                onPress={handleBack}
                style={({ pressed }) => [
                  styles.backToOrdersButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.backToOrdersText}>Back to Orders</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Image Source Modal */}

      <Modal
        visible={imagePickerVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setImagePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setImagePickerVisible(false)}
          />

          <View
            style={[
              styles.imagePickerCard,
              {
                maxWidth: isTablet ? 520 : undefined,
              },
            ]}
          >
            <View style={styles.modalHandle} />

            <Text style={styles.imagePickerTitle}>Upload Delivery Photo</Text>

            <Text style={styles.imagePickerDescription}>
              Select how you would like to add the delivery proof.
            </Text>

            <Pressable
              onPress={handleOpenCamera}
              style={({ pressed }) => [
                styles.imagePickerOption,
                pressed && styles.imagePickerOptionPressed,
              ]}
            >
              <View style={styles.imagePickerOptionIcon}>
                <Text style={styles.imagePickerOptionIconText}>●</Text>
              </View>

              <View style={styles.imagePickerOptionContent}>
                <Text style={styles.imagePickerOptionTitle}>Take Photo</Text>

                <Text style={styles.imagePickerOptionSubtitle}>
                  Open your device camera
                </Text>
              </View>

              <Text style={styles.imagePickerArrow}>›</Text>
            </Pressable>

            <Pressable
              onPress={handleOpenGallery}
              style={({ pressed }) => [
                styles.imagePickerOption,
                pressed && styles.imagePickerOptionPressed,
              ]}
            >
              <View style={styles.imagePickerOptionIcon}>
                <Text style={styles.imagePickerOptionIconText}>▣</Text>
              </View>

              <View style={styles.imagePickerOptionContent}>
                <Text style={styles.imagePickerOptionTitle}>
                  Choose from Gallery
                </Text>

                <Text style={styles.imagePickerOptionSubtitle}>
                  Select an existing photo
                </Text>
              </View>

              <Text style={styles.imagePickerArrow}>›</Text>
            </Pressable>

            <Pressable
              onPress={() => setImagePickerVisible(false)}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Delivery Success Modal */}

      <Modal
        visible={successVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleSuccessClose}
      >
        <View style={styles.successOverlay}>
          <View
            style={[
              styles.successModal,
              {
                maxWidth: isTablet ? 430 : 380,
              },
            ]}
          >
            <View style={styles.successModalIcon}>
              <Text style={styles.successModalIconText}>✓</Text>
            </View>

            <Text style={styles.successModalTitle}>Delivery Successful!</Text>

            <Text style={styles.successModalMessage}>
              Order {order.orderNumber} has been marked as delivered
              successfully.
            </Text>

            <Pressable
              onPress={handleSuccessClose}
              style={({ pressed }) => [
                styles.successModalButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.successModalButtonText}>
                View Delivery Details
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setSuccessVisible(false);

                setTimeout(() => {
                  handleBack();
                }, 200);
              }}
              style={({ pressed }) => [
                styles.successBackButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.successBackButtonText}>Back to Orders</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default OrderDetailsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f8fb',
  },

  pageContainer: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#f7f8fb',
    // paddingTop:20,
  },

  scrollContent: {
    paddingBottom: 42,
    paddingTop:15,
  },

  pressed: {
    opacity: 0.65,
  },

  /*
  |--------------------------------------------------------------------------
  | Map
  |--------------------------------------------------------------------------
  */

  mapContainer: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#edf0ea',
    marginBottom: 70,
  },

  mapBackground: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#edf0ea',
  },

  mapBuilding: {
    position: 'absolute',
    backgroundColor: '#e1e4df',
    borderWidth: 1,
    borderColor: '#d4d8d2',
    borderRadius: 3,
  },

  mapBuildingOne: {
    width: 78,
    height: 38,
    top: 52,
    left: 18,
    transform: [{ rotate: '-13deg' }],
  },

  mapBuildingTwo: {
    width: 70,
    height: 46,
    top: 22,
    right: 22,
    transform: [{ rotate: '9deg' }],
  },

  mapBuildingThree: {
    width: 92,
    height: 46,
    bottom: 37,
    left: -12,
    transform: [{ rotate: '11deg' }],
  },

  mapBuildingFour: {
    width: 83,
    height: 40,
    bottom: 50,
    right: 16,
    transform: [{ rotate: '-7deg' }],
  },

  mapPark: {
    position: 'absolute',
    backgroundColor: '#cfe6c4',
    borderRadius: 7,
  },

  mapParkOne: {
    width: 82,
    height: 58,
    top: 76,
    left: 85,
    transform: [{ rotate: '-10deg' }],
  },

  mapParkTwo: {
    width: 98,
    height: 48,
    bottom: 16,
    right: 76,
    transform: [{ rotate: '8deg' }],
  },

  road: {
    position: 'absolute',
    height: 15,
    width: '140%',
    left: '-20%',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e1e3df',
  },

  roadOne: {
    top: 48,
    transform: [{ rotate: '-17deg' }],
  },

  roadTwo: {
    top: 122,
    transform: [{ rotate: '12deg' }],
  },

  roadThree: {
    bottom: 29,
    transform: [{ rotate: '-8deg' }],
  },

  roadFour: {
    width: 15,
    height: '160%',
    top: '-30%',
    left: '60%',
    transform: [{ rotate: '18deg' }],
  },

  routeLine: {
    position: 'absolute',
    height: 5,
    borderRadius: 3,
    backgroundColor: '#4657d7',
  },

  routeLineOne: {
    width: 88,
    top: 116,
    left: '31%',
    transform: [{ rotate: '-24deg' }],
  },

  routeLineTwo: {
    width: 71,
    top: 89,
    left: '47%',
    transform: [{ rotate: '12deg' }],
  },

  routeLineThree: {
    width: 54,
    top: 94,
    left: '63%',
    transform: [{ rotate: '-10deg' }],
  },

  driverMarker: {
    position: 'absolute',
    top: 102,
    left: '41%',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    elevation: 5,
  },

  driverMarkerText: {
    fontSize: 24,
  },

  destinationMarker: {
    position: 'absolute',
    top: 53,
    right: '15%',
    alignItems: 'center',
  },

  destinationDot: {
    width: 17,
    height: 17,
    borderWidth: 5,
    borderColor: '#4657d7',
    borderRadius: 9,
    backgroundColor: '#ffffff',
  },

  destinationDistance: {
    color: '#444b58',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },

  arrivingLabel: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    elevation: 3,
  },

  arrivingLabelTitle: {
    color: '#252a33',
    fontSize: 10,
    fontWeight: '800',
  },

  arrivingLabelSubtitle: {
    color: '#8b919b',
    fontSize: 8,
    marginTop: 2,
  },

  mapHeader: {
    position: 'absolute',
    top: 8,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  mapBackButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.95)',
    elevation: 4,
  },

  mapBackIcon: {
    color: '#252a33',
    fontSize: 34,
    lineHeight: 35,
  },

  mapHeaderTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },

  mapHeaderTitle: {
    color: '#252a33',
    fontSize: 15,
    fontWeight: '800',
  },

  mapHeaderSubtitle: {
    color: '#707783',
    fontSize: 9,
    marginTop: 1,
  },

  mapHeaderSpace: {
    width: 38,
  },

  arrivalCard: {
    position: 'absolute',
    bottom: -55,
    minHeight: 112,
    backgroundColor: '#ffffff',
    borderRadius: 17,
    padding: 15,
    elevation: 9,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.12,
    shadowRadius: 15,
  },

  arrivalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  arrivalLabel: {
    color: '#8b929d',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  estimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  clockText: {
    color: '#bd8a45',
    fontSize: 14,
    marginRight: 5,
  },

  estimateText: {
    color: '#bd8a45',
    fontSize: 11,
    fontWeight: '800',
  },

  driverInformation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },

  driverIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#4d55d5',
    marginRight: 12,
  },

  driverIconText: {
    fontSize: 22,
  },

  driverTextContainer: {
    flex: 1,
  },

  driverTitle: {
    color: '#2b3039',
    fontSize: 13,
    fontWeight: '800',
  },

  driverSubtitle: {
    color: '#8b919a',
    fontSize: 10.5,
    marginTop: 4,
  },

  /*
  |--------------------------------------------------------------------------
  | General Content
  |--------------------------------------------------------------------------
  */

  contentSection: {
    width: '100%',
  },

  progressCard: {
    minHeight: 101,
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 15,
    paddingHorizontal: 13,
    paddingVertical: 17,
    marginBottom: 27,
    elevation: 2,
  },

  progressTrackContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  progressStep: {
    width: 54,
    alignItems: 'center',
  },

  stepCircle: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#eceef1',
  },

  completedStepCircle: {
    backgroundColor: '#d10018',
  },

  currentStepCircle: {
    transform: [{ scale: 1.08 }],
  },

  stepIcon: {
    color: '#a2a7ae',
    fontSize: 12,
    fontWeight: '800',
  },

  completedStepIcon: {
    color: '#ffffff',
  },

  stepTitle: {
    color: '#9a9fa8',
    fontSize: 8.5,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 7,
  },

  completedStepTitle: {
    color: '#8c671e',
  },

  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#e4e6e9',
    marginTop: 14,
    marginHorizontal: -8,
  },

  completedStepLine: {
    backgroundColor: '#d10018',
  },

  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },

  summaryTitle: {
    color: '#242931',
    fontWeight: '900',
    letterSpacing: -0.7,
  },

  summarySubtitle: {
    color: '#959ba4',
    fontSize: 10,
    marginTop: 3,
  },

  uploadPhotoButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d10018',
    borderRadius: 20,
    paddingHorizontal: 13,
  },

  uploadPhotoButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },

  uploadPhotoIcon: {
    color: '#ffffff',
    fontSize: 14,
    marginRight: 6,
  },

  uploadPhotoText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },

  uploadedBadge: {
    backgroundColor: '#e1f7e9',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  uploadedBadgeText: {
    color: '#16824b',
    fontSize: 10,
    fontWeight: '800',
  },

  /*
  |--------------------------------------------------------------------------
  | Order Items
  |--------------------------------------------------------------------------
  */

  orderItemsCard: {
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 15,
    elevation: 2,
  },

  orderItem: {
    flexDirection: 'row',
    paddingVertical: 10,
  },

  itemImage: {
    width: 66,
    height: 66,
    borderRadius: 9,
    backgroundColor: '#eeeeee',
  },

  itemPlaceholder: {
    width: 66,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#ecebff',
  },

  itemEmoji: {
    fontSize: 27,
  },

  itemInformation: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 12,
  },

  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  itemName: {
    flex: 1,
    color: '#343941',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    paddingRight: 8,
  },

  itemPrice: {
    color: '#30353d',
    fontSize: 11,
    fontWeight: '800',
  },

  itemDescription: {
    color: '#8c929c',
    fontSize: 9.5,
    lineHeight: 14,
    marginTop: 3,
  },

  quantityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f1f3',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginTop: 7,
  },

  quantityText: {
    color: '#737985',
    fontSize: 8,
    fontWeight: '700',
  },

  itemDivider: {
    height: 1,
    backgroundColor: '#eff0f2',
  },

  totalDivider: {
    height: 1,
    backgroundColor: '#e9eaed',
    marginTop: 7,
    marginBottom: 12,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  totalLabel: {
    color: '#373c44',
    fontSize: 12,
    fontWeight: '800',
  },

  totalAmount: {
    color: '#d00018',
    fontSize: 16,
    fontWeight: '900',
  },

  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  paymentLabel: {
    color: '#888f99',
    fontSize: 10,
  },

  paymentBadge: {
    backgroundColor: '#edf0ff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  paymentBadgeText: {
    color: '#5967a5',
    fontSize: 8,
    fontWeight: '800',
  },

  /*
  |--------------------------------------------------------------------------
  | Customer
  |--------------------------------------------------------------------------
  */

  customerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },

  cardSectionTitle: {
    color: '#2d323a',
    fontSize: 14,
    fontWeight: '800',
  },

  customerRow: {
    flexDirection: 'row',
    marginTop: 14,
  },

  customerAvatar: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: '#d10018',
    marginRight: 12,
  },

  customerAvatarText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
  },

  customerInformation: {
    flex: 1,
  },

  customerName: {
    color: '#2d323a',
    fontSize: 13,
    fontWeight: '800',
  },

  customerMobile: {
    color: '#707784',
    fontSize: 10.5,
    marginTop: 4,
  },

  customerAddress: {
    color: '#858c96',
    fontSize: 10.5,
    lineHeight: 16,
    marginTop: 5,
  },

  /*
  |--------------------------------------------------------------------------
  | Delivery Proof
  |--------------------------------------------------------------------------
  */

  proofCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    elevation: 2,
  },

  proofHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  proofSubtitle: {
    color: '#9298a1',
    fontSize: 9,
    marginTop: 3,
  },

  removePhotoButton: {
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  removePhotoText: {
    color: '#d00018',
    fontSize: 10,
    fontWeight: '800',
  },

  proofImage: {
    width: '100%',
    maxHeight: 360,
    borderRadius: 11,
    backgroundColor: '#eeeeee',
  },

  deliverySuccessStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f8ee',
    borderRadius: 10,
    padding: 11,
    marginTop: 12,
  },

  deliverySuccessIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#16824b',
    marginRight: 10,
  },

  deliverySuccessIconText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },

  deliverySuccessContent: {
    flex: 1,
  },

  deliverySuccessTitle: {
    color: '#167347',
    fontSize: 11,
    fontWeight: '800',
  },

  deliverySuccessMessage: {
    color: '#5d806d',
    fontSize: 9,
    marginTop: 3,
  },

  emptyProofCard: {
    minHeight: 145,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#d10018',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
  },

  emptyProofCardPressed: {
    backgroundColor: '#fff9ef',
  },

  emptyProofIcon: {
    width: 43,
    height: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#d10018',
  },

  emptyProofIconText: {
    color: '#fff',
    fontSize: 23,
  },

  emptyProofTitle: {
    color: '#343941',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
  },

  emptyProofDescription: {
    maxWidth: 250,
    color: '#9298a1',
    fontSize: 9.5,
    lineHeight: 14,
    textAlign: 'center',
    marginTop: 5,
  },

  /*
  |--------------------------------------------------------------------------
  | Main Buttons
  |--------------------------------------------------------------------------
  */

  markDeliveredButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d10018',
    borderRadius: 14,
  },

  markDeliveredButtonDisabled: {
    backgroundColor: '#d10018',
  },

  markDeliveredButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },

  markDeliveredIcon: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '900',
    marginRight: 9,
  },

  markDeliveredText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 8,
  },

  backToOrdersButton: {
    minHeight: 55,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16824b',
    borderRadius: 14,
  },

  backToOrdersText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },

  /*
  |--------------------------------------------------------------------------
  | Image Picker Modal
  |--------------------------------------------------------------------------
  */

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(17,24,39,0.62)',
  },

  imagePickerCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
    paddingHorizontal: 20,
    paddingTop: 11,
    paddingBottom: 28,
  },

  modalHandle: {
    width: 42,
    height: 4,
    alignSelf: 'center',
    borderRadius: 2,
    backgroundColor: '#d4d7db',
    marginBottom: 20,
  },

  imagePickerTitle: {
    color: '#252a32',
    fontSize: 19,
    fontWeight: '900',
  },

  imagePickerDescription: {
    color: '#898f99',
    fontSize: 11,
    marginTop: 5,
    marginBottom: 18,
  },

  imagePickerOption: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ebedf0',
    borderRadius: 14,
    paddingHorizontal: 13,
    marginBottom: 11,
  },

  imagePickerOptionPressed: {
    backgroundColor: '#f7f8fa',
  },

  imagePickerOptionIcon: {
    width: 43,
    height: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#fff0d8',
    marginRight: 12,
  },

  imagePickerOptionIconText: {
    color: '#f28a00',
    fontSize: 18,
    fontWeight: '800',
  },

  imagePickerOptionContent: {
    flex: 1,
  },

  imagePickerOptionTitle: {
    color: '#30353e',
    fontSize: 13,
    fontWeight: '800',
  },

  imagePickerOptionSubtitle: {
    color: '#949aa3',
    fontSize: 9.5,
    marginTop: 3,
  },

  imagePickerArrow: {
    color: '#9ea4ac',
    fontSize: 27,
  },

  cancelButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },

  cancelButtonText: {
    color: '#656c77',
    fontSize: 12,
    fontWeight: '700',
  },

  /*
  |--------------------------------------------------------------------------
  | Success Modal
  |--------------------------------------------------------------------------
  */

  successOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,24,39,0.68)',
    paddingHorizontal: 22,
  },

  successModal: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 25,
    padding: 24,
    elevation: 20,
  },

  successModalIcon: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 38,
    backgroundColor: '#e6f8ed',
  },

  successModalIconText: {
    color: '#16824b',
    fontSize: 38,
    fontWeight: '900',
  },

  successModalTitle: {
    color: '#252a32',
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 18,
  },

  successModalMessage: {
    color: '#7f8690',
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 23,
  },

  successModalButton: {
    width: '100%',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d10018',
    borderRadius: 13,
  },

  successModalButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },

  successBackButton: {
    minHeight: 45,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 7,
  },

  successBackButtonText: {
    color: '#68707b',
    fontSize: 11,
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
