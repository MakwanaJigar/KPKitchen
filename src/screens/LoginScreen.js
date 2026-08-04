import React, {useEffect, useState} from 'react';

import {
  ActivityIndicator,
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

import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const LOGIN_API_URL =
  'https://replete-software.com/projects/kp_kitchen/api/driver/login';

const AUTH_TOKEN_KEY = '@kp_kitchen_driver_token';
const AUTH_USER_KEY = '@kp_kitchen_driver_user';
const AUTH_EMAIL_KEY = '@kp_kitchen_driver_email';

const MINIMUM_LOADING_TIME = 1500;

/**
 * Keep the loader visible for a minimum duration.
 */
const waitForMinimumLoadingTime = async startedAt => {
  const elapsedTime = Date.now() - startedAt;

  if (elapsedTime < MINIMUM_LOADING_TIME) {
    await new Promise(resolve => {
      setTimeout(
        resolve,
        MINIMUM_LOADING_TIME - elapsedTime,
      );
    });
  }
};

/**
 * Use this function only when the driver
 * manually presses the Logout button.
 */
export const clearDriverLoginSession = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(AUTH_USER_KEY);
    await AsyncStorage.removeItem(AUTH_EMAIL_KEY);

    delete axios.defaults.headers.common.Authorization;
  } catch (error) {
    console.log(
      'Clear driver login session error:',
      error,
    );

    throw error;
  }
};

