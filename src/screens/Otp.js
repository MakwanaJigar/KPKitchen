import React, {useState} from 'react';

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

import {SafeAreaView} from 'react-native-safe-area-context';
import axios from 'axios';

const VERIFY_OTP_API_URL =
  'https://replete-software.com/projects/kp_admin/api/driver/verify-forgot-password-otp';

const OTP_LENGTH = 6;

const OTP = ({navigation, route}) => {
  const {width, height} = useWindowDimensions();

  const email =
    route?.params?.email?.trim()?.toLowerCase() || '';

  const [otp, setOtp] = useState('');
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

  /**
   * Hide part of the email address.
   */
  const maskEmail = emailAddress => {
    if (!emailAddress) {
      return 'your registered email';
    }

    const parts = emailAddress.split('@');

    if (parts.length !== 2) {
      return emailAddress;
    }

    const username = parts[0];
    const domain = parts[1];

    if (username.length <= 1) {
      return `${username.charAt(0)}***@${domain}`;
    }

    if (username.length === 2) {
      return `${username.charAt(0)}***@${domain}`;
    }

    return `${username.slice(0, 2)}***@${domain}`;
  };

  /**
   * Allow only numeric OTP characters.
   */
  const handleOtpChange = value => {
    const numbersOnly = String(value).replace(
      /[^0-9]/g,
      '',
    );

    setOtp(
      numbersOnly.slice(0, OTP_LENGTH),
    );
  };

  /**
   * Convert Laravel validation errors into
   * a readable message without Array.flat().
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
   * Convert Axios and Laravel errors into
   * a readable message.
   */
  const getOtpErrorMessage = error => {
    console.log(
      '========== VERIFY OTP ERROR ==========',
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
      '======================================',
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
          'No password reset request was found for this email address.'
        );
      }

      if (
        error.response.status === 422
      ) {
        return (
          responseData?.message ||
          'Please enter a valid six-digit OTP.'
        );
      }

      if (
        error.response.status === 429
      ) {
        return (
          responseData?.message ||
          'Too many verification attempts. Please wait and try again.'
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
      return 'The OTP verification request timed out. Please try again.';
    }

    if (error?.request) {
      return (
        'The OTP verification server did not respond. ' +
        'Please check your internet connection and try again.'
      );
    }

    return (
      error?.message ||
      'An unexpected error occurred while verifying the OTP.'
    );
  };

  /**
   * Verify the OTP using the API.
   */
  const handleVerifyOtp = async () => {
    if (isLoading) {
      return;
    }

    const cleanOtp = otp.trim();

    if (!email) {
      Alert.alert(
        'Email Missing',
        'Your email address was not received. Please return to the forgot-password screen and try again.',
        [
          {
            text: 'Go Back',
            onPress: () => {
              navigation.goBack();
            },
          },
        ],
      );

      return;
    }

    if (!cleanOtp) {
      Alert.alert(
        'OTP Required',
        'Please enter the OTP sent to your registered email address.',
      );

      return;
    }

    if (
      cleanOtp.length !== OTP_LENGTH
    ) {
      Alert.alert(
        'Invalid OTP',
        `Please enter the complete ${OTP_LENGTH}-digit OTP.`,
      );

      return;
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      Alert.alert(
        'Invalid OTP',
        'The OTP must contain only numbers.',
      );

      return;
    }

    const requestData = {
      email,
      otp: cleanOtp,
    };

    try {
      setIsLoading(true);

      console.log(
        'Verify OTP API:',
        VERIFY_OTP_API_URL,
      );

      console.log(
        'Verify OTP request:',
        requestData,
      );

      const response = await axios.post(
        VERIFY_OTP_API_URL,
        requestData,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type':
              'application/json',
          },

          timeout: 20000,
        },
      );

      console.log(
        'Complete verify OTP response:',
        response.data,
      );

      const responseData =
        response.data;

      /**
       * Some APIs return HTTP 200 while
       * success or status is false.
       */
      if (
        responseData?.status === false ||
        responseData?.success === false
      ) {
        Alert.alert(
          'Verification Failed',
          responseData?.message ||
            'The OTP is invalid or has expired.',
        );

        return;
      }

      /**
       * Extract a reset token when the API
       * returns one.
       */
      const resetToken =
        responseData?.reset_token ||
        responseData?.resetToken ||
        responseData?.token ||
        responseData?.data?.reset_token ||
        responseData?.data?.resetToken ||
        responseData?.data?.token ||
        '';

      /**
       * OTP verified successfully.
       * Replace the OTP screen with ResetPassword.
       */
      navigation.replace(
        'ResetPassword',
        {
          email,
          otp: cleanOtp,
          resetToken,

          verifyOtpMessage:
            responseData?.message ||
            'OTP verified successfully.',

          verifyOtpData:
            responseData?.data || null,
        },
      );
    } catch (error) {
      console.log(
        'Verify OTP API error:',
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

      Alert.alert(
        'Verification Failed',
        getOtpErrorMessage(error),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeEmail = () => {
    if (!isLoading) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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
              Verify OTP
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
              Enter the verification code
              sent to your registered email
              address.
            </Text>
          </View>

          {/* OTP card */}

          <View
            style={[
              styles.otpCard,
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
                Enter Verification Code
              </Text>

              <Text
                style={
                  styles.cardDescription
                }>
                We sent a six-digit OTP
                to:
              </Text>

              <Text
                style={styles.emailText}>
                {maskEmail(email)}
              </Text>
            </View>

            {/* OTP information */}

            <View
              style={styles.infoBox}>
              <View
                style={
                  styles.infoIconContainer
                }>
                <Image
                  source={require('../assets/mail.png')}
                  style={styles.infoIcon}
                />
              </View>

              <Text
                style={styles.infoText}>
                Check your inbox and enter
                the OTP before it expires.
              </Text>
            </View>

            {/* OTP input */}

            <View
              style={styles.inputGroup}>
              <Text
                style={styles.inputLabel}>
                Six-Digit OTP
              </Text>

              <View
                style={
                  styles.otpInputContainer
                }>
                <TextInput
                  value={otp}
                  onChangeText={
                    handleOtpChange
                  }
                  placeholder="000000"
                  placeholderTextColor="#b8bdc6"
                  keyboardType="number-pad"
                  maxLength={OTP_LENGTH}
                  editable={!isLoading}
                  selectionColor="#d00018"
                  style={styles.otpInput}
                />
              </View>

              <View
                style={styles.otpProgress}>
                {Array.from({
                  length: OTP_LENGTH,
                }).map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.otpProgressDot,

                      index < otp.length &&
                        styles.otpProgressDotActive,
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Verify button */}

            <Pressable
              onPress={handleVerifyOtp}
              disabled={isLoading}
              style={({pressed}) => [
                styles.verifyButton,

                pressed &&
                  !isLoading &&
                  styles.verifyButtonPressed,

                isLoading &&
                  styles.verifyButtonDisabled,
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
                    Verifying...
                  </Text>
                </View>
              ) : (
                <>
                  <Text
                    style={
                      styles.verifyButtonText
                    }>
                    Verify OTP
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

            {/* Change email */}

            <View style={styles.backRow}>
              <Text
                style={
                  styles.backQuestion
                }>
                Wrong email address?
              </Text>

              <Pressable
                disabled={isLoading}
                onPress={handleChangeEmail}
                style={({pressed}) => [
                  styles.backButton,

                  pressed &&
                    !isLoading &&
                    styles.pressedOpacity,
                ]}>
                <Text
                  style={styles.backText}>
                  Change Email
                </Text>
              </Pressable>
            </View>
          </View>

          <Text
            style={styles.footerText}>
            Never share your OTP with
            anyone.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default OTP;

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

  otpCard: {
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

  emailText: {
    color: '#d00018',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    marginTop: 4,
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

  otpInputContainer: {
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6f7f9',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    paddingHorizontal: 16,
  },

  otpInput: {
    width: '100%',
    height: 66,
    color: '#15171a',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 12,
    paddingHorizontal: 12,
    paddingVertical: 0,
    includeFontPadding: false,
  },

  otpProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  otpProgressDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#d9dde4',
    marginHorizontal: 4,
  },

  otpProgressDotActive: {
    backgroundColor: '#d00018',
  },

  verifyButton: {
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

  verifyButtonPressed: {
    opacity: 0.88,

    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  verifyButtonDisabled: {
    opacity: 0.65,
  },

  verifyButtonText: {
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
});