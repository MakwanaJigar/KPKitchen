import React, {useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';

import {
  ActivityIndicator,
  Alert,
  Image,
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

const FORGOT_PASSWORD_API_URL =
  'https://replete-software.com/projects/kp_admin/api/driver/forgot-password';

const ForgotPasswordScreen = ({navigation}) => {
  const {width, height} = useWindowDimensions();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] =
    useState(false);

  const isSmallScreen = width <= 360;
  const isShortScreen = height <= 700;

  const horizontalPadding =
    isSmallScreen ? 18 : 24;

  const cardWidth = Math.min(
    width - horizontalPadding * 2,
    460,
  );

  const validateEmail = emailValue => {
    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailPattern.test(
      emailValue.trim(),
    );
  };

  /**
   * Convert Laravel validation errors
   * into a readable message.
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

  /**
   * Return readable errors from Axios
   * and the Laravel API.
   */
  const getForgotPasswordErrorMessage =
    error => {
      console.log(
        '===== FORGOT PASSWORD ERROR =====',
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
        '=================================',
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
          error.response.status === 404
        ) {
          return (
            responseData?.message ||
            'No driver account was found with this email address.'
          );
        }

        if (
          error.response.status === 422
        ) {
          return (
            responseData?.message ||
            'Please enter a valid registered email address.'
          );
        }

        if (
          error.response.status === 429
        ) {
          return (
            responseData?.message ||
            'Too many reset requests. Please wait before trying again.'
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
        return 'The request timed out. Please try again.';
      }

      if (error?.request) {
        return (
          'The forgot-password server did not respond. ' +
          'Please check your internet connection and try again.'
        );
      }

      return (
        error?.message ||
        'An unexpected error occurred. Please try again.'
      );
    };

  /**
   * Validate the email, call the API,
   * and redirect to OTPVerification
   * only after a successful response.
   */
  const handleSendResetLink =
    async () => {
      if (isLoading) {
        return;
      }

      const cleanEmail = email
        .trim()
        .toLowerCase();

      if (!cleanEmail) {
        Alert.alert(
          'Email Required',
          'Please enter your registered email address.',
        );

        return;
      }

      if (
        !validateEmail(cleanEmail)
      ) {
        Alert.alert(
          'Invalid Email',
          'Please enter a valid email address.',
        );

        return;
      }

      const requestData = {
        email: cleanEmail,
      };

      try {
        setIsLoading(true);

        console.log(
          'Forgot password API:',
          FORGOT_PASSWORD_API_URL,
        );

        console.log(
          'Forgot password request:',
          requestData,
        );

        const response =
          await axios.post(
            FORGOT_PASSWORD_API_URL,
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
          'Forgot password response:',
          response.data,
        );

        const responseData =
          response.data;

        /**
         * Some Laravel APIs return HTTP 200
         * even when the request has failed.
         */
        if (
          responseData?.status ===
            false ||
          responseData?.success ===
            false
        ) {
          Alert.alert(
            'Request Failed',

            responseData?.message ||
              'Unable to send the OTP. Please try again.',
          );

          return;
        }

        /**
         * The API request succeeded.
         * Redirect directly to OTP screen.
         */
        navigation.replace(
          'Otp',
          {
            email: cleanEmail,

            message:
              responseData?.message ||
              'OTP sent successfully.',

            forgotPasswordData:
              responseData?.data ||
              null,
          },
        );
      } catch (error) {
        console.log(
          'Forgot password API error:',
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
          'Request Failed',
          getForgotPasswordErrorMessage(
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
          {/* Decorative top circle */}

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

          {/* Decorative bottom circle */}

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

          {/* Brand section */}

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
              Forgot Password?
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
              Enter your registered
              email address and we will
              send you a password reset
              OTP.
            </Text>
          </View>

          {/* Forgot password card */}

          <View
            style={[
              styles.forgotCard,
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
                We will send a verification
                OTP to your registered
                email address.
              </Text>
            </View>

            {/* Information box */}

            <View
              style={styles.infoBox}>
              <View
                style={
                  styles.infoIconContainer
                }>
                <Image
                  source={require('../assets/mail.png')}
                  style={
                    styles.infoIcon
                  }
                />
              </View>

              <Text
                style={styles.infoText}>
                Make sure you can access
                the email address associated
                with your driver account.
              </Text>
            </View>

            {/* Email input */}

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
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  style={
                    styles.textInput
                  }
                />
              </View>
            </View>

            {/* Send OTP button */}

            <Pressable
              onPress={
                handleSendResetLink
              }
              disabled={isLoading}
              style={({pressed}) => [
                styles.resetButton,

                pressed &&
                  !isLoading &&
                  styles.resetButtonPressed,

                isLoading &&
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
                    Sending OTP...
                  </Text>
                </View>
              ) : (
                <>
                  <Text
                    style={
                      styles.resetButtonText
                    }>
                    Send OTP
                  </Text>

                  <View
                    pointerEvents="none"
                    style={
                      styles.resetArrowContainer
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
                disabled={isLoading}
                onPress={() =>
                  navigation.navigate(
                    'Login',
                  )
                }
                style={({pressed}) => [
                  styles.backButton,

                  pressed &&
                    styles.pressedOpacity,
                ]}>
                <Text
                  style={
                    styles.backText
                  }>
                  Back to Login
                </Text>
              </Pressable>
            </View>
          </View>

          <Text
            style={styles.footerText}>
            For security reasons, the OTP
            may expire after a limited
            time.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;

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

  forgotCard: {
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
    marginBottom: 22,
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
    height: 56,
    color: '#15171a',
    fontSize: 15,
    paddingHorizontal: 4,
    paddingVertical: 0,
    includeFontPadding: false,
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

  resetArrowContainer: {
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
});