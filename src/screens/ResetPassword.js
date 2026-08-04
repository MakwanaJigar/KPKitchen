import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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
import axios from 'axios';

const RESET_PASSWORD_API_URL =
  'https://replete-software.com/projects/kp_kitchen/api/driver/reset-password';

const SUCCESS_REDIRECT_TIME = 2000;

const ResetPassword = ({
  navigation,
  route,
}) => {
  const {width, height} =
    useWindowDimensions();

  /*
   * These values are passed from
   * the OTP verification screen.
   */
  const email =
    route?.params?.email
      ?.trim()
      ?.toLowerCase() || '';

  const otp =
    route?.params?.otp
      ?.trim() || '';

  /*
   * This is optional. It will be sent only
   * when the verify-OTP API returns a token.
   */
  const resetToken =
    route?.params?.resetToken || '';

  const [password, setPassword] =
    useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [isLoading, setIsLoading] =
    useState(false);

  const [
    successPopupVisible,
    setSuccessPopupVisible,
  ] = useState(false);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState(
    'Your password has been reset successfully.',
  );

  const redirectTimerRef =
    useRef(null);

  const isSmallScreen = width <= 360;
  const isShortScreen = height <= 700;

  const horizontalPadding =
    isSmallScreen ? 18 : 24;

  const cardWidth = Math.min(
    width - horizontalPadding * 2,
    460,
  );

  /*
   * Clear redirect timer if the screen
   * unmounts before two seconds.
   */
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(
          redirectTimerRef.current,
        );
      }
    };
  }, []);

  /*
   * Reset navigation so the user cannot
   * return to the reset-password screen.
   */
  const navigateToLogin = () => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'Login',
        },
      ],
    });
  };

  /*
   * Read Laravel validation errors
   * without using Array.flat().
   */
  const extractValidationErrors =
    errors => {
      const messages = [];

      if (
        !errors ||
        typeof errors !== 'object'
      ) {
        return messages;
      }

      Object.keys(errors).forEach(
        fieldName => {
          const fieldErrors =
            errors[fieldName];

          if (
            Array.isArray(fieldErrors)
          ) {
            fieldErrors.forEach(
              message => {
                if (message) {
                  messages.push(
                    String(message),
                  );
                }
              },
            );
          } else if (fieldErrors) {
            messages.push(
              String(fieldErrors),
            );
          }
        },
      );

      return messages;
    };

  /*
   * Convert Axios and Laravel errors into
   * a readable message.
   */
  const getResetPasswordErrorMessage =
    error => {
      console.log(
        '===== RESET PASSWORD ERROR =====',
      );

      console.log(
        'Message:',
        error?.message,
      );

      console.log(
        'Code:',
        error?.code,
      );

      console.log(
        'Status:',
        error?.response?.status,
      );

      console.log(
        'Response:',
        error?.response?.data,
      );

      console.log(
        'Request URL:',
        error?.config?.url,
      );

      console.log(
        '================================',
      );

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
          error.response.status === 400
        ) {
          return (
            responseData?.message ||
            'The OTP is invalid or has expired.'
          );
        }

        if (
          error.response.status === 404
        ) {
          return (
            responseData?.message ||
            'No password reset request was found.'
          );
        }

        if (
          error.response.status === 422
        ) {
          return (
            responseData?.message ||
            'Please check your password and reset information.'
          );
        }

        if (
          error.response.status === 429
        ) {
          return (
            responseData?.message ||
            'Too many reset attempts. Please wait and try again.'
          );
        }

        return (
          responseData?.message ||
          responseData?.error ||
          `The server returned error ${error.response.status}.`
        );
      }

      if (
        error?.code === 'ECONNABORTED'
      ) {
        return 'The password reset request timed out. Please try again.';
      }

      if (error?.request) {
        return (
          'The password reset server did not respond. ' +
          'Please check your internet connection and try again.'
        );
      }

      return (
        error?.message ||
        'An unexpected error occurred while resetting your password.'
      );
    };

  /*
   * Show the success popup and redirect
   * automatically after two seconds.
   */
  const showSuccessAndRedirect =
    message => {
      setSuccessMessage(
        message ||
          'Your password has been reset successfully.',
      );

      setSuccessPopupVisible(true);

      redirectTimerRef.current =
        setTimeout(() => {
          setSuccessPopupVisible(false);
          navigateToLogin();
        }, SUCCESS_REDIRECT_TIME);
    };

  /*
   * Validate fields and call the
   * reset-password API.
   */
  const handleResetPassword =
    async () => {
      if (
        isLoading ||
        successPopupVisible
      ) {
        return;
      }

      const cleanPassword =
        password.trim();

      const cleanConfirmPassword =
        confirmPassword.trim();

      if (!email) {
        Alert.alert(
          'Email Missing',
          'Your email address was not received. Please restart the forgot-password process.',
          [
            {
              text: 'Back to Login',
              onPress: navigateToLogin,
            },
          ],
        );

        return;
      }

      if (!otp && !resetToken) {
        Alert.alert(
          'Verification Missing',
          'OTP verification information was not received. Please request a new OTP.',
          [
            {
              text: 'Back',
              onPress: () => {
                navigation.goBack();
              },
            },
          ],
        );

        return;
      }

      if (!cleanPassword) {
        Alert.alert(
          'Password Required',
          'Please enter your new password.',
        );

        return;
      }

      if (
        cleanPassword.length < 8
      ) {
        Alert.alert(
          'Weak Password',
          'Your password must contain at least eight characters.',
        );

        return;
      }

      if (!cleanConfirmPassword) {
        Alert.alert(
          'Confirm Password',
          'Please confirm your new password.',
        );

        return;
      }

      if (
        cleanPassword !==
        cleanConfirmPassword
      ) {
        Alert.alert(
          'Passwords Do Not Match',
          'The new password and confirmation password must be the same.',
        );

        return;
      }

      /*
       * Standard Laravel reset-password
       * request fields.
       */
      const requestData = {
        email,
        password: cleanPassword,

        password_confirmation:
          cleanConfirmPassword,
      };

      /*
       * Send the verified OTP when available.
       */
      if (otp) {
        requestData.otp = otp;
      }

      /*
       * Send the reset token only when the
       * OTP verification API returns one.
       */
      if (resetToken) {
        requestData.reset_token =
          resetToken;
      }

      try {
        setIsLoading(true);

        console.log(
          'Reset password API:',
          RESET_PASSWORD_API_URL,
        );

        /*
         * Do not print passwords in Metro.
         */
        console.log(
          'Reset password request:',
          {
            email:
              requestData.email,

            otp:
              requestData.otp,

            hasResetToken:
              Boolean(resetToken),

            passwordLength:
              cleanPassword.length,
          },
        );

        const response =
          await axios.post(
            RESET_PASSWORD_API_URL,
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
          'Reset password response:',
          response.data,
        );

        const responseData =
          response.data;

        /*
         * Some Laravel APIs return HTTP 200
         * while status or success is false.
         */
        if (
          responseData?.status ===
            false ||
          responseData?.success ===
            false
        ) {
          Alert.alert(
            'Reset Failed',

            responseData?.message ||
              'Unable to reset your password.',
          );

          return;
        }

        /*
         * Clear sensitive fields from state.
         */
        setPassword('');
        setConfirmPassword('');

        /*
         * Show success popup for two seconds
         * and then redirect to Login.
         */
        showSuccessAndRedirect(
          responseData?.message ||
            'Password reset successfully.',
        );
      } catch (error) {
        console.log(
          'Reset password API error:',
          {
            message:
              error?.message,

            code:
              error?.code,

            status:
              error?.response
                ?.status,

            response:
              error?.response
                ?.data,

            url:
              error?.config?.url,
          },
        );

        Alert.alert(
          'Reset Failed',
          getResetPasswordErrorMessage(
            error,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    };

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

            paddingBottom: 34,
          },
        ]}
        showsVerticalScrollIndicator={
          false
        }>
        <View style={styles.page}>
          {/* Decorative circles */}

          <View
            pointerEvents="none"
            style={[
              styles.decorativeCircle,
              styles.topCircle,
              {
                width:
                  width * 0.58,

                height:
                  width * 0.58,

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
                width:
                  width * 0.42,

                height:
                  width * 0.42,

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
              Create New Password
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
              Choose a secure password
              for your driver account.
            </Text>
          </View>

          {/* Reset card */}

          <View
            style={[
              styles.resetCard,
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
                Reset Password
              </Text>

              <Text
                style={
                  styles.cardDescription
                }>
                Enter and confirm your
                new account password.
              </Text>
            </View>

            {/* Information */}

            <View
              style={styles.infoBox}>
              <View
                style={
                  styles.infoIconContainer
                }>
                <Image
                  source={require('../assets/padlock.png')}
                  style={styles.infoIcon}
                />
              </View>

              <Text
                style={styles.infoText}>
                Use at least eight
                characters and avoid
                easily guessed passwords.
              </Text>
            </View>

            {/* New password */}

            <View
              style={styles.inputGroup}>
              <Text
                style={styles.inputLabel}>
                New Password
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
                  placeholder="Enter new password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={
                    !showPassword
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={
                    !isLoading &&
                    !successPopupVisible
                  }
                  style={styles.textInput}
                />

                <Pressable
                  onPress={() => {
                    setShowPassword(
                      previousValue =>
                        !previousValue,
                    );
                  }}
                  disabled={
                    isLoading ||
                    successPopupVisible
                  }
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

            {/* Confirm password */}

            <View
              style={styles.inputGroup}>
              <Text
                style={styles.inputLabel}>
                Confirm New Password
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
                  value={confirmPassword}
                  onChangeText={
                    setConfirmPassword
                  }
                  placeholder="Confirm new password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={
                    !showConfirmPassword
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={
                    !isLoading &&
                    !successPopupVisible
                  }
                  style={styles.textInput}
                />

                <Pressable
                  onPress={() => {
                    setShowConfirmPassword(
                      previousValue =>
                        !previousValue,
                    );
                  }}
                  disabled={
                    isLoading ||
                    successPopupVisible
                  }
                  hitSlop={8}
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

            {/* Password requirements */}

            <View
              style={
                styles.requirementContainer
              }>
              <View
                style={
                  styles.requirementRow
                }>
                <View
                  style={[
                    styles.requirementDot,

                    password.trim()
                      .length >= 8 &&
                      styles.requirementDotComplete,
                  ]}
                />

                <Text
                  style={
                    styles.requirementText
                  }>
                  At least eight
                  characters
                </Text>
              </View>

              <View
                style={
                  styles.requirementRow
                }>
                <View
                  style={[
                    styles.requirementDot,

                    Boolean(
                      password &&
                        confirmPassword &&
                        password.trim() ===
                          confirmPassword.trim(),
                    ) &&
                      styles.requirementDotComplete,
                  ]}
                />

                <Text
                  style={
                    styles.requirementText
                  }>
                  Both passwords match
                </Text>
              </View>
            </View>

            {/* Reset button */}

            <Pressable
              onPress={
                handleResetPassword
              }
              disabled={
                isLoading ||
                successPopupVisible
              }
              style={({pressed}) => [
                styles.resetButton,

                pressed &&
                  !isLoading &&
                  !successPopupVisible &&
                  styles.resetButtonPressed,

                (isLoading ||
                  successPopupVisible) &&
                  styles.resetButtonDisabled,
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
                      styles.loadingText
                    }>
                    Resetting...
                  </Text>
                </View>
              ) : (
                <>
                  <Text
                    style={
                      styles.resetButtonText
                    }>
                    Reset Password
                  </Text>

                  <View
                    pointerEvents="none"
                    style={
                      styles.arrowContainer
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

            {/* Back to Login */}

            <View
              style={styles.backRow}>
              <Text
                style={
                  styles.backQuestion
                }>
                Remember your password?
              </Text>

              <Pressable
                disabled={
                  isLoading ||
                  successPopupVisible
                }
                onPress={navigateToLogin}
                style={({pressed}) => [
                  styles.backButton,

                  pressed &&
                    styles.pressedOpacity,
                ]}>
                <Text
                  style={styles.backText}>
                  Back to Login
                </Text>
              </Pressable>
            </View>
          </View>

          <Text
            style={styles.footerText}>
            Your password should be
            unique and difficult to guess.
          </Text>
        </View>
      </ScrollView>

      {/* Password reset success popup */}

      <Modal
        visible={successPopupVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        hardwareAccelerated
        onRequestClose={() => {}}>
        <View
          style={
            styles.successModalOverlay
          }>
          <View
            style={
              styles.successModalCard
            }>
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
                    styles.successIconText
                  }>
                  ✓
                </Text>
              </View>
            </View>

            <Text
              style={
                styles.successModalTitle
              }>
              Password Reset Successfully
            </Text>

            <Text
              style={
                styles.successModalMessage
              }>
              {successMessage}
            </Text>

            <View
              style={
                styles.redirectInformation
              }>
              <ActivityIndicator
                size="small"
                color="#16a34a"
              />

              <Text
                style={
                  styles.redirectInformationText
                }>
                Redirecting to login...
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ResetPassword;

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

  resetCard: {
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
    marginBottom: 18,
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

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor:
      'rgba(208, 0, 24, 0.055)',

    borderWidth: 1,

    borderColor:
      'rgba(208, 0, 24, 0.12)',

    borderRadius: 15,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginBottom: 20,
  },

  infoIconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#ffffff',
    marginRight: 11,
  },

  infoIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    tintColor: '#d00018',
  },

  infoText: {
    flex: 1,
    color: '#5f6672',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
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

  requirementContainer: {
    width: '100%',
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginBottom: 21,
    borderRadius: 13,
    backgroundColor: '#f7f8fa',
  },

  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },

  requirementDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#c9ced6',
    marginRight: 9,
  },

  requirementDotComplete: {
    backgroundColor: '#16a34a',
  },

  requirementText: {
    color: '#6b7280',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },

  resetButton: {
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

  resetButtonPressed: {
    opacity: 0.88,

    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  resetButtonDisabled: {
    opacity: 0.65,
  },

  resetButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },

  arrowContainer: {
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

  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginLeft: 10,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },

  backRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },

  backQuestion: {
    color: '#737985',
    fontSize: 14,
  },

  backButton: {
    paddingVertical: 4,
    paddingHorizontal: 5,
  },

  backText: {
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

  successModalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,

    backgroundColor:
      'rgba(17, 24, 39, 0.7)',
  },

  successModalCard: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    paddingTop: 34,
    paddingHorizontal: 25,
    paddingBottom: 28,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    elevation: 20,

    shadowColor: '#000000',

    shadowOffset: {
      width: 0,
      height: 14,
    },

    shadowOpacity: 0.25,
    shadowRadius: 24,
  },

  successIconOuter: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 48,
    backgroundColor: '#dcfce7',
    marginBottom: 21,
  },

  successIconInner: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: '#16a34a',
    elevation: 6,

    shadowColor: '#16a34a',

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.26,
    shadowRadius: 9,
  },

  successIconText: {
    color: '#ffffff',
    fontSize: 36,
    lineHeight: 41,
    fontWeight: '900',
  },

  successModalTitle: {
    color: '#17191c',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    textAlign: 'center',
  },

  successModalMessage: {
    maxWidth: 300,
    marginTop: 10,
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },

  redirectInformation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
  },

  redirectInformationText: {
    marginLeft: 9,
    color: '#15803d',
    fontSize: 12,
    fontWeight: '700',
  },
});