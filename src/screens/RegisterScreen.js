import React, { useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import AppAlert from '../components/AppAlert';

import { SafeAreaView } from 'react-native-safe-area-context';

import { launchImageLibrary } from 'react-native-image-picker';

/* =========================================================
 * API
 * ========================================================= */

const REGISTER_API_URL =
  'https://replete-software.com/projects/kp_admin/api/driver/register';

const SUCCESS_POPUP_DURATION = 3500;

const VEHICLE_TYPES = ['Car', 'Motorbike', 'Scooter', 'Bicycle', 'Van'];

/* =========================================================
 * REQUIRED LABEL
 * ========================================================= */

const RequiredLabel = ({ label }) => (
  <Text style={styles.inputLabel}>
    {label} <Text style={styles.requiredStar}>*</Text>
  </Text>
);

/* =========================================================
 * NORMAL INPUT
 * ========================================================= */

const FormInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  keyboardType = 'default',
  autoCapitalize = 'none',
  maxLength,
  multiline = false,
  editable = true,
}) => {
  return (
    <View style={styles.inputGroup}>
      <RequiredLabel label={label} />

      <View
        style={[styles.inputContainer, multiline && styles.multilineContainer]}
      >
        <View pointerEvents="none" style={styles.inputIconContainer}>
          <Image source={icon} style={styles.inputImage} />
        </View>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          maxLength={maxLength}
          multiline={multiline}
          editable={editable}
          style={[styles.textInput, multiline && styles.multilineInput]}
        />
      </View>
    </View>
  );
};

/* =========================================================
 * IMAGE FIELD
 * ========================================================= */

const ImageUploadField = ({
  label,
  description,
  imageUri,
  onPress,
  disabled = false,
  circular = false,
}) => {
  return (
    <View style={styles.uploadGroup}>
      <RequiredLabel label={label} />

      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.uploadContainer,

          pressed && !disabled && styles.uploadPressed,

          disabled && styles.uploadDisabled,
        ]}
      >
        <View
          style={[
            styles.uploadPreviewContainer,

            circular && styles.uploadPreviewCircular,
          ]}
        >
          {imageUri ? (
            <Image
              source={{
                uri: imageUri,
              }}
              resizeMode="cover"
              style={[
                styles.uploadPreview,

                circular && styles.uploadPreviewCircular,
              ]}
            />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Text style={styles.uploadPlus}>+</Text>
            </View>
          )}
        </View>

        <View style={styles.uploadTextArea}>
          <Text style={styles.uploadTitle}>
            {imageUri ? 'Image Selected' : 'Choose Image'}
          </Text>

          <Text style={styles.uploadDescription}>{description}</Text>

          {imageUri && <Text style={styles.changeImage}>Tap to change</Text>}
        </View>

        <Text style={styles.uploadArrow}>›</Text>
      </Pressable>
    </View>
  );
};

/* =========================================================
 * REGISTER
 * ========================================================= */

