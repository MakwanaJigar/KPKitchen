import React, { useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
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

import { SafeAreaView } from 'react-native-safe-area-context';

import axios from 'axios';

import { launchImageLibrary } from 'react-native-image-picker';

/* =========================================================
 * API
 * ========================================================= */

const REGISTER_API_URL =
  'https://replete-software.com/projects/kp_admin/api/driver/register';

const SUCCESS_POPUP_DURATION = 3500;

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
      <Text style={styles.inputLabel}>{label}</Text>

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
      <Text style={styles.inputLabel}>{label}</Text>

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

  const [firstName, setFirstName] = useState('');

  const [lastName, setLastName] = useState('');

  const [phone, setPhone] = useState('');

  const [email, setEmail] = useState('');

  const [address, setAddress] = useState('');

  /* =======================================================
   * VEHICLE
   * ======================================================= */

  const [vehicleRegNo, setVehicleRegNo] = useState('');

  /* =======================================================
   * LICENCE
   * ======================================================= */

  const [licenseNo, setLicenseNo] = useState('');

  const [licenseExpiry, setLicenseExpiry] = useState('');

  const [licenseFront, setLicenseFront] = useState(null);

  const [licenseBack, setLicenseBack] = useState(null);

  /* =======================================================
   * DELIVERY
   * ======================================================= */

  const [assignedZip, setAssignedZip] = useState('');

  /* =======================================================
   * PROFILE
   * ======================================================= */

  const [profileImage, setProfileImage] = useState(null);

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
   * DATE
   * ======================================================= */

  const validateDate = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const [year, month, day] = value.split('-').map(Number);

    const date = new Date(year, month - 1, day);

    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  };

  /* =======================================================
   * LICENCE EXPIRY INPUT
   * ======================================================= */

  const handleExpiryChange = text => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 8);

    let formatted = digits;

    if (digits.length > 4) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    }

    if (digits.length > 6) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(
        6,
        8,
      )}`;
    }

    setLicenseExpiry(formatted);
  };

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

        includeBase64: true,

        quality: 0.7,

        maxWidth: 1400,

        maxHeight: 1400,

        selectionLimit: 1,
      });

      if (result?.didCancel) {
        return;
      }

      if (result?.errorCode) {
        Alert.alert(
          'Image Error',
          result?.errorMessage || 'Unable to select image.',
        );

        return;
      }

      const asset = result?.assets?.[0];

      if (!asset?.base64) {
        Alert.alert(
          'Image Error',
          'Unable to convert the selected image to Base64.',
        );

        return;
      }

      const mimeType = asset?.type || 'image/jpeg';

      const imageData = {
        uri: asset?.uri,

        type: mimeType,

        fileName: asset?.fileName,

        base64: `data:${mimeType};base64,${asset.base64}`,
      };

      if (type === 'profile') {
        setProfileImage(imageData);
      }

      if (type === 'front') {
        setLicenseFront(imageData);
      }

      if (type === 'back') {
        setLicenseBack(imageData);
      }
    } catch (error) {
      console.log('IMAGE PICKER ERROR:', error);

      Alert.alert('Image Error', error?.message || 'Unable to select image.');
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

    const cleanFirstName = firstName.trim();

    const cleanLastName = lastName.trim();

    const fullName = `${cleanFirstName} ${cleanLastName}`.trim();

    const cleanPhone = phone.replace(/[^0-9]/g, '');

    const cleanEmail = email.trim().toLowerCase();

    const cleanAddress = address.trim();

    const cleanVehicle = vehicleRegNo.trim().toUpperCase();

    const cleanLicense = licenseNo.trim().toUpperCase();

    const cleanExpiry = licenseExpiry.trim();

    const cleanAssignedZip = assignedZip
      .split(',')
      .map(zip => zip.trim())
      .filter(Boolean)
      .join(', ');

    /* =================================================
     * VALIDATION
     * ================================================= */

    if (!cleanFirstName) {
      Alert.alert('First Name Required', 'Please enter your first name.');

      return;
    }

    if (!cleanLastName) {
      Alert.alert('Last Name Required', 'Please enter your last name.');

      return;
    }

    if (!cleanPhone) {
      Alert.alert('Phone Required', 'Please enter your phone number.');

      return;
    }

    if (cleanPhone.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number.');

      return;
    }

    if (!cleanEmail) {
      Alert.alert('Email Required', 'Please enter your email address.');

      return;
    }

    if (!validateEmail(cleanEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');

      return;
    }

    if (!cleanAddress) {
      Alert.alert('Address Required', 'Please enter your residential address.');

      return;
    }

    if (!cleanVehicle) {
      Alert.alert(
        'Vehicle Registration Required',
        'Please enter your vehicle registration number.',
      );

      return;
    }

    if (!cleanLicense) {
      Alert.alert(
        'Licence Number Required',
        'Please enter your licence number.',
      );

      return;
    }

    if (!cleanExpiry) {
      Alert.alert(
        'Licence Expiry Required',
        'Please enter the licence expiry date.',
      );

      return;
    }

    if (!validateDate(cleanExpiry)) {
      Alert.alert('Invalid Expiry Date', 'Use YYYY-MM-DD format.');

      return;
    }

    const expiry = new Date(`${cleanExpiry}T23:59:59`);

    if (expiry.getTime() < Date.now()) {
      Alert.alert(
        'Licence Expired',
        'The licence expiry date must be in the future.',
      );

      return;
    }

    if (!cleanAssignedZip) {
      Alert.alert(
        'ZIP Required',
        'Please enter at least one assigned ZIP/postcode.',
      );

      return;
    }

    if (!licenseFront?.base64) {
      Alert.alert(
        'Licence Front Required',
        'Please upload the front side of your driving licence.',
      );

      return;
    }

    if (!licenseBack?.base64) {
      Alert.alert(
        'Licence Back Required',
        'Please upload the back side of your driving licence.',
      );

      return;
    }

    if (!profileImage?.base64) {
      Alert.alert(
        'Profile Image Required',
        'Please upload your profile image.',
      );

      return;
    }

    if (!password) {
      Alert.alert('Password Required', 'Please enter a password.');

      return;
    }

    if (password.length < 8) {
      Alert.alert(
        'Password Too Short',
        'Password must contain at least 8 characters.',
      );

      return;
    }

    if (!passwordConfirmation) {
      Alert.alert('Confirm Password', 'Please confirm your password.');

      return;
    }

    if (password !== passwordConfirmation) {
      Alert.alert(
        'Password Mismatch',
        'Password and confirm password must match.',
      );

      return;
    }

    /* =================================================
     * REQUEST
     * ================================================= */

    const requestData = {
      first_name: cleanFirstName,

      last_name: cleanLastName,

      name: fullName,

      phone: cleanPhone,

      email: cleanEmail,

      password,

      password_confirmation: passwordConfirmation,

      confirm_password: passwordConfirmation,

      address: cleanAddress,

      vehicle_reg_no: cleanVehicle,

      license_no: cleanLicense,

      license_expiry: cleanExpiry,

      assigned_zip: cleanAssignedZip,

      license_copy_front: licenseFront.base64,

      license_copy_back: licenseBack.base64,

      profile_image: profileImage.base64,
    };

    try {
      setLoading(true);

      console.log('REGISTER API:', REGISTER_API_URL);

      console.log('REGISTER PAYLOAD:', {
        first_name: requestData.first_name,

        last_name: requestData.last_name,

        name: requestData.name,

        phone: requestData.phone,

        email: requestData.email,

        address: requestData.address,

        vehicle_reg_no: requestData.vehicle_reg_no,

        license_no: requestData.license_no,

        license_expiry: requestData.license_expiry,

        assigned_zip: requestData.assigned_zip,

        password: '[HIDDEN]',

        password_confirmation: '[HIDDEN]',

        license_copy_front: '[BASE64 IMAGE]',

        license_copy_back: '[BASE64 IMAGE]',

        profile_image: '[BASE64 IMAGE]',
      });

      const response = await axios.post(
        REGISTER_API_URL,

        requestData,

        {
          headers: {
            Accept: 'application/json',

            'Content-Type': 'application/json',
          },

          timeout: 60000,

          maxBodyLength: Infinity,

          maxContentLength: Infinity,
        },
      );

      console.log('REGISTER RESPONSE:', response?.data);

      if (
        response?.data?.success === false ||
        response?.data?.status === false
      ) {
        Alert.alert(
          'Registration Failed',
          response?.data?.message || 'Unable to register your account.',
        );

        return;
      }

      const message = response?.data?.message
        ? `${response.data.message}\n\nYour registration is pending admin approval. You can login after the administrator approves your account.`
        : 'Your driver registration has been submitted successfully. Your account is pending admin approval. You can login after the administrator approves your account.';

      showSuccess(cleanEmail, message);
    } catch (error) {
      console.log('REGISTER ERROR STATUS:', error?.response?.status);

      console.log('REGISTER ERROR DATA:', error?.response?.data);

      console.log('REGISTER ERROR:', error?.message);

      Alert.alert('Registration Failed', getRegistrationError(error));
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

              <Text style={styles.sectionTitle}>Personal Details <Text style={styles.labelspam}>*</Text></Text>

              <FormInput
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Dwight"
                icon={require('../assets/user-dark.png')}
                autoCapitalize="words"
                maxLength={50}
                editable={!loading}
              />

              <FormInput
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Schrute"
                icon={require('../assets/user-dark.png')}
                autoCapitalize="words"
                maxLength={50}
                editable={!loading}
              />

              <FormInput
                label="Mobile Number"
                value={phone}
                onChangeText={text => setPhone(text.replace(/[^0-9]/g, ''))}
                placeholder="0499112233"
                icon={require('../assets/phone-call.png')}
                keyboardType="phone-pad"
                maxLength={15}
                editable={!loading}
              />

              <FormInput
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                placeholder="driver.dwight@example.com"
                icon={require('../assets/mail.png')}
                keyboardType="email-address"
                maxLength={120}
                editable={!loading}
              />

              <FormInput
                label="Address"
                value={address}
                onChangeText={setAddress}
                placeholder="Schrute Farms, Adelaide SA 5000"
                icon={require('../assets/user-dark.png')}
                autoCapitalize="words"
                multiline
                editable={!loading}
              />

              <ImageUploadField
                label="Profile Image "
                description="Upload a clear profile photograph"
                imageUri={profileImage?.uri}
                circular
                disabled={loading}
                onPress={() => chooseImage('profile')}
              />

              {/* VEHICLE */}

              <Text style={styles.sectionTitle}>Vehicle Details <Text style={styles.labelspam}>*</Text></Text>

              <FormInput
                label="Vehicle Registration Number"
                value={vehicleRegNo}
                onChangeText={text => setVehicleRegNo(text.toUpperCase())}
                placeholder="SA-BEET-01"
                icon={require('../assets/delivery-bike-dark.png')}
                autoCapitalize="characters"
                maxLength={30}
                editable={!loading}
              />

              {/* LICENCE */}

              <Text style={styles.sectionTitle}>Driving Licence <Text style={styles.labelspam}>*</Text></Text>

              <FormInput
                label="Licence Number"
                value={licenseNo}
                onChangeText={text => setLicenseNo(text.toUpperCase())}
                placeholder="DL-990011"
                icon={require('../assets/user-dark.png')}
                autoCapitalize="characters"
                maxLength={40}
                editable={!loading}
              />

              <FormInput
                label="Licence Expiry"
                value={licenseExpiry}
                onChangeText={handleExpiryChange}
                placeholder="YYYY-MM-DD"
                icon={require('../assets/user-dark.png')}
                keyboardType="number-pad"
                maxLength={10}
                editable={!loading}
              />

              <ImageUploadField
                label="Licence Copy - Front"
                description="Upload the front side of your driving licence"
                imageUri={licenseFront?.uri}
                disabled={loading}
                onPress={() => chooseImage('front')}
              />

              <ImageUploadField
                label="Licence Copy - Back"
                description="Upload the back side of your driving licence"
                imageUri={licenseBack?.uri}
                disabled={loading}
                onPress={() => chooseImage('back')}
              />

              {/* DELIVERY */}

              <Text style={styles.sectionTitle}>Delivery Zone <Text style={styles.labelspam}>*</Text></Text>

              <FormInput
                label=" Postcode"
                value={assignedZip}
                onChangeText={text =>
                  setAssignedZip(text.replace(/[^a-zA-Z0-9,\s-]/g, ''))
                }
                placeholder="5000, 5001"
                icon={require('../assets/user-dark.png')}
                autoCapitalize="characters"
                maxLength={100}
                editable={!loading}
              />

              <Text style={styles.helperText}>
                Separate multiple Postcodes with commas.
              </Text>

              {/* SECURITY */}

              <Text style={styles.sectionTitle}>Account Security <Text style={styles.labelspam}>*</Text></Text>

              {/* PASSWORD */}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>

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
                <Text style={styles.inputLabel}>Confirm Password</Text>

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
  labelspam:{
    color: '#A00B0F',

    fontSize: 13,

    fontWeight: '600',

    marginBottom: 7,
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
