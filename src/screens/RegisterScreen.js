import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {SafeAreaView} from 'react-native-safe-area-context';

import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
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

import axios from 'axios';

const REGISTER_API_URL =
  'https://replete-software.com/projects/kp_kitchen/api/driver/register';

const SUCCESS_POPUP_DURATION = 3000;

const RegisterScreen = ({navigation}) => {
  const {width, height} = useWindowDimensions();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [password, setPassword] = useState('');

  const [
    passwordConfirmation,
    setPasswordConfirmation,
  ] = useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [loading, setLoading] = useState(false);

  const [
    successPopupVisible,
    setSuccessPopupVisible,
  ] = useState(false);

  const [
    successPopupMessage,
    setSuccessPopupMessage,
  ] = useState('');

  const successProgress = useRef(
    new Animated.Value(0),
  ).current;

  const redirectTimerRef = useRef(null);

  const isSmallScreen = width <= 360;
  const isShortScreen = height <= 700;

  const horizontalPadding = isSmallScreen
    ? 18
    : 24;

  const cardWidth = Math.min(
    width - horizontalPadding * 2,
    460,
  );

  const deviceName =
    Platform.OS === 'android'
      ? 'KP Kitchen Android App'
      : 'KP Kitchen iOS App';

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }

      successProgress.stopAnimation();
    };
  }, [successProgress]);

  const validateEmail = emailValue => {
    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailPattern.test(
      emailValue.trim(),
    );
  };

  const clearForm = () => {
    setName('');
    setEmail('');
    setMobileNumber('');
    setLicenseNumber('');
    setVehicleNumber('');
    setPassword('');
    setPasswordConfirmation('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const navigateToLogin = (
    registeredEmail,
    registrationMessage,
  ) => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'Login',
          params: {
            registeredEmail,
            registrationMessage,
          },
        },
      ],
    });
  };

  const showSuccessPopup = (
    registeredEmail,
    registrationMessage,
  ) => {
    setSuccessPopupMessage(
      registrationMessage,
    );

    setSuccessPopupVisible(true);

    successProgress.setValue(0);

    Animated.timing(successProgress, {
      toValue: 1,
      duration: SUCCESS_POPUP_DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    if (redirectTimerRef.current) {
      clearTimeout(
        redirectTimerRef.current,
      );
    }

    redirectTimerRef.current = setTimeout(
      () => {
        setSuccessPopupVisible(false);

        clearForm();

        navigateToLogin(
          registeredEmail,
          registrationMessage,
        );
      },
      SUCCESS_POPUP_DURATION,
    );
  };

  const getRegistrationErrorMessage =
    error => {
      if (!error.response) {
        if (
          error.code === 'ECONNABORTED'
        ) {
          return 'The request timed out. Please try again.';
        }

        return 'Unable to connect to the server. Please check your internet connection.';
      }

      const responseData =
        error.response.data;

      if (responseData?.errors) {
        const messages = Object.values(
          responseData.errors,
        )
          .flat()
          .filter(Boolean);

        if (messages.length > 0) {
          return messages.join('\n');
        }
      }

      return (
        responseData?.message ||
        responseData?.error ||
        'Unable to create your account. Please try again.'
      );
    };

  const handleRegister = async () => {
    if (
      loading ||
      successPopupVisible
    ) {
      return;
    }

    const cleanName = name.trim();

    const cleanEmail = email
      .trim()
      .toLowerCase();

    const cleanMobile =
      mobileNumber.trim();

    const cleanLicense = licenseNumber
      .trim()
      .toUpperCase();

    const cleanVehicle = vehicleNumber
      .trim()
      .toUpperCase();

    if (!cleanName) {
      Alert.alert(
        'Name required',
        'Please enter your full name.',
      );

      return;
    }

    if (cleanName.length < 2) {
      Alert.alert(
        'Invalid name',
        'Please enter a valid full name.',
      );

      return;
    }

    if (!cleanEmail) {
      Alert.alert(
        'Email required',
        'Please enter your email address.',
      );

      return;
    }

    if (!validateEmail(cleanEmail)) {
      Alert.alert(
        'Invalid email',
        'Please enter a valid email address.',
      );

      return;
    }

    if (!cleanMobile) {
      Alert.alert(
        'Mobile number required',
        'Please enter your mobile number.',
      );

      return;
    }

    if (cleanMobile.length < 10) {
      Alert.alert(
        'Invalid mobile number',
        'Mobile number must contain at least 10 digits.',
      );

      return;
    }

    if (!cleanLicense) {
      Alert.alert(
        'Licence number required',
        'Please enter your driving licence number.',
      );

      return;
    }

    if (!cleanVehicle) {
      Alert.alert(
        'Vehicle number required',
        'Please enter your vehicle number.',
      );

      return;
    }

    if (!password.trim()) {
      Alert.alert(
        'Password required',
        'Please enter your password.',
      );

      return;
    }

    if (password.length < 8) {
      Alert.alert(
        'Invalid password',
        'Password must contain at least 8 characters.',
      );

      return;
    }

    if (
      !passwordConfirmation.trim()
    ) {
      Alert.alert(
        'Confirm password required',
        'Please confirm your password.',
      );

      return;
    }

    if (
      password !==
      passwordConfirmation
    ) {
      Alert.alert(
        'Password mismatch',
        'Password and confirm password must be the same.',
      );

      return;
    }

    const requestData = {
      name: cleanName,

      /*
       * Both fields are included because
       * your API previously validated "email",
       * while your supplied field list used "mail".
       */
      email: cleanEmail,
      mail: cleanEmail,

      phone: cleanMobile,
      password,
      password_confirmation:
        passwordConfirmation,
      device_name: deviceName,
      license_number: cleanLicense,
      vehicle_number: cleanVehicle,
    };

    try {
      setLoading(true);

      console.log(
        'Register API URL:',
        REGISTER_API_URL,
      );

      console.log(
        'Register request:',
        {
          ...requestData,
          password: '********',
          password_confirmation:
            '********',
        },
      );

      const response = await axios.post(
        REGISTER_API_URL,
        requestData,
        {
          headers: {
            Accept:
              'application/json',
            'Content-Type':
              'application/json',
          },
          timeout: 20000,
        },
      );

      console.log(
        'Registration response:',
        response.data,
      );

      if (
        response.data?.status ===
          false ||
        response.data?.success ===
          false
      ) {
        Alert.alert(
          'Registration failed',
          response.data?.message ||
            'Unable to create your account.',
        );

        return;
      }

      const successMessage =
        response.data?.message ||
        'Your driver account has been created successfully.';

      showSuccessPopup(
        cleanEmail,
        successMessage,
      );
    } catch (registrationError) {
      console.log(
        'Registration error status:',
        registrationError.response
          ?.status,
      );

      console.log(
        'Registration error response:',
        registrationError.response
          ?.data,
      );

      console.log(
        'Registration error message:',
        registrationError.message,
      );

      Alert.alert(
        'Registration failed',
        getRegistrationErrorMessage(
          registrationError,
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const successProgressWidth =
    successProgress.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

  return (
    <SafeAreaView
      style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#f8f9fb"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal:
              horizontalPadding,

            paddingTop: isShortScreen
              ? 20
              : 38,

            paddingBottom: 36,
          },
        ]}
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled">
        <View style={styles.page}>
          <View
            pointerEvents="none"
            style={[
              styles.decorativeCircle,
              styles.topCircle,
              {
                width: width * 0.58,
                height: width * 0.58,
                borderRadius:
                  width * 0.29,
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
                borderRadius:
                  width * 0.21,
              },
            ]}
          />

          <View
            style={styles.brandSection}>
            <View
              style={[
                styles.logoContainer,
                {
                  width: isSmallScreen
                    ? 74
                    : 86,

                  height: isSmallScreen
                    ? 74
                    : 86,

                  borderRadius:
                    isSmallScreen
                      ? 23
                      : 27,
                },
              ]}>
              <Image
                source={require('../assets/delivery-bike-light.png')}
                resizeMode="contain"
                style={[
                  styles.logo,
                  {
                    width:
                      isSmallScreen
                        ? 40
                        : 48,

                    height:
                      isSmallScreen
                        ? 40
                        : 48,
                  },
                ]}
              />
            </View>

            <Text
              style={[
                styles.brandTitle,
                {
                  fontSize:
                    isSmallScreen
                      ? 27
                      : 32,
                },
              ]}>
              Create Account
            </Text>

            <Text
              style={[
                styles.brandSubtitle,
                {
                  fontSize:
                    isSmallScreen
                      ? 14
                      : 15,
                },
              ]}>
              Register your driver
              account to manage
              deliveries and assigned
              orders.
            </Text>
          </View>

          <View
            style={[
              styles.registerCard,
              {
                width: cardWidth,

                padding:
                  isSmallScreen
                    ? 18
                    : 24,

                borderRadius:
                  isSmallScreen
                    ? 24
                    : 28,
              },
            ]}>
            <View
              style={styles.cardHeader}>
              <Text
                style={[
                  styles.cardTitle,
                  {
                    fontSize:
                      isSmallScreen
                        ? 22
                        : 25,
                  },
                ]}>
                Driver Registration
              </Text>

              <Text
                style={
                  styles.cardDescription
                }>
                Enter your personal and
                vehicle details.
              </Text>
            </View>

            {/* Full Name */}

            <View
              style={styles.inputGroup}>
              <Text
                style={styles.inputLabel}>
                Full Name
              </Text>

              <View
                style={
                  styles.inputContainer
                }>
                <View
                  pointerEvents="none"
                  style={
                    styles.inputIconContainer
                  }>
                  <Image
                    source={require('../assets/user-dark.png')}
                    style={
                      styles.inputImage
                    }
                  />
                </View>

                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  editable={
                    !loading &&
                    !successPopupVisible
                  }
                  style={
                    styles.textInput
                  }
                />
              </View>
            </View>

            {/* Email Address */}

            <View
              style={styles.inputGroup}>
              <Text
                style={styles.inputLabel}>
                Email Address
              </Text>

              <View
                style={
                  styles.inputContainer
                }>
                <View
                  pointerEvents="none"
                  style={
                    styles.inputIconContainer
                  }>
                  <Image
                    source={require('../assets/mail.png')}
                    style={
                      styles.inputImage
                    }
                  />
                </View>

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="example@email.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  editable={
                    !loading &&
                    !successPopupVisible
                  }
                  style={
                    styles.textInput
                  }
                />
              </View>
            </View>

            {/* Mobile Number */}

            <View
              style={styles.inputGroup}>
              <Text
                style={styles.inputLabel}>
                Mobile Number
              </Text>

              <View
                style={
                  styles.inputContainer
                }>
                <View
                  pointerEvents="none"
                  style={
                    styles.inputIconContainer
                  }>
                  <Image
                    source={require('../assets/phone-call.png')}
                    style={
                      styles.inputImage
                    }
                  />
                </View>

                <TextInput
                  value={mobileNumber}
                  onChangeText={text => {
                    const numbersOnly =
                      text.replace(
                        /[^0-9]/g,
                        '',
                      );

                    setMobileNumber(
                      numbersOnly,
                    );
                  }}
                  placeholder="Enter mobile number"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  maxLength={15}
                  returnKeyType="next"
                  editable={
                    !loading &&
                    !successPopupVisible
                  }
                  style={
                    styles.textInput
                  }
                />
              </View>
            </View>

            {/* Licence Number */}

            <View
              style={styles.inputGroup}>
              <Text
                style={styles.inputLabel}>
                Licence Number
              </Text>

              <View
                style={
                  styles.inputContainer
                }>
                <View
                  pointerEvents="none"
                  style={
                    styles.inputIconContainer
                  }>
                  <Image
                    source={require('../assets/user-dark.png')}
                    style={
                      styles.inputImage
                    }
                  />
                </View>

                <TextInput
                  value={licenseNumber}
                  onChangeText={text => {
                    setLicenseNumber(
                      text.toUpperCase(),
                    );
                  }}
                  placeholder="Enter driving licence number"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={30}
                  returnKeyType="next"
                  editable={
                    !loading &&
                    !successPopupVisible
                  }
                  style={
                    styles.textInput
                  }
                />
              </View>
            </View>

            {/* Vehicle Number */}

            <View
              style={styles.inputGroup}>
              <Text
                style={styles.inputLabel}>
                Vehicle Number
              </Text>

              <View
                style={
                  styles.inputContainer
                }>
                <View
                  pointerEvents="none"
                  style={
                    styles.inputIconContainer
                  }>
                  <Image
                    source={require('../assets/delivery-bike-dark.png')}
                    style={
                      styles.inputImage
                    }
                  />
                </View>

                <TextInput
                  value={vehicleNumber}
                  onChangeText={text => {
                    setVehicleNumber(
                      text.toUpperCase(),
                    );
                  }}
                  placeholder="Example: GJ01AB1234"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={20}
                  returnKeyType="next"
                  editable={
                    !loading &&
                    !successPopupVisible
                  }
                  style={
                    styles.textInput
                  }
                />
              </View>
            </View>

            {/* Password */}

            <View
              style={styles.inputGroup}>
              <Text
                style={styles.inputLabel}>
                Password
              </Text>

              <View
                style={
                  styles.inputContainer
                }>
                <View
                  pointerEvents="none"
                  style={
                    styles.inputIconContainer
                  }>
                  <Image
                    source={require('../assets/padlock.png')}
                    style={
                      styles.inputImage
                    }
                  />
                </View>

                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Create your password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={
                    !showPassword
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  editable={
                    !loading &&
                    !successPopupVisible
                  }
                  style={
                    styles.textInput
                  }
                />

                <Pressable
                  disabled={
                    loading ||
                    successPopupVisible
                  }
                  onPress={() => {
                    setShowPassword(
                      previous =>
                        !previous,
                    );
                  }}
                  hitSlop={10}
                  style={({pressed}) => [
                    styles.visibilityButton,

                    pressed &&
                      styles.pressedOpacity,
                  ]}>
                  <Image
                    source={
                      showPassword
                        ? require('../assets/eye-open.png')
                        : require('../assets/eye-close.png')
                    }
                    style={
                      styles.visibilityImage
                    }
                  />
                </Pressable>
              </View>
            </View>

            {/* Confirm Password */}

            <View
              style={styles.inputGroup}>
              <Text
                style={styles.inputLabel}>
                Confirm Password
              </Text>

              <View
                style={
                  styles.inputContainer
                }>
                <View
                  pointerEvents="none"
                  style={
                    styles.inputIconContainer
                  }>
                  <Image
                    source={require('../assets/padlock.png')}
                    style={
                      styles.inputImage
                    }
                  />
                </View>

                <TextInput
                  value={
                    passwordConfirmation
                  }
                  onChangeText={
                    setPasswordConfirmation
                  }
                  placeholder="Confirm your password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={
                    !showConfirmPassword
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  editable={
                    !loading &&
                    !successPopupVisible
                  }
                  onSubmitEditing={
                    handleRegister
                  }
                  style={
                    styles.textInput
                  }
                />

                <Pressable
                  disabled={
                    loading ||
                    successPopupVisible
                  }
                  onPress={() => {
                    setShowConfirmPassword(
                      previous =>
                        !previous,
                    );
                  }}
                  hitSlop={10}
                  style={({pressed}) => [
                    styles.visibilityButton,

                    pressed &&
                      styles.pressedOpacity,
                  ]}>
                  <Image
                    source={
                      showConfirmPassword
                        ? require('../assets/eye-open.png')
                        : require('../assets/eye-close.png')
                    }
                    style={
                      styles.visibilityImage
                    }
                  />
                </Pressable>
              </View>
            </View>

            {/* Create Account Button */}

            <Pressable
              onPress={handleRegister}
              disabled={
                loading ||
                successPopupVisible
              }
              style={({pressed}) => [
                styles.registerButton,

                (loading ||
                  successPopupVisible) &&
                  styles.registerButtonDisabled,

                pressed &&
                  !loading &&
                  !successPopupVisible &&
                  styles.registerButtonPressed,
              ]}>
              {loading ? (
                <View
                  style={
                    styles.loadingButtonContent
                  }>
                  <ActivityIndicator
                    size="small"
                    color="#ffffff"
                  />

                  <Text
                    style={
                      styles.registerButtonText
                    }>
                    Creating Account...
                  </Text>
                </View>
              ) : (
                <>
                  <Text
                    style={
                      styles.registerButtonText
                    }>
                    Create Account
                  </Text>

                  <View
                    pointerEvents="none"
                    style={
                      styles.registerArrowContainer
                    }>
                    <Image
                      source={require('../assets/right-arrow.png')}
                      style={
                        styles.arrowImage
                      }
                    />
                  </View>
                </>
              )}
            </Pressable>

            {/* Login Link */}

            <View
              style={styles.loginRow}>
              <Text
                style={
                  styles.loginQuestion
                }>
                Already have an account?
              </Text>

              <Pressable
                disabled={
                  loading ||
                  successPopupVisible
                }
                onPress={() => {
                  navigation.navigate(
                    'Login',
                  );
                }}
                style={({pressed}) => [
                  styles.loginButton,

                  pressed &&
                    styles.pressedOpacity,
                ]}>
                <Text
                  style={styles.loginText}>
                  Login
                </Text>
              </Pressable>
            </View>
          </View>

          <Text
            style={styles.footerText}>
            By creating an account, you
            agree to our Terms and Privacy
            Policy.
          </Text>
        </View>
      </ScrollView>

      {/* Registration Success Popup */}

      <Modal
        visible={successPopupVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}}>
        <View
          style={styles.modalOverlay}>
          <View
            style={styles.successModalCard}>
            <View
              style={
                styles.successIconOuter
              }>
              <View
                style={
                  styles.successIconInner
                }>
                <Text
                  style={
                    styles.successCheckmark
                  }>
                  ✓
                </Text>
              </View>
            </View>

            <Text
              style={
                styles.successModalTitle
              }>
              Account Created!
            </Text>

            <Text
              style={
                styles.successModalMessage
              }>
              {successPopupMessage}
            </Text>

            <View
              style={
                styles.redirectMessageContainer
              }>
              <ActivityIndicator
                size="small"
                color="#d00018"
              />

              <Text
                style={
                  styles.redirectMessage
                }>
                Redirecting to login...
              </Text>
            </View>

            <View
              style={
                styles.progressTrack
              }>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width:
                      successProgressWidth,
                  },
                ]}
              />
            </View>

            <Text
              style={
                styles.popupDurationText
              }>
              You will be redirected in 3
              seconds
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fb',
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
    backgroundColor:
      'rgba(208, 0, 24, 0.05)',
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
    elevation: 12,

    shadowColor: '#d00018',

    shadowOffset: {
      width: 0,
      height: 8,
    },

    shadowOpacity: 0.25,
    shadowRadius: 14,
  },

  logo: {
    tintColor: '#ffffff',
  },

  brandTitle: {
    color: '#15171a',
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  brandSubtitle: {
    maxWidth: 330,
    color: '#6b7280',
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
  },

  registerCard: {
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eeeeee',
    elevation: 8,

    shadowColor: '#111827',

    shadowOffset: {
      width: 0,
      height: 10,
    },

    shadowOpacity: 0.09,
    shadowRadius: 22,
  },

  cardHeader: {
    marginBottom: 22,
  },

  cardTitle: {
    color: '#15171a',
    fontWeight: '800',
  },

  cardDescription: {
    color: '#7b8290',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
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

  inputIconContainer: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
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
    includeFontPadding: false,
    textAlignVertical: 'center',
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

  registerButton: {
    minHeight: 57,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d00018',
    borderRadius: 17,
    paddingHorizontal: 18,
    marginTop: 4,
    elevation: 6,

    shadowColor: '#d00018',

    shadowOffset: {
      width: 0,
      height: 6,
    },

    shadowOpacity: 0.24,
    shadowRadius: 10,
  },

  registerButtonPressed: {
    opacity: 0.88,

    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  registerButtonDisabled: {
    opacity: 0.72,
  },

  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 10,
  },

  registerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },

  registerArrowContainer: {
    position: 'absolute',
    right: 12,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,

    backgroundColor:
      'rgba(255,255,255,0.17)',
  },

  arrowImage: {
    width: 21,
    height: 21,
    resizeMode: 'contain',
    tintColor: '#ffffff',
  },

  loginRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },

  loginQuestion: {
    color: '#737985',
    fontSize: 14,
  },

  loginButton: {
    paddingVertical: 4,
    paddingHorizontal: 5,
  },

  loginText: {
    color: '#d00018',
    fontSize: 14,
    fontWeight: '800',
  },

  footerText: {
    maxWidth: 330,
    color: '#959ba5',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 22,
    zIndex: 1,
  },

  pressedOpacity: {
    opacity: 0.65,
  },

  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,

    backgroundColor:
      'rgba(15, 23, 42, 0.68)',
  },

  successModalCard: {
    width: '100%',
    maxWidth: 390,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingHorizontal: 26,
    paddingTop: 30,
    paddingBottom: 24,
    elevation: 20,

    shadowColor: '#000000',

    shadowOffset: {
      width: 0,
      height: 12,
    },

    shadowOpacity: 0.25,
    shadowRadius: 25,
  },

  successIconOuter: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 48,
    backgroundColor:
      'rgba(22, 163, 74, 0.12)',
    marginBottom: 20,
  },

  successIconInner: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 35,
    backgroundColor: '#16a34a',
    elevation: 8,

    shadowColor: '#16a34a',

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.35,
    shadowRadius: 10,
  },

  successCheckmark: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 47,
  },

  successModalTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },

  successModalMessage: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
  },

  redirectMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },

  redirectMessage: {
    color: '#d00018',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 9,
  },

  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 22,
  },

  progressBar: {
    height: '100%',
    backgroundColor: '#16a34a',
    borderRadius: 999,
  },

  popupDurationText: {
    color: '#9ca3af',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
  },
});