const RegisterScreen = ({ navigation }) => {
  const { width, height } = useWindowDimensions();

  /* =======================================================
   * PERSONAL
   * ======================================================= */

  const [name, setName] = useState('');

  const [phone, setPhone] = useState('');

  const [email, setEmail] = useState('');

  /* =======================================================
   * ADDRESS
   * ======================================================= */

  const [streetAddress, setStreetAddress] = useState('');

  const [city, setCity] = useState('');

  const [assignedZip, setAssignedZip] = useState('');

  /* =======================================================
   * VEHICLE
   * ======================================================= */

  const [vehicleNumber, setVehicleNumber] = useState('');

  const [vehicleType, setVehicleType] = useState('');

  const [vehicleRegistrationImage, setVehicleRegistrationImage] =
    useState(null);

  /* =======================================================
   * LICENCE
   * ======================================================= */

  const [licenseFront, setLicenseFront] = useState(null);

  const [licenseBack, setLicenseBack] = useState(null);

  /* =======================================================
   * PASSWORD
   * ======================================================= */

  const [password, setPassword] = useState('');

  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /* =======================================================
   * UI
   * ======================================================= */

  const [loading, setLoading] = useState(false);

  const [successVisible, setSuccessVisible] = useState(false);

  const [successMessage, setSuccessMessage] = useState('');

  const progress = useRef(new Animated.Value(0)).current;

  const timerRef = useRef(null);

  /* =======================================================
   * RESPONSIVE
   * ======================================================= */

  const isSmallScreen = width <= 360;

  const isShortScreen = height <= 700;

  const horizontalPadding = isSmallScreen ? 18 : 24;

  const cardWidth = Math.min(width - horizontalPadding * 2, 460);

  /* =======================================================
   * CLEANUP
   * ======================================================= */

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      progress.stopAnimation();
    };
  }, [progress]);

  /* =======================================================
   * EMAIL
   * ======================================================= */

  const validateEmail = value =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  /* =======================================================
   * IMAGE
   * ======================================================= */

  const chooseImage = async type => {
    if (loading || successVisible) {
      return;
    }

    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',

        includeBase64: false,

        quality: 0.7,

        maxWidth: 1400,

        maxHeight: 1400,

        selectionLimit: 1,
      });

      if (result?.didCancel) {
        return;
      }

      if (result?.errorCode) {
        AppAlert.alert(
          'Image Error',
          result?.errorMessage || 'Unable to select image.',
        );

        return;
      }

      const asset = result?.assets?.[0];

      if (!asset?.uri) {
        AppAlert.alert('Image Error', 'The selected image could not be loaded.');

        return;
      }

      const mimeType = asset?.type || 'image/jpeg';

      const extension = mimeType.split('/')[1] || 'jpg';

      const imageData = {
        uri: asset.uri,

        type: mimeType,

        fileName: asset?.fileName || `${type}-${Date.now()}.${extension}`,
      };

      if (type === 'vehicle') {
        setVehicleRegistrationImage(imageData);
      }

      if (type === 'front') {
        setLicenseFront(imageData);
      }

      if (type === 'back') {
        setLicenseBack(imageData);
      }
    } catch (error) {
      console.log('IMAGE PICKER ERROR:', error);

      AppAlert.alert('Image Error', error?.message || 'Unable to select image.');
    }
  };

  /* =======================================================
   * API ERROR
   * ======================================================= */

  const getRegistrationError = error => {
    if (!error?.response) {
      if (error?.code === 'ECONNABORTED') {
        return 'The registration request timed out. Please try again.';
      }

      return error?.message || 'Unable to connect to the registration server.';
    }

    const data = error.response.data;

    if (data?.errors && typeof data.errors === 'object') {
      const messages = Object.values(data.errors).flat().filter(Boolean);

      if (messages.length > 0) {
        return messages.join('\n');
      }
    }

    return (
      data?.message || data?.error || 'Unable to register your driver account.'
    );
  };

  /* =======================================================
   * SUCCESS
   * ======================================================= */

  const showSuccess = (registeredEmail, message) => {
    setSuccessMessage(message);

    setSuccessVisible(true);

    progress.setValue(0);

    Animated.timing(progress, {
      toValue: 1,

      duration: SUCCESS_POPUP_DURATION,

      easing: Easing.linear,

      useNativeDriver: false,
    }).start();

    timerRef.current = setTimeout(
      () => {
        setSuccessVisible(false);

        navigation.reset({
          index: 0,

          routes: [
            {
              name: 'Login',

              params: {
                registeredEmail,

                registrationMessage: message,
              },
            },
          ],
        });
      },

      SUCCESS_POPUP_DURATION,
    );
  };

  /* =======================================================
   * REGISTER
   * ======================================================= */

  const handleRegister = async () => {
    if (loading || successVisible) {
      return;
    }

    const cleanName = name.trim().replace(/\s+/g, ' ');

    const cleanPhone = phone.trim().replace(/\s+/g, ' ');

    const phoneDigits = cleanPhone.replace(/[^0-9]/g, '');

    const cleanEmail = email.trim().toLowerCase();

    const cleanStreetAddress = streetAddress.trim();

    const cleanCity = city.trim();

    const cleanVehicleNumber = vehicleNumber.trim().toUpperCase();

    const cleanAssignedZip = assignedZip
      .split(',')
      .map(zip => zip.trim())
      .filter(Boolean)
      .join(', ');

    /* =================================================
     * VALIDATION
     * ================================================= */

    if (!cleanName) {
      AppAlert.alert('Full Name Required', 'Please enter your full name.');

      return;
    }

    if (!cleanEmail) {
      AppAlert.alert('Email Required', 'Please enter your email address.');

      return;
    }

    if (!validateEmail(cleanEmail)) {
      AppAlert.alert('Invalid Email', 'Please enter a valid email address.');

      return;
    }

    if (!phoneDigits) {
      AppAlert.alert('Phone Required', 'Please enter your phone number.');

      return;
    }

    if (phoneDigits.length < 9) {
      AppAlert.alert('Invalid Phone', 'Please enter a valid phone number.');

      return;
    }

    if (!cleanStreetAddress) {
      AppAlert.alert(
        'Street Address Required',
        'Please enter your street address.',
      );

      return;
    }

    if (!cleanCity) {
      AppAlert.alert('City Required', 'Please enter your city or suburb.');

      return;
    }

    if (!cleanAssignedZip) {
      AppAlert.alert(
        'Postcode Required',
        'Please enter your assigned postcode.',
      );

      return;
    }

    if (!cleanVehicleNumber) {
      AppAlert.alert(
        'Vehicle Number Required',
        'Please enter your vehicle registration number.',
      );

      return;
    }

    if (!vehicleType) {
      AppAlert.alert(
        'Vehicle Type Required',
        'Please select your vehicle type.',
      );

      return;
    }

    if (!vehicleRegistrationImage?.uri) {
      AppAlert.alert(
        'Vehicle Registration Required',
        'Please upload your vehicle registration image.',
      );

      return;
    }

    if (!licenseFront?.uri) {
      AppAlert.alert(
        'Licence Front Required',
        'Please upload the front side of your driving licence.',
      );

      return;
    }

    if (!licenseBack?.uri) {
      AppAlert.alert(
        'Licence Back Required',
        'Please upload the back side of your driving licence.',
      );

      return;
    }

    if (!password) {
      AppAlert.alert('Password Required', 'Please enter a password.');

      return;
    }

    if (password.length < 8) {
      AppAlert.alert(
        'Password Too Short',
        'Password must contain at least 8 characters.',
      );

      return;
    }

    if (!passwordConfirmation) {
      AppAlert.alert('Confirm Password', 'Please confirm your password.');

      return;
    }

    if (password !== passwordConfirmation) {
      AppAlert.alert(
        'Password Mismatch',
        'Password and confirm password must match.',
      );

      return;
    }

    /* =================================================
     * REQUEST (multipart/form-data)
     *
     * Do not manually set multipart Content-Type.
     * React Native will add the multipart boundary.
     * ================================================= */

    const toFile = image => ({
      uri: image.uri,

      type: image.type || 'image/jpeg',

      name: image.fileName,
    });

    const formData = new FormData();

    formData.append('name', cleanName);

    formData.append('email', cleanEmail);

    formData.append('phone', cleanPhone);

    formData.append('password', password);

    formData.append('confirm_password', passwordConfirmation);

    formData.append('vehicle_number', cleanVehicleNumber);

    formData.append('vehicle_type', vehicleType);

    formData.append('street_address', cleanStreetAddress);

    formData.append('city', cleanCity);

    formData.append('assigned_zip', cleanAssignedZip);

    formData.append('driver_license_front', toFile(licenseFront));

    formData.append('driver_license_back', toFile(licenseBack));

    formData.append(
      'vehicle_registration_image',
      toFile(vehicleRegistrationImage),
    );

    try {
      setLoading(true);

      console.log('REGISTER API:', REGISTER_API_URL);

      console.log('REGISTER PAYLOAD:', {
        name: cleanName,

        email: cleanEmail,

        phone: cleanPhone,

        password: '[HIDDEN]',

        vehicle_number: cleanVehicleNumber,

        vehicle_type: vehicleType,

        street_address: cleanStreetAddress,

        city: cleanCity,

        assigned_zip: cleanAssignedZip,

        driver_license_front: '[IMAGE FILE]',

        driver_license_back: '[IMAGE FILE]',

        vehicle_registration_image: '[IMAGE FILE]',
      });

      const controller = new AbortController();

      const timeoutId = setTimeout(() => controller.abort(), 60000);

      let response;

      try {
        response = await fetch(REGISTER_API_URL, {
          method: 'POST',

          headers: {
            Accept: 'application/json',
          },

          body: formData,

          signal: controller.signal,
        });
      } catch (networkError) {
        if (networkError?.name === 'AbortError') {
          networkError.code = 'ECONNABORTED';
        }

        throw networkError;
      } finally {
        clearTimeout(timeoutId);
      }

      const responseText = await response.text();

      let responseData = null;

      try {
        responseData = responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        responseData = { message: responseText };
      }

      console.log('REGISTER RESPONSE:', response.status, responseData);

      if (!response.ok) {
        const requestError = new Error(
          responseData?.message ||
            `Request failed with status ${response.status}`,
        );

        requestError.response = {
          status: response.status,

          data: responseData,
        };

        throw requestError;
      }

      if (responseData?.success === false || responseData?.status === false) {
        AppAlert.alert(
          'Registration Failed',
          responseData?.message || 'Unable to register your account.',
        );

        return;
      }

      const message = responseData?.message
        ? `${responseData.message}\n\nYour registration is pending admin approval. You can login after the administrator approves your account.`
        : 'Your driver registration has been submitted successfully. Your account is pending admin approval. You can login after the administrator approves your account.';

      showSuccess(cleanEmail, message);
    } catch (error) {
      console.log('REGISTER ERROR STATUS:', error?.response?.status);

      console.log('REGISTER ERROR DATA:', error?.response?.data);

      console.log('REGISTER ERROR:', error?.message);

      AppAlert.alert('Registration Failed', getRegistrationError(error));
    } finally {
      setLoading(false);
    }
  };

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],

    outputRange: ['0%', '100%'],
  });

  /* =======================================================
   * UI
   * ======================================================= */

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fb" />

      {/* ==================================================
          KEYBOARD + SCROLL FIX
          ================================================== */}

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,

            {
              paddingHorizontal: horizontalPadding,

              paddingTop: isShortScreen ? 20 : 38,

              /*
               * Extra space so password,
               * confirm password and button
               * can scroll above keyboard.
               */
              paddingBottom: 120,
            },
          ]}
          showsVerticalScrollIndicator={false}
          /*
           * User can tap inputs/buttons
           * while keyboard is visible.
           */
          keyboardShouldPersistTaps="handled"
          /*
           * Scrolling does NOT automatically
           * close the keyboard.
           */
          keyboardDismissMode="none"
          /*
           * Keep scrolling active while
           * keyboard is open.
           */
          scrollEnabled={true}
          /*
           * Helpful for Android.
           */
          nestedScrollEnabled={true}
          bounces={false}
          overScrollMode="never"
        >
          <View style={styles.page}>
            {/* DECORATION */}

            <View
              pointerEvents="none"
              style={[
                styles.decorativeCircle,
                styles.topCircle,

                {
                  width: width * 0.58,

                  height: width * 0.58,

                  borderRadius: width * 0.29,
                },
              ]}
            />

            <View
              pointerEvents="none"
              style={[
                styles.decorativeCircle,
                styles.bottomCircle,

                {
                  width: width * 0.42,

                  height: width * 0.42,

                  borderRadius: width * 0.21,
                },
              ]}
            />

            {/* BRAND */}

            <View style={styles.brandSection}>
              <View
                style={[
                  styles.logoContainer,

                  {
                    width: isSmallScreen ? 74 : 86,

                    height: isSmallScreen ? 74 : 86,

                    borderRadius: isSmallScreen ? 23 : 27,
                  },
                ]}
              >
                <Image
                  source={require('../assets/delivery-bike-light.png')}
                  resizeMode="contain"
                  style={[
                    styles.logo,

                    {
                      width: isSmallScreen ? 40 : 48,

                      height: isSmallScreen ? 40 : 48,
                    },
                  ]}
                />
              </View>

              <Text
                style={[
                  styles.brandTitle,

                  {
                    fontSize: isSmallScreen ? 27 : 32,
                  },
                ]}
              >
                Create Account
              </Text>

              <Text style={styles.brandSubtitle}>
                Register as a delivery driver and wait for administrator
                approval.
              </Text>
            </View>

            {/* CARD */}

            <View
              style={[
                styles.registerCard,

                {
                  width: cardWidth,

                  padding: isSmallScreen ? 18 : 24,

                  borderRadius: isSmallScreen ? 24 : 28,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Driver Registration</Text>

                <Text style={styles.cardDescription}>
                  Complete all details below to submit your registration
                  request.
                </Text>
              </View>

              {/* PERSONAL */}

              <Text style={styles.sectionTitle}>Personal Details</Text>

              <FormInput
                label="Full Name"
                value={name}
                onChangeText={setName}
                placeholder="John Driver"
                icon={require('../assets/user-dark.png')}
                autoCapitalize="words"
                maxLength={100}
                editable={!loading}
              />

              <FormInput
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                placeholder="driver@example.com"
                icon={require('../assets/mail.png')}
                keyboardType="email-address"
                maxLength={120}
                editable={!loading}
              />

              <FormInput
                label="Mobile Number"
                value={phone}
                onChangeText={text => setPhone(text.replace(/[^0-9+\s]/g, ''))}
                placeholder="+61 411 987 654"
                icon={require('../assets/phone-call.png')}
                keyboardType="phone-pad"
                maxLength={20}
                editable={!loading}
              />

              {/* ADDRESS */}

              <Text style={styles.sectionTitle}>Address</Text>

              <FormInput
                label="Street Address"
                value={streetAddress}
                onChangeText={setStreetAddress}
                placeholder="Unit 12, 45 Flinders Lane"
                icon={require('../assets/home-dark.png')}
                autoCapitalize="words"
                maxLength={200}
                multiline
                editable={!loading}
              />

              <FormInput
                label="City / Suburb"
                value={city}
                onChangeText={setCity}
                placeholder="Richmond"
                icon={require('../assets/home-dark.png')}
                autoCapitalize="words"
                maxLength={80}
                editable={!loading}
              />

              <FormInput
                label="Assigned Postcode"
                value={assignedZip}
                onChangeText={text =>
                  setAssignedZip(text.replace(/[^a-zA-Z0-9,\s-]/g, ''))
                }
                placeholder="3121"
                icon={require('../assets/home-dark.png')}
                keyboardType="number-pad"
                maxLength={100}
                editable={!loading}
              />

              {/* VEHICLE */}

              <Text style={styles.sectionTitle}>Vehicle Details</Text>

              <FormInput
                label="Vehicle Number"
                value={vehicleNumber}
                onChangeText={text => setVehicleNumber(text.toUpperCase())}
                placeholder="VIC-8899"
                icon={require('../assets/delivery-bike-dark.png')}
                autoCapitalize="characters"
                maxLength={30}
                editable={!loading}
              />

              <View style={styles.inputGroup}>
                <RequiredLabel label="Vehicle Type" />

                <View style={styles.vehicleTypeRow}>
                  {VEHICLE_TYPES.map(type => {
                    const selected = vehicleType === type;

                    return (
                      <Pressable
                        key={type}
                        disabled={loading}
                        onPress={() => setVehicleType(type)}
                        style={({ pressed }) => [
                          styles.vehicleTypeChip,

                          selected && styles.vehicleTypeChipSelected,

                          pressed && !loading && styles.uploadPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.vehicleTypeText,

                            selected && styles.vehicleTypeTextSelected,
                          ]}
                        >
                          {type}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <ImageUploadField
                label="Vehicle Registration Image"
                description="Upload a clear photo of your vehicle registration"
                imageUri={vehicleRegistrationImage?.uri}
                disabled={loading}
                onPress={() => chooseImage('vehicle')}
              />

              {/* LICENCE */}

              <Text style={styles.sectionTitle}>Driving Licence</Text>

              <ImageUploadField
                label="Driver Licence - Front"
                description="Upload the front side of your driving licence"
                imageUri={licenseFront?.uri}
                disabled={loading}
                onPress={() => chooseImage('front')}
              />

              <ImageUploadField
                label="Driver Licence - Back"
                description="Upload the back side of your driving licence"
                imageUri={licenseBack?.uri}
                disabled={loading}
                onPress={() => chooseImage('back')}
              />

              {/* SECURITY */}

              <Text style={styles.sectionTitle}>Account Security</Text>

              {/* PASSWORD */}

              <View style={styles.inputGroup}>
                <RequiredLabel label="Password" />

                <View style={styles.inputContainer}>
                  <View pointerEvents="none" style={styles.inputIconContainer}>
                    <Image
                      source={require('../assets/padlock.png')}
                      style={styles.inputImage}
                    />
                  </View>

                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Create password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    returnKeyType="next"
                    style={styles.textInput}
                  />

                  <Pressable
                    disabled={loading}
                    onPress={() => setShowPassword(previous => !previous)}
                    style={styles.visibilityButton}
                  >
                    <Image
                      source={
                        showPassword
                          ? require('../assets/eye-open.png')
                          : require('../assets/eye-close.png')
                      }
                      style={styles.visibilityImage}
                    />
                  </Pressable>
                </View>
              </View>

              {/* CONFIRM PASSWORD */}

              <View style={styles.inputGroup}>
                <RequiredLabel label="Confirm Password" />

                <View style={styles.inputContainer}>
                  <View pointerEvents="none" style={styles.inputIconContainer}>
                    <Image
                      source={require('../assets/padlock.png')}
                      style={styles.inputImage}
                    />
                  </View>

                  <TextInput
                    value={passwordConfirmation}
                    onChangeText={setPasswordConfirmation}
                    placeholder="Confirm password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                    style={styles.textInput}
                  />

                  <Pressable
                    disabled={loading}
                    onPress={() =>
                      setShowConfirmPassword(previous => !previous)
                    }
                    style={styles.visibilityButton}
                  >
                    <Image
                      source={
                        showConfirmPassword
                          ? require('../assets/eye-open.png')
                          : require('../assets/eye-close.png')
                      }
                      style={styles.visibilityImage}
                    />
                  </Pressable>
                </View>
              </View>

              {/* BUTTON */}

              <Pressable
                onPress={handleRegister}
                disabled={loading}
                style={({ pressed }) => [
                  styles.registerButton,

                  loading && styles.buttonDisabled,

                  pressed && !loading && styles.buttonPressed,
                ]}
              >
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color="#ffffff" />

                    <Text
                      style={[
                        styles.registerButtonText,
                        {
                          marginLeft: 10,
                        },
                      ]}
                    >
                      Submitting...
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.registerButtonText}>
                      Submit Registration
                    </Text>

                    <Image
                      source={require('../assets/right-arrow.png')}
                      style={styles.buttonArrow}
                    />
                  </>
                )}
              </Pressable>

              <View style={styles.loginRow}>
                <Text style={styles.loginQuestion}>Already registered?</Text>

                <Pressable
                  disabled={loading}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Text style={styles.loginText}>Login</Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.footer}>
              Driver registrations require administrator approval before login
              access is enabled.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* SUCCESS */}

      <Modal
        visible={successVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successOuter}>
              <View style={styles.successInner}>
                <Text style={styles.successCheck}>✓</Text>
              </View>
            </View>

            <Text style={styles.successTitle}>Registration Submitted</Text>

            <Text style={styles.successMessage}>{successMessage}</Text>

            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>
                PENDING ADMIN APPROVAL
              </Text>
            </View>

            <Text style={styles.redirectText}>Redirecting to login...</Text>

            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressBar,

                  {
                    width: progressWidth,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default RegisterScreen;

/* =========================================================
 * STYLES
 * ========================================================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },
  requiredStar: {
    color: '#d00018',
    fontWeight: '900',
  },

  vehicleTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  vehicleTypeChip: {
    minHeight: 42,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  vehicleTypeChipSelected: {
    borderColor: '#d00018',
    backgroundColor: '#fff1f2',
  },

  vehicleTypeText: {
    color: '#4b5563',
    fontSize: 14,
    fontWeight: '700',
  },

  vehicleTypeTextSelected: {
    color: '#d00018',
    fontWeight: '900',
  },

  /*
   * IMPORTANT
   * Allows KeyboardAvoidingView to use
   * the complete screen height.
   */
  keyboardAvoidingView: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },

  page: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  decorativeCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(208,0,24,0.05)',
  },

  topCircle: {
    top: -100,
    right: -100,
  },

  bottomCircle: {
    bottom: -70,
    left: -70,
  },

  brandSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
    zIndex: 1,
  },

  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d00018',
    marginBottom: 18,
    elevation: 10,
  },

  logo: {
    tintColor: '#ffffff',
  },

  brandTitle: {
    color: '#15171a',
    fontWeight: '900',
    textAlign: 'center',
  },

  brandSubtitle: {
    maxWidth: 340,
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },

  registerCard: {
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eeeeee',
    elevation: 7,
  },

  cardHeader: {
    marginBottom: 24,
  },

  cardTitle: {
    color: '#15171a',
    fontSize: 24,
    fontWeight: '900',
  },

  cardDescription: {
    color: '#7b8290',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },

  sectionTitle: {
    color: '#d00018',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 9,
    marginTop: 8,
    marginBottom: 15,
  },

  inputGroup: {
    width: '100%',
    marginBottom: 17,
  },

  inputLabel: {
    color: '#343841',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },

  inputContainer: {
    width: '100%',
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6f7f9',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    paddingHorizontal: 12,
  },

  multilineContainer: {
    minHeight: 95,
    alignItems: 'flex-start',
    paddingTop: 8,
  },

  inputIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginRight: 8,
  },

  inputImage: {
    width: 21,
    height: 21,
    resizeMode: 'contain',
    tintColor: '#d00018',
  },

  textInput: {
    flex: 1,
    minWidth: 0,
    height: 56,
    color: '#15171a',
    fontSize: 15,
    paddingHorizontal: 4,
    paddingVertical: 0,
  },

  multilineInput: {
    minHeight: 78,
    height: 78,
    paddingTop: 8,
    textAlignVertical: 'top',
  },

  visibilityButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  visibilityImage: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    tintColor: '#6b7280',
  },

  helperText: {
    color: '#8b929f',
    fontSize: 11,
    marginTop: -9,
    marginBottom: 18,
  },

  uploadGroup: {
    width: '100%',
    marginBottom: 18,
  },

  uploadContainer: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fb',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#d8dce3',
    borderRadius: 17,
    padding: 12,
  },

  uploadPressed: {
    opacity: 0.72,
    borderColor: '#d00018',
  },

  uploadDisabled: {
    opacity: 0.6,
  },

  uploadPreviewContainer: {
    width: 58,
    height: 58,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff0f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  uploadPreviewCircular: {
    borderRadius: 29,
  },

  uploadPreview: {
    width: '100%',
    height: '100%',
  },

  uploadPlaceholder: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  uploadPlus: {
    color: '#d00018',
    fontSize: 30,
  },

  uploadTextArea: {
    flex: 1,
  },

  uploadTitle: {
    color: '#25282e',
    fontSize: 14,
    fontWeight: '800',
  },

  uploadDescription: {
    color: '#858c99',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  changeImage: {
    color: '#d00018',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },

  uploadArrow: {
    color: '#d00018',
    fontSize: 25,
    paddingHorizontal: 6,
  },

  registerButton: {
    minHeight: 57,
    backgroundColor: '#d00018',
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    elevation: 5,
  },

  buttonPressed: {
    opacity: 0.85,
    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  registerButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },

  buttonArrow: {
    position: 'absolute',
    right: 18,
    width: 21,
    height: 21,
    tintColor: '#ffffff',
    resizeMode: 'contain',
  },

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },

  loginQuestion: {
    color: '#737985',
    fontSize: 14,
    marginRight: 5,
  },

  loginText: {
    color: '#d00018',
    fontSize: 14,
    fontWeight: '900',
  },

  footer: {
    maxWidth: 350,
    color: '#959ba5',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 22,
  },

  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,24,39,0.70)',
    paddingHorizontal: 24,
  },

  successCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 26,
    alignItems: 'center',
    elevation: 20,
  },

  successOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#e9f8ef',
    alignItems: 'center',
    justifyContent: 'center',
  },

  successInner: {
    width: 65,
    height: 65,
    borderRadius: 33,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },

  successCheck: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '900',
  },

  successTitle: {
    color: '#17191c',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 18,
    textAlign: 'center',
  },

  successMessage: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
  },

  pendingBadge: {
    backgroundColor: '#fff4dc',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 16,
  },

  pendingBadgeText: {
    color: '#a06200',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  redirectText: {
    color: '#d00018',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 18,
  },

  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 15,
  },

  progressBar: {
    height: '100%',
    backgroundColor: '#16a34a',
  },
});