const LoginScreen = ({navigation}) => {
  const {width, height} = useWindowDimensions();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(false);

  const [checkingSession, setCheckingSession] =
    useState(true);

  const [errorPopup, setErrorPopup] = useState({
    visible: false,
    title: '',
    message: '',
    buttonText: 'Try Again',
  });

  const isSmallScreen = width <= 360;
  const isShortScreen = height <= 700;

  const horizontalPadding = isSmallScreen
    ? 18
    : 24;

  const cardWidth = Math.min(
    width - horizontalPadding * 2,
    460,
  );

  /**
   * Redirect to HomeScreen and remove
   * Login from the navigation history.
   */
  const navigateToHome = () => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'MainTabs',
        },
      ],
    });
  };

  const showErrorPopup = (
    title,
    message,
    buttonText = 'Try Again',
  ) => {
    setErrorPopup({
      visible: true,
      title,
      message,
      buttonText,
    });
  };

  const closeErrorPopup = () => {
    setErrorPopup(previousValue => ({
      ...previousValue,
      visible: false,
    }));
  };

  /**
   * Restore the saved login when the app opens.
   */
  useEffect(() => {
    let componentMounted = true;

    const restoreDriverSession = async () => {
      try {
        const savedToken =
          await AsyncStorage.getItem(
            AUTH_TOKEN_KEY,
          );

        if (savedToken) {
          axios.defaults.headers.common.Authorization =
            `Bearer ${savedToken}`;

          if (componentMounted) {
            setCheckingSession(false);
            navigateToHome();
          }

          return;
        }
      } catch (error) {
        console.log(
          'Restore driver session error:',
          error,
        );
      }

      if (componentMounted) {
        setCheckingSession(false);
      }
    };

    restoreDriverSession();

    return () => {
      componentMounted = false;
    };
  }, []);

  /**
   * Convert Laravel validation errors
   * into a readable string without using .flat().
   */
  const extractValidationErrors = errors => {
    const messages = [];

    if (
      !errors ||
      typeof errors !== 'object'
    ) {
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

  const getLoginErrorMessage = error => {
    console.log(
      '========== LOGIN ERROR ==========',
    );

    console.log(
      'Error message:',
      error?.message,
    );

    console.log(
      'Error code:',
      error?.code,
    );

    console.log(
      'HTTP status:',
      error?.response?.status,
    );

    console.log(
      'Response data:',
      error?.response?.data,
    );

    console.log(
      'Request URL:',
      error?.config?.url,
    );

    console.log(
      '=================================',
    );

    /*
     * Server responded with an error.
     */
    if (error?.response) {
      const responseData =
        error.response.data;

      const validationMessages =
        extractValidationErrors(
          responseData?.errors,
        );

      if (
        validationMessages.length > 0
      ) {
        return validationMessages.join(
          '\n',
        );
      }

      if (
        error.response.status === 401 ||
        error.response.status === 403
      ) {
        return (
          responseData?.message ||
          'The email address or password is incorrect.'
        );
      }

      if (
        error.response.status === 422
      ) {
        return (
          responseData?.message ||
          'Please check your email address and password.'
        );
      }

      return (
        responseData?.message ||
        responseData?.error ||
        `The server returned error ${error.response.status}.`
      );
    }

    /*
     * Request timed out.
     */
    if (
      error?.code === 'ECONNABORTED'
    ) {
      return 'The login request timed out. Please try again.';
    }

    /*
     * Request was sent but no response was received.
     */
    if (error?.request) {
      return (
        'The login server did not respond. ' +
        'Please check the server, SSL certificate, or Android internet permission.'
      );
    }

    /*
     * JavaScript or Axios configuration error.
     */
    return (
      error?.message ||
      'An unexpected error occurred during login.'
    );
  };

  const handleLogin = async () => {
    if (
      isLoading ||
      checkingSession
    ) {
      return;
    }

    const cleanEmail = email
      .trim()
      .toLowerCase();

    const cleanPassword = password;

    if (
      !cleanEmail &&
      !cleanPassword
    ) {
      showErrorPopup(
        'Required Fields',
        'Please enter your email address and password.',
        'Enter Details',
      );

      return;
    }

    if (!cleanEmail) {
      showErrorPopup(
        'Email Required',
        'Please enter your email address.',
        'Enter Email',
      );

      return;
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailPattern.test(cleanEmail)
    ) {
      showErrorPopup(
        'Invalid Email',
        'Please enter a valid email address.',
        'Correct Email',
      );

      return;
    }

    if (!cleanPassword) {
      showErrorPopup(
        'Password Required',
        'Please enter your password.',
        'Enter Password',
      );

      return;
    }

    const requestData = {
      email: cleanEmail,
      password: cleanPassword,

      device_name:
        Platform.OS === 'android'
          ? 'KP Kitchen Android App'
          : 'KP Kitchen iOS App',
    };

    const loginStartedAt = Date.now();

    try {
      setIsLoading(true);

      console.log(
        'Login API URL:',
        LOGIN_API_URL,
      );

      console.log('Login request:', {
        email: requestData.email,
        device_name:
          requestData.device_name,
      });

      const response =
        await axios.post(
          LOGIN_API_URL,
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
        'Complete login response:',
        response.data,
      );

      /*
       * Some APIs return HTTP 200 while
       * status or success is false.
       */
      if (
        response.data?.status ===
          false ||
        response.data?.success ===
          false
      ) {
        await waitForMinimumLoadingTime(
          loginStartedAt,
        );

        setIsLoading(false);

        showErrorPopup(
          'Login Failed',
          response.data?.message ||
            'The email address or password is incorrect.',
          'Try Again',
        );

        return;
      }

      /*
       * Support common Laravel Sanctum
       * token response formats.
       */
      const token =
        response.data?.token ||
        response.data?.access_token ||
        response.data?.plainTextToken ||
        response.data?.plain_text_token ||
        response.data?.data?.token ||
        response.data?.data
          ?.access_token ||
        response.data?.data
          ?.plainTextToken ||
        response.data?.data
          ?.plain_text_token;

      const driver =
        response.data?.driver ||
        response.data?.user ||
        response.data?.data?.driver ||
        response.data?.data?.user ||
        null;

      if (!token) {
        await waitForMinimumLoadingTime(
          loginStartedAt,
        );

        setIsLoading(false);

        showErrorPopup(
          'Token Not Received',
          'The login API did not return an authentication token. Check the complete API response in Metro.',
          'Close',
        );

        return;
      }

      /*
       * Save login information permanently.
       * The password is never stored.
       */
      await AsyncStorage.setItem(
        AUTH_TOKEN_KEY,
        String(token),
      );

      await AsyncStorage.setItem(
        AUTH_USER_KEY,
        JSON.stringify(driver || {}),
      );

      await AsyncStorage.setItem(
        AUTH_EMAIL_KEY,
        cleanEmail,
      );

      /*
       * Add the token to future Axios requests.
       */
      axios.defaults.headers.common.Authorization =
        `Bearer ${token}`;

      console.log(
        'Login session saved successfully.',
      );

      setPassword('');

      /*
       * Keep the loading popup visible briefly.
       */
      await waitForMinimumLoadingTime(
        loginStartedAt,
      );

      setIsLoading(false);

      /*
       * Redirect only after successful login.
       */
      navigateToHome();
    } catch (error) {
      console.log(
        'Axios login error:',
        {
          message: error?.message,
          code: error?.code,
          status:
            error?.response?.status,
          response:
            error?.response?.data,
          url: error?.config?.url,
        },
      );

      const errorMessage =
        getLoginErrorMessage(error);

      await waitForMinimumLoadingTime(
        loginStartedAt,
      );

      setIsLoading(false);

      showErrorPopup(
        'Login Failed',
        errorMessage,
        'Try Again',
      );
    }
  };

  /**
   * Show loading while checking whether
   * the driver is already logged in.
   */
  if (checkingSession) {
    return (
      <SafeAreaView
        style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#f8f9fb"
        />

        <View
          style={styles.sessionLoader}>
          <View
            style={
              styles.sessionLoaderIcon
            }>
            <ActivityIndicator
              size="large"
              color="#d00018"
            />
          </View>

          <Text
            style={
              styles.sessionLoaderTitle
            }>
            Checking Your Session
          </Text>

          <Text
            style={
              styles.sessionLoaderText
            }>
            Please wait while we open
            your account.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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

            paddingTop:
              isShortScreen
                ? 20
                : 42,

            paddingBottom: 100,
          },
        ]}
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        bounces={false}
        overScrollMode="never">
        <View style={styles.page}>
          {/* Decorative circles */}

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

          {/* Brand */}

          <View
            style={styles.brandSection}>
            <View
              style={[
                styles.logoContainer,
                {
                  width:
                    isSmallScreen
                      ? 74
                      : 86,

                  height:
                    isSmallScreen
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
              Welcome Back
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
              Sign in to manage your
              deliveries and orders.
            </Text>
          </View>

          {/* Login card */}

          <View
            style={[
              styles.loginCard,
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
                Login
              </Text>

              <Text
                style={
                  styles.cardDescription
                }>
                Enter your registered
                email address and
                password to continue.
              </Text>
            </View>

            {/* Email */}

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
                  placeholder="Enter your email address"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  editable={!isLoading}
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
                  placeholder="Enter your password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={
                    !showPassword
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={
                    handleLogin
                  }
                  editable={!isLoading}
                  style={
                    styles.textInput
                  }
                />

                <Pressable
                  onPress={() => {
                    setShowPassword(
                      previousValue =>
                        !previousValue,
                    );
                  }}
                  disabled={isLoading}
                  hitSlop={8}
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

            {/* Login options */}

            <View
              style={styles.optionsRow}>
              <View
                style={
                  styles.rememberButton
                }>
                <View
                  style={styles.checkbox}>
                  <View
                    style={
                      styles.checkboxInner
                    }
                  />
                </View>

                <Text
                  style={
                    styles.rememberText
                  }>
                  Stay signed in
                </Text>
              </View>

              <Pressable
                disabled={isLoading}
                onPress={() => {
                  navigation.navigate(
                    'ForgotPassword',
                  );
                }}
                style={({pressed}) => [
                  styles.forgotButton,

                  pressed &&
                    styles.pressedOpacity,
                ]}>
                <Text
                  style={styles.forgotText}>
                  Forgot Password?
                </Text>
              </Pressable>
            </View>

            {/* Login button */}

            <Pressable
              onPress={handleLogin}
              disabled={isLoading}
              style={({pressed}) => [
                styles.loginButton,

                pressed &&
                  !isLoading &&
                  styles.loginButtonPressed,

                isLoading &&
                  styles.loginButtonDisabled,
              ]}>
              {isLoading ? (
                <View
                  style={
                    styles.loadingContent
                  }>
                  <ActivityIndicator
                    size="small"
                    color="#ffffff"
                  />

                  <Text
                    style={
                      styles.loadingButtonText
                    }>
                    Signing in...
                  </Text>
                </View>
              ) : (
                <>
                  <Text
                    style={
                      styles.loginButtonText
                    }>
                    Login
                  </Text>

                  <View
                    pointerEvents="none"
                    style={
                      styles.loginArrowContainer
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

            {/* Registration link */}

            <View
              style={styles.registerRow}>
              <Text
                style={
                  styles.registerQuestion
                }>
                Don&apos;t have an
                account?
              </Text>

              <Pressable
                disabled={isLoading}
                onPress={() => {
                  navigation.navigate(
                    'Register',
                  );
                }}
                style={({pressed}) => [
                  styles.registerButton,

                  pressed &&
                    styles.pressedOpacity,
                ]}>
                <Text
                  style={
                    styles.registerText
                  }>
                  Create Account
                </Text>
              </Pressable>
            </View>
          </View>

          <Text
            style={styles.footerText}>
            By continuing, you agree to
            our Terms and Privacy Policy.
          </Text>
        </View>
      </ScrollView>

      {/* Login loading popup */}

      <Modal
        visible={isLoading}
        transparent
        animationType="fade"
        statusBarTranslucent
        hardwareAccelerated
        onRequestClose={() => {}}>
        <View
          style={
            styles.loginLoadingOverlay
          }>
          <View
            style={
              styles.loginLoadingCard
            }>
            <View
              style={
                styles.loginLoadingIcon
              }>
              <ActivityIndicator
                size="large"
                color="#d00018"
              />
            </View>

            <Text
              style={
                styles.loginLoadingTitle
              }>
              Signing You In
            </Text>

            <Text
              style={
                styles.loginLoadingMessage
              }>
              Please wait while we verify
              your account and open your
              dashboard.
            </Text>

            <View
              style={
                styles.loadingDotsRow
              }>
              <View
                style={styles.loadingDot}
              />

              <View
                style={[
                  styles.loadingDot,
                  styles.loadingDotMiddle,
                ]}
              />

              <View
                style={styles.loadingDot}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Error popup */}

      <Modal
        visible={errorPopup.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        hardwareAccelerated
        onRequestClose={
          closeErrorPopup
        }>
        <View
          style={styles.modalOverlay}>
          <Pressable
            style={
              StyleSheet.absoluteFillObject
            }
            onPress={closeErrorPopup}
          />

          <View
            style={styles.errorModal}>
            <Pressable
              onPress={closeErrorPopup}
              hitSlop={10}
              style={({pressed}) => [
                styles.closeButton,

                pressed &&
                  styles.closeButtonPressed,
              ]}>
              <Text
                style={
                  styles.closeButtonText
                }>
                ×
              </Text>
            </Pressable>

            <View
              style={
                styles.errorIconOuter
              }>
              <View
                style={
                  styles.errorIconInner
                }>
                <Text
                  style={
                    styles.errorIconText
                  }>
                  !
                </Text>
              </View>
            </View>

            <Text
              style={
                styles.errorModalTitle
              }>
              {errorPopup.title}
            </Text>

            <Text
              style={
                styles.errorModalMessage
              }>
              {errorPopup.message}
            </Text>

            <Pressable
              onPress={closeErrorPopup}
              style={({pressed}) => [
                styles.errorModalButton,

                pressed &&
                  styles.errorModalButtonPressed,
              ]}>
              <Text
                style={
                  styles.errorModalButtonText
                }>
                {errorPopup.buttonText}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default LoginScreen;

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
    maxWidth: 310,
    color: '#6b7280',
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
  },

  loginCard: {
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
    width: 22,
    height: 22,
    resizeMode: 'contain',
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
    marginLeft: 4,
  },

  visibilityImage: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },

  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 1,
    marginBottom: 22,
  },

  rememberButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  checkbox: {
    width: 19,
    height: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d00018',
    borderRadius: 6,
    backgroundColor: '#d00018',
    marginRight: 8,
  },

  checkboxInner: {
    width: 7,
    height: 4,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#ffffff',

    transform: [
      {
        rotate: '-45deg',
      },
    ],

    marginTop: -2,
  },

  rememberText: {
    color: '#5f6672',
    fontSize: 13,
    fontWeight: '600',
  },

  forgotButton: {
    paddingVertical: 5,
  },

  forgotText: {
    color: '#d00018',
    fontSize: 13,
    fontWeight: '700',
  },

  loginButton: {
    minHeight: 57,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d00018',
    borderRadius: 17,
    paddingHorizontal: 18,
    elevation: 6,

    shadowColor: '#d00018',

    shadowOffset: {
      width: 0,
      height: 6,
    },

    shadowOpacity: 0.24,
    shadowRadius: 10,
  },

  loginButtonPressed: {
    opacity: 0.88,

    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  loginButtonDisabled: {
    opacity: 0.65,
  },

  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },

  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
  },

  loginArrowContainer: {
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
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },

  registerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },

  registerQuestion: {
    color: '#737985',
    fontSize: 14,
  },

  registerButton: {
    paddingVertical: 4,
    paddingHorizontal: 5,
  },

  registerText: {
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

  sessionLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    backgroundColor: '#f8f9fb',
  },

  sessionLoaderIcon: {
    width: 86,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 43,
    backgroundColor: '#ffffff',
    elevation: 8,

    shadowColor: '#111827',

    shadowOffset: {
      width: 0,
      height: 8,
    },

    shadowOpacity: 0.1,
    shadowRadius: 18,
  },

  sessionLoaderTitle: {
    color: '#17191c',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 22,
  },

  sessionLoaderText: {
    maxWidth: 310,
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },

  loginLoadingOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,

    backgroundColor:
      'rgba(17, 24, 39, 0.72)',
  },

  loginLoadingCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 34,
    paddingBottom: 30,
    elevation: 20,

    shadowColor: '#000000',

    shadowOffset: {
      width: 0,
      height: 14,
    },

    shadowOpacity: 0.26,
    shadowRadius: 24,
  },

  loginLoadingIcon: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 44,
    backgroundColor: '#fff1f2',
    marginBottom: 22,
  },

  loginLoadingTitle: {
    color: '#17191c',
    fontSize: 23,
    fontWeight: '800',
    textAlign: 'center',
  },

  loginLoadingMessage: {
    maxWidth: 290,
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 10,
  },

  loadingDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },

  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d00018',
    opacity: 0.35,
  },

  loadingDotMiddle: {
    marginHorizontal: 8,
    opacity: 1,
  },

  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      'rgba(17, 24, 39, 0.65)',

    paddingHorizontal: 24,
  },

  errorModal: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingTop: 38,
    paddingHorizontal: 24,
    paddingBottom: 24,
    elevation: 20,

    shadowColor: '#000000',

    shadowOffset: {
      width: 0,
      height: 14,
    },

    shadowOpacity: 0.25,
    shadowRadius: 24,
  },

  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    zIndex: 2,
  },

  closeButtonPressed: {
    opacity: 0.65,

    transform: [
      {
        scale: 0.94,
      },
    ],
  },

  closeButtonText: {
    color: '#6b7280',
    fontSize: 26,
    fontWeight: '400',
    lineHeight: 28,
  },

  errorIconOuter: {
    width: 94,
    height: 94,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 47,
    backgroundColor: '#fff1f2',
    marginBottom: 20,
  },

  errorIconInner: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 31,
    backgroundColor: '#d00018',
    elevation: 5,

    shadowColor: '#d00018',

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.25,
    shadowRadius: 8,
  },

  errorIconText: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 40,
  },

  errorModalTitle: {
    color: '#17191c',
    fontSize: 23,
    fontWeight: '800',
    textAlign: 'center',
  },

  errorModalMessage: {
    maxWidth: 300,
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 26,
  },

  errorModalButton: {
    width: '100%',
    minHeight: 55,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d00018',
    borderRadius: 17,
    elevation: 5,

    shadowColor: '#d00018',

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.22,
    shadowRadius: 8,
  },

  errorModalButtonPressed: {
    opacity: 0.86,

    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  errorModalButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});