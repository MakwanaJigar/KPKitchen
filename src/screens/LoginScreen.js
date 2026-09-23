import React, { useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
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

import { CommonActions } from '@react-navigation/native';

import { SafeAreaView } from 'react-native-safe-area-context';

import AsyncStorage from '@react-native-async-storage/async-storage';

import axios from 'axios';

/* =========================================================
 * API
 * ========================================================= */

const LOGIN_API_URL =
  'https://replete-software.com/projects/kp_admin/api/driver/login';

/* =========================================================
 * STORAGE KEYS
 * ========================================================= */

export const AUTH_TOKEN_KEY = '@kp_kitchen_driver_token';

export const AUTH_USER_KEY = '@kp_kitchen_driver_user';

export const AUTH_EMAIL_KEY = '@kp_kitchen_driver_email';

export const AUTH_LOGOUT_FLAG_KEY = '@kp_kitchen_driver_logged_out';

/* =========================================================
 * LOADING
 * ========================================================= */

const MINIMUM_LOADING_TIME = 1500;

/* =========================================================
 * WAIT
 * ========================================================= */

const waitForMinimumLoadingTime = async startedAt => {
  const elapsed = Date.now() - startedAt;

  if (elapsed < MINIMUM_LOADING_TIME) {
    await new Promise(resolve => {
      setTimeout(resolve, MINIMUM_LOADING_TIME - elapsed);
    });
  }
};

/* =========================================================
 * NORMALIZE STATUS
 * ========================================================= */

const normalizeApprovalValue = value =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

/* =========================================================
 * GET APPROVAL STATUS
 * ========================================================= */

const getDriverApprovalStatus = (responseData, driver) => {
  const booleanApproval =
    driver?.is_approved ??
    driver?.isApproved ??
    responseData?.is_approved ??
    responseData?.isApproved ??
    responseData?.data?.is_approved ??
    responseData?.data?.isApproved;

  if (
    booleanApproval === true ||
    booleanApproval === 1 ||
    booleanApproval === '1'
  ) {
    return 'approved';
  }

  if (
    booleanApproval === false ||
    booleanApproval === 0 ||
    booleanApproval === '0'
  ) {
    return 'pending';
  }

  const explicitStatus =
    driver?.approval_status ??
    driver?.approvalStatus ??
    driver?.verification_status ??
    driver?.verificationStatus ??
    driver?.account_status ??
    driver?.accountStatus ??
    responseData?.approval_status ??
    responseData?.approvalStatus ??
    responseData?.verification_status ??
    responseData?.account_status ??
    responseData?.data?.approval_status ??
    responseData?.data?.approvalStatus ??
    responseData?.data?.verification_status ??
    responseData?.data?.account_status;

  if (
    explicitStatus !== undefined &&
    explicitStatus !== null &&
    String(explicitStatus).trim() !== ''
  ) {
    return normalizeApprovalValue(explicitStatus);
  }

  const genericStatus = normalizeApprovalValue(
    driver?.status ??
      responseData?.driver?.status ??
      responseData?.data?.driver?.status ??
      '',
  );

  const knownApprovalStatuses = [
    'approved',
    'pending',
    'pending_approval',
    'awaiting_approval',
    'unapproved',
    'rejected',
    'inactive',
    'suspended',
  ];

  if (knownApprovalStatuses.includes(genericStatus)) {
    return genericStatus;
  }

  return null;
};

/* =========================================================
 * BLOCKED STATUS
 * ========================================================= */

const isApprovalBlocked = approvalStatus => {
  const status = normalizeApprovalValue(approvalStatus);

  return [
    'pending',
    'pending_approval',
    'awaiting_approval',
    'unapproved',
    'rejected',
    'inactive',
    'suspended',
    'disabled',
    'blocked',
  ].includes(status);
};

/* =========================================================
 * APPROVAL MESSAGE
 * ========================================================= */

const getApprovalMessage = status => {
  const value = normalizeApprovalValue(status);

  if (value === 'rejected') {
    return {
      title: 'Registration Not Approved',
      message:
        'Your driver registration was not approved. Please contact the administrator for more information.',
    };
  }

  if (['inactive', 'suspended', 'disabled', 'blocked'].includes(value)) {
    return {
      title: 'Account Unavailable',
      message:
        'Your driver account is currently inactive. Please contact the administrator.',
    };
  }

  return {
    title: 'Approval Pending',
    message:
      'Your driver registration is still waiting for admin approval. You can login after the administrator approves your account.',
  };
};

/* =========================================================
 * CLEAR SESSION
 * ========================================================= */

export const clearDriverLoginSession = async () => {
  try {
    await AsyncStorage.setItem(AUTH_LOGOUT_FLAG_KEY, '1');

    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(AUTH_USER_KEY);
    await AsyncStorage.removeItem(AUTH_EMAIL_KEY);

    if (
      axios.defaults &&
      axios.defaults.headers &&
      axios.defaults.headers.common
    ) {
      delete axios.defaults.headers.common.Authorization;
    }

    return true;
  } catch (error) {
    console.log('CLEAR LOGIN SESSION ERROR:', error);

    throw error;
  }
};

/* =========================================================
 * REMOVE AUTH WITHOUT SETTING LOGOUT
 * ========================================================= */

const removeAuthenticationData = async () => {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  await AsyncStorage.removeItem(AUTH_USER_KEY);
  await AsyncStorage.removeItem(AUTH_EMAIL_KEY);

  if (
    axios.defaults &&
    axios.defaults.headers &&
    axios.defaults.headers.common
  ) {
    delete axios.defaults.headers.common.Authorization;
  }
};

/* =========================================================
 * LOGIN
 * ========================================================= */

const LoginScreen = ({ navigation, route }) => {
  const { width, height } = useWindowDimensions();

  const [email, setEmail] = useState(route?.params?.registeredEmail ?? '');

  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const [checkingSession, setCheckingSession] = useState(true);

  const [registrationNotice, setRegistrationNotice] = useState(
    route?.params?.registrationMessage ?? '',
  );

  const [errorPopup, setErrorPopup] = useState({
    visible: false,
    title: '',
    message: '',
    buttonText: 'Try Again',
  });

  const mountedRef = useRef(false);

  const loginInProgressRef = useRef(false);

  const navigatingToHomeRef = useRef(false);

  /* NEW:
   * Used so pressing NEXT on email moves directly
   * to the password input.
   */
  const passwordInputRef = useRef(null);

  /* =======================================================
   * MOUNT
   * ======================================================= */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* =======================================================
   * RESPONSIVE
   * ======================================================= */

  const isSmallScreen = width <= 360;

  const isShortScreen = height <= 700;

  const horizontalPadding = isSmallScreen ? 18 : 24;

  const cardWidth = Math.min(width - horizontalPadding * 2, 460);

  /* =======================================================
   * HOME
   * ======================================================= */

  const navigateToHome = () => {
    if (navigatingToHomeRef.current) {
      return;
    }

    navigatingToHomeRef.current = true;

    try {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,

          routes: [
            {
              name: 'MainTabs',
            },
          ],
        }),
      );
    } catch (error) {
      navigatingToHomeRef.current = false;

      console.log('NAVIGATION ERROR:', error);
    }
  };

  /* =======================================================
   * ERROR
   * ======================================================= */

  const showErrorPopup = (title, message, buttonText = 'Try Again') => {
    if (!mountedRef.current) {
      return;
    }

    setErrorPopup({
      visible: true,
      title,
      message,
      buttonText,
    });
  };

  const closeErrorPopup = () => {
    if (mountedRef.current) {
      setErrorPopup(current => ({
        ...current,
        visible: false,
      }));
    }
  };

  /* =======================================================
   * RESTORE SESSION
   * ======================================================= */

  useEffect(() => {
    let active = true;

    const restore = async () => {
      try {
        const logoutFlag = await AsyncStorage.getItem(AUTH_LOGOUT_FLAG_KEY);

        if (logoutFlag === '1') {
          await removeAuthenticationData();

          if (active && mountedRef.current) {
            setCheckingSession(false);
          }

          return;
        }

        const savedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

        const savedUserText = await AsyncStorage.getItem(AUTH_USER_KEY);

        let savedUser = null;

        if (savedUserText) {
          try {
            savedUser = JSON.parse(savedUserText);
          } catch (error) {
            savedUser = null;
          }
        }

        const storedApproval = getDriverApprovalStatus({}, savedUser);

        if (storedApproval && isApprovalBlocked(storedApproval)) {
          await removeAuthenticationData();

          if (active && mountedRef.current) {
            setCheckingSession(false);
          }

          return;
        }

        if (savedToken) {
          axios.defaults.headers.common.Authorization = `Bearer ${savedToken}`;

          if (active && mountedRef.current) {
            setCheckingSession(false);

            navigateToHome();
          }

          return;
        }

        if (active && mountedRef.current) {
          setCheckingSession(false);
        }
      } catch (error) {
        console.log('RESTORE LOGIN ERROR:', error);

        if (active && mountedRef.current) {
          setCheckingSession(false);
        }
      }
    };

    restore();

    return () => {
      active = false;
    };
  }, []);

  /* =======================================================
   * VALIDATION ERRORS
   * ======================================================= */

  const extractValidationErrors = errors => {
    const messages = [];

    if (!errors || typeof errors !== 'object') {
      return messages;
    }

    Object.values(errors).forEach(value => {
      if (Array.isArray(value)) {
        value.forEach(message => {
          if (message) {
            messages.push(String(message));
          }
        });
      } else if (value) {
        messages.push(String(value));
      }
    });

    return messages;
  };

  /* =======================================================
   * LOGIN ERROR
   * ======================================================= */

  const getLoginErrorMessage = error => {
    if (error?.response) {
      const data = error.response.data;

      const validation = extractValidationErrors(data?.errors);

      if (validation.length > 0) {
        return validation.join('\n');
      }

      if (error.response.status === 403) {
        return (
          data?.message ||
          'Your driver account is waiting for administrator approval.'
        );
      }

      if (error.response.status === 401) {
        return data?.message || 'The email address or password is incorrect.';
      }

      if (error.response.status === 422) {
        return data?.message || 'Please check your login details.';
      }

      return (
        data?.message || data?.error || `Server error ${error.response.status}.`
      );
    }

    if (error?.code === 'ECONNABORTED') {
      return 'The login request timed out. Please try again.';
    }

    if (error?.request) {
      return 'The login server did not respond. Please check your internet connection.';
    }

    return error?.message || 'An unexpected login error occurred.';
  };

  /* =======================================================
   * LOGIN
   * ======================================================= */

  const handleLogin = async () => {
    if (
      isLoading ||
      checkingSession ||
      loginInProgressRef.current ||
      navigatingToHomeRef.current
    ) {
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    const cleanPassword = password;

    if (!cleanEmail && !cleanPassword) {
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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
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

    const startedAt = Date.now();

    loginInProgressRef.current = true;

    try {
      if (mountedRef.current) {
        setIsLoading(true);
      }

      await removeAuthenticationData();

      const response = await axios.post(
        LOGIN_API_URL,

        requestData,

        {
          headers: {
            Accept: 'application/json',

            'Content-Type': 'application/json',
          },

          timeout: 20000,
        },
      );

      console.log('COMPLETE LOGIN RESPONSE:', response?.data);

      /* =============================================
       * API SAYS LOGIN FAILED
       * ============================================= */

      if (
        response?.data?.status === false ||
        response?.data?.success === false
      ) {
        await waitForMinimumLoadingTime(startedAt);

        loginInProgressRef.current = false;

        if (mountedRef.current) {
          setIsLoading(false);

          const message = response?.data?.message || 'Unable to login.';

          const lower = message.toLowerCase();

          const approvalRelated =
            lower.includes('approval') ||
            lower.includes('pending') ||
            lower.includes('not approved') ||
            lower.includes('inactive');

          showErrorPopup(
            approvalRelated ? 'Approval Pending' : 'Login Failed',

            message,

            approvalRelated ? 'OK' : 'Try Again',
          );
        }

        return;
      }

      /* =============================================
       * DRIVER
       * ============================================= */

      const driver =
        response?.data?.driver ||
        response?.data?.user ||
        response?.data?.data?.driver ||
        response?.data?.data?.user ||
        null;

      /* =============================================
       * APPROVAL STATUS
       * ============================================= */

      const approvalStatus = getDriverApprovalStatus(response?.data, driver);

      console.log('DRIVER APPROVAL STATUS:', approvalStatus);

      if (approvalStatus && isApprovalBlocked(approvalStatus)) {
        await removeAuthenticationData();

        await waitForMinimumLoadingTime(startedAt);

        loginInProgressRef.current = false;

        if (mountedRef.current) {
          setIsLoading(false);

          const approval = getApprovalMessage(approvalStatus);

          showErrorPopup(approval.title, approval.message, 'OK');
        }

        return;
      }

      /* =============================================
       * TOKEN
       * ============================================= */

      const token =
        response?.data?.token ||
        response?.data?.access_token ||
        response?.data?.plainTextToken ||
        response?.data?.plain_text_token ||
        response?.data?.data?.token ||
        response?.data?.data?.access_token ||
        response?.data?.data?.plainTextToken ||
        response?.data?.data?.plain_text_token;

      if (!token) {
        await waitForMinimumLoadingTime(startedAt);

        loginInProgressRef.current = false;

        if (mountedRef.current) {
          setIsLoading(false);

          showErrorPopup(
            'Login Unavailable',
            'The login API did not return an authentication token.',
            'Close',
          );
        }

        return;
      }

      /* =============================================
       * SAVE ONLY APPROVED LOGIN
       * ============================================= */

      await AsyncStorage.setItem(AUTH_TOKEN_KEY, String(token));

      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(driver || {}));

      await AsyncStorage.setItem(AUTH_EMAIL_KEY, cleanEmail);

      await AsyncStorage.removeItem(AUTH_LOGOUT_FLAG_KEY);

      const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

      if (!storedToken) {
        throw new Error('Login token could not be saved.');
      }

      axios.defaults.headers.common.Authorization = `Bearer ${storedToken}`;

      if (mountedRef.current) {
        setPassword('');
      }

      await waitForMinimumLoadingTime(startedAt);

      if (!mountedRef.current) {
        return;
      }

      setIsLoading(false);

      loginInProgressRef.current = false;

      navigateToHome();
    } catch (error) {
      console.log('LOGIN ERROR STATUS:', error?.response?.status);

      console.log('LOGIN ERROR DATA:', error?.response?.data);

      loginInProgressRef.current = false;

      navigatingToHomeRef.current = false;

      await removeAuthenticationData();

      await waitForMinimumLoadingTime(startedAt);

      if (!mountedRef.current) {
        return;
      }

      setIsLoading(false);

      const message = getLoginErrorMessage(error);

      const lower = String(message).toLowerCase();

      const approvalRelated =
        error?.response?.status === 403 ||
        lower.includes('approval') ||
        lower.includes('pending') ||
        lower.includes('not approved') ||
        lower.includes('inactive');

      showErrorPopup(
        approvalRelated ? 'Approval Pending' : 'Login Failed',

        message,

        approvalRelated ? 'OK' : 'Try Again',
      );
    }
  };

  /* =======================================================
   * SESSION LOADER
   * ======================================================= */

  if (checkingSession) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fb" />

        <View style={styles.sessionLoader}>
          <View style={styles.sessionLoaderIcon}>
            <ActivityIndicator size="large" color="#d00018" />
          </View>

          <Text style={styles.sessionLoaderTitle}>Checking Your Session</Text>

          <Text style={styles.sessionLoaderText}>
            Please wait while we verify your account.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* =======================================================
   * UI
   * ======================================================= */

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fb" />

      {/* ===================================================
          KEYBOARD FIX

          iOS:
          Uses padding when keyboard opens.

          Android:
          Reduces available view height.

          Because ScrollView is inside this component,
          the user can scroll the complete login screen
          while typing.
          =================================================== */}

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

              paddingTop: isShortScreen ? 20 : 42,

              /*
               * Keep extra space at bottom.
               * This allows password/login button
               * area to scroll comfortably above
               * the keyboard.
               */
              paddingBottom: 120,
            },
          ]}
          showsVerticalScrollIndicator={false}
          /*
           * Allows buttons and fields to
           * continue receiving touches while
           * keyboard is open.
           */
          keyboardShouldPersistTaps="handled"
          /*
           * Important:
           * dragging the screen will NOT
           * automatically close the keyboard.
           */
          keyboardDismissMode="none"
          /*
           * Explicitly keep scrolling enabled
           * while keyboard is displayed.
           */
          scrollEnabled={true}
          bounces={false}
          overScrollMode="never"
        >
          <View style={styles.page}>
            {/* DECORATIVE TOP CIRCLE */}

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

            {/* DECORATIVE BOTTOM CIRCLE */}

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
                Welcome Back
              </Text>

              <Text style={styles.brandSubtitle}>
                Sign in to manage your deliveries and orders.
              </Text>
            </View>

            {/* REGISTRATION NOTICE */}

            {!!registrationNotice && (
              <View style={styles.registrationNotice}>
                <View style={styles.registrationNoticeIcon}>
                  <Text style={styles.registrationNoticeIconText}>!</Text>
                </View>

                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text style={styles.registrationNoticeTitle}>
                    Registration Submitted
                  </Text>

                  <Text style={styles.registrationNoticeText}>
                    Your account must be approved by an administrator before you
                    can login.
                  </Text>
                </View>

                <Pressable onPress={() => setRegistrationNotice('')}>
                  <Text style={styles.noticeClose}>×</Text>
                </Pressable>
              </View>
            )}

            {/* LOGIN CARD */}

            <View
              style={[
                styles.loginCard,

                {
                  width: cardWidth,

                  padding: isSmallScreen ? 18 : 24,

                  borderRadius: isSmallScreen ? 24 : 28,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Login</Text>

                <Text style={styles.cardDescription}>
                  Only approved driver accounts can access the driver dashboard.
                </Text>
              </View>

              {/* EMAIL */}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>

                <View style={styles.inputContainer}>
                  <View pointerEvents="none" style={styles.inputIconContainer}>
                    <Image
                      source={require('../assets/mail.png')}
                      style={styles.inputImage}
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
                    /*
                     * Do not close keyboard
                     * when pressing NEXT.
                     */
                    blurOnSubmit={false}
                    /*
                     * Automatically move to
                     * password field.
                     */
                    onSubmitEditing={() => {
                      passwordInputRef.current?.focus();
                    }}
                    editable={!isLoading}
                    style={styles.textInput}
                  />
                </View>
              </View>

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
                    ref={passwordInputRef}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    editable={!isLoading}
                    style={styles.textInput}
                  />

                  <Pressable
                    disabled={isLoading}
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

              {/* OPTIONS */}

              <View style={styles.optionsRow}>
                <View style={styles.rememberButton}>
                  <View style={styles.checkbox}>
                    <View style={styles.checkboxInner} />
                  </View>

                  <Text style={styles.rememberText}>Stay signed in</Text>
                </View>

                <Pressable
                  disabled={isLoading}
                  onPress={() => navigation.navigate('ForgotPassword')}
                >
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </Pressable>
              </View>

              {/* LOGIN */}

              <Pressable
                disabled={isLoading}
                onPress={handleLogin}
                style={({ pressed }) => [
                  styles.loginButton,

                  isLoading && styles.loginButtonDisabled,

                  pressed && !isLoading && styles.loginButtonPressed,
                ]}
              >
                {isLoading ? (
                  <>
                    <ActivityIndicator size="small" color="#ffffff" />

                    <Text style={styles.loadingButtonText}>Signing in...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Login</Text>

                    <Image
                      source={require('../assets/right-arrow.png')}
                      style={styles.loginArrow}
                    />
                  </>
                )}
              </Pressable>

              {/* REGISTER */}

              <View style={styles.registerRow}>
                <Text style={styles.registerQuestion}>
                  Don&apos;t have an account?
                </Text>

                <Pressable
                  disabled={isLoading}
                  onPress={() => navigation.navigate('Register')}
                >
                  <Text style={styles.registerText}>Create Account</Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.footerText}>
              Driver access is available only after administrator approval.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* LOGIN LOADING */}

      <Modal
        visible={isLoading}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={styles.loginLoadingOverlay}>
          <View style={styles.loginLoadingCard}>
            <View style={styles.loginLoadingIcon}>
              <ActivityIndicator size="large" color="#d00018" />
            </View>

            <Text style={styles.loginLoadingTitle}>Verifying Your Account</Text>

            <Text style={styles.loginLoadingMessage}>
              Please wait while we check your login and approval status.
            </Text>
          </View>
        </View>
      </Modal>

      {/* ERROR */}

      <Modal
        visible={errorPopup.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeErrorPopup}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={closeErrorPopup}
          />

          <View style={styles.errorModal}>
            <Pressable onPress={closeErrorPopup} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>

            <View style={styles.errorIconOuter}>
              <View style={styles.errorIconInner}>
                <Text style={styles.errorIconText}>!</Text>
              </View>
            </View>

            <Text style={styles.errorModalTitle}>{errorPopup.title}</Text>

            <Text style={styles.errorModalMessage}>{errorPopup.message}</Text>

            <Pressable
              onPress={closeErrorPopup}
              style={styles.errorModalButton}
            >
              <Text style={styles.errorModalButtonText}>
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

/* =========================================================
 * STYLES
 * ========================================================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },

  /*
   * NEW
   * Needed so KeyboardAvoidingView occupies
   * the complete available screen.
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
    maxWidth: 310,
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
  },

  /* REGISTRATION NOTICE */

  registrationNotice: {
    width: '100%',
    maxWidth: 460,
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff8e8',
    borderWidth: 1,
    borderColor: '#f4d88c',
    borderRadius: 16,
    padding: 13,
    marginBottom: 15,
  },

  registrationNoticeIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e6a300',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  registrationNoticeIconText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },

  registrationNoticeTitle: {
    color: '#604300',
    fontSize: 12,
    fontWeight: '900',
  },

  registrationNoticeText: {
    color: '#86651a',
    fontSize: 10.5,
    lineHeight: 16,
    marginTop: 3,
  },

  noticeClose: {
    color: '#8d7028',
    fontSize: 22,
    lineHeight: 22,
    marginLeft: 8,
  },

  /* CARD */

  loginCard: {
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eeeeee',
    elevation: 8,
  },

  cardHeader: {
    marginBottom: 22,
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
  },

  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontWeight: '900',
  },

  loadingButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
  },

  loginArrow: {
    position: 'absolute',
    right: 18,
    width: 22,
    height: 22,
    resizeMode: 'contain',
    tintColor: '#ffffff',
  },

  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
    flexWrap: 'wrap',
  },

  registerQuestion: {
    color: '#737985',
    fontSize: 14,
    marginRight: 5,
  },

  registerText: {
    color: '#d00018',
    fontSize: 14,
    fontWeight: '900',
  },

  footerText: {
    maxWidth: 330,
    color: '#959ba5',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 22,
  },

  /* SESSION */

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
    borderRadius: 43,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },

  sessionLoaderTitle: {
    color: '#17191c',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 22,
  },

  sessionLoaderText: {
    color: '#6b7280',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },

  /* LOGIN LOADING */

  loginLoadingOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,24,39,0.72)',
    paddingHorizontal: 24,
  },

  loginLoadingCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 30,
    elevation: 20,
  },

  loginLoadingIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },

  loginLoadingTitle: {
    color: '#17191c',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },

  loginLoadingMessage: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
  },

  /* ERROR */

  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,24,39,0.65)',
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
  },

  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeButtonText: {
    color: '#6b7280',
    fontSize: 26,
    lineHeight: 28,
  },

  errorIconOuter: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  errorIconInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#d00018',
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorIconText: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '900',
  },

  errorModalTitle: {
    color: '#17191c',
    fontSize: 23,
    fontWeight: '900',
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
    backgroundColor: '#d00018',
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorModalButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
});
