import React, {useRef, useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';

import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  // SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

const ForgotPasswordScreen = ({navigation}) => {
  const {width, height} = useWindowDimensions();

  const emailInputRef = useRef(null);

  const [email, setEmail] = useState('');
  const [emailFocused, setEmailFocused] =
    useState(false);
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

    return emailPattern.test(emailValue);
  };

  const handleSendResetLink = () => {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      Alert.alert(
        'Email required',
        'Please enter your registered email address.',
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

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);

      Alert.alert(
        'Reset Link Sent',
        'A password reset link has been sent to your email address.',
        [
          {
            text: 'Back to Login',
            onPress: () =>
              navigation.navigate('Login'),
          },
        ],
      );
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#f8f9fb"
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? 0 : 20
        }>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: horizontalPadding,
              paddingTop: isShortScreen ? 20 : 42,
              paddingBottom: 34,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          <View style={styles.page}>
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

            <View style={styles.brandSection}>
              <View
                style={[
                  styles.logoContainer,
                  {
                    width: isSmallScreen ? 74 : 86,
                    height: isSmallScreen ? 74 : 86,
                    borderRadius:
                      isSmallScreen ? 23 : 27,
                  },
                ]}>
                <Image
                  source={require('../assets/delivery-bike-light.png')}
                  resizeMode="contain"
                  style={[
                    styles.logo,
                    {
                      width:
                        isSmallScreen ? 40 : 48,
                      height:
                        isSmallScreen ? 40 : 48,
                    },
                  ]}
                />
              </View>

              <Text
                style={[
                  styles.brandTitle,
                  {
                    fontSize:
                      isSmallScreen ? 27 : 32,
                  },
                ]}>
                Forgot Password?
              </Text>

              <Text
                style={[
                  styles.brandSubtitle,
                  {
                    fontSize:
                      isSmallScreen ? 14 : 15,
                  },
                ]}>
                Enter your registered email address and
                we will send you a password reset link.
              </Text>
            </View>

            <View
              style={[
                styles.forgotCard,
                {
                  width: cardWidth,
                  padding:
                    isSmallScreen ? 18 : 24,
                  borderRadius:
                    isSmallScreen ? 24 : 28,
                },
              ]}>
              <View style={styles.cardHeader}>
                <Text
                  style={[
                    styles.cardTitle,
                    {
                      fontSize:
                        isSmallScreen ? 22 : 25,
                    },
                  ]}>
                  Reset Password
                </Text>

                <Text style={styles.cardDescription}>
                  We will send reset instructions to
                  your registered email address.
                </Text>
              </View>

              <View style={styles.infoBox}>
                <View style={styles.infoIconContainer}>
                  <Image
                    source={require('../assets/mail.png')}
                    style={styles.infoIcon}
                  />
                </View>

                <Text style={styles.infoText}>
                  Make sure you can access the email
                  address associated with your account.
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Email Address
                </Text>

                <View
                  style={[
                    styles.inputContainer,
                    emailFocused &&
                      styles.focusedInputContainer,
                  ]}>
                  <View
                    pointerEvents="none"
                    style={
                      styles.inputIconContainer
                    }>
                    <Image
                      source={require('../assets/mail.png')}
                      style={styles.inputImage}
                    />
                  </View>

                  <TextInput
                    ref={emailInputRef}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="example@email.com"
                    placeholderTextColor="#9ca3af"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    returnKeyType="done"
                    onSubmitEditing={
                      handleSendResetLink
                    }
                    onFocus={() =>
                      setEmailFocused(true)
                    }
                    onBlur={() =>
                      setEmailFocused(false)
                    }
                    style={styles.textInput}
                  />
                </View>
              </View>

              <Pressable
                onPress={handleSendResetLink}
                disabled={isLoading}
                style={({pressed}) => [
                  styles.resetButton,
                  pressed &&
                    !isLoading &&
                    styles.resetButtonPressed,
                  isLoading &&
                    styles.resetButtonDisabled,
                ]}>
                <Text
                  style={styles.resetButtonText}>
                  {isLoading
                    ? 'Sending...'
                    : 'Send Reset Link'}
                </Text>

                <View
                  pointerEvents="none"
                  style={
                    styles.resetArrowContainer
                  }>
                  <Image
                    source={require('../assets/right-arrow.png')}
                    style={styles.arrowImage}
                  />
                </View>
              </Pressable>

              <View style={styles.backRow}>
                <Text style={styles.backQuestion}>
                  Remember your password?
                </Text>

                <Pressable
                  onPress={() =>
                    navigation.navigate('Login')
                  }
                  style={({pressed}) => [
                    styles.backButton,
                    pressed &&
                      styles.pressedOpacity,
                  ]}>
                  <Text style={styles.backText}>
                    Back to Login
                  </Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.footerText}>
              For security reasons, the reset link may
              expire after a limited time.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },

  keyboardView: {
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

  focusedInputContainer: {
    backgroundColor: '#ffffff',
    borderColor: '#d00018',

    elevation: 2,

    shadowColor: '#d00018',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
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
    paddingVertical:
      Platform.OS === 'ios' ? 10 : 0,
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
    transform: [{scale: 0.985}],
  },

  resetButtonDisabled: {
    opacity: 0.65,
  },

  resetButtonText: {
    color: '#ffffff',
    fontSize: 16,
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