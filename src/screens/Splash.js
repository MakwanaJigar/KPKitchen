import React, {
  useEffect,
  useRef,
} from 'react';

import {
  Animated,
  Easing,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

/* =========================================================
 * SPLASH SCREEN
 * ========================================================= */

const Splash = ({
  navigation,
}) => {
  /* =======================================================
   * ANIMATION VALUES
   * ======================================================= */

  const logoOpacity =
    useRef(
      new Animated.Value(
        0,
      ),
    ).current;

  const logoScale =
    useRef(
      new Animated.Value(
        0.82,
      ),
    ).current;

  const logoTranslateY =
    useRef(
      new Animated.Value(
        30,
      ),
    ).current;

  const subtitleOpacity =
    useRef(
      new Animated.Value(
        0,
      ),
    ).current;

  const subtitleTranslateY =
    useRef(
      new Animated.Value(
        15,
      ),
    ).current;

  const lineScale =
    useRef(
      new Animated.Value(
        0,
      ),
    ).current;

  const loaderOpacity =
    useRef(
      new Animated.Value(
        0,
      ),
    ).current;

  const pulseScale =
    useRef(
      new Animated.Value(
        1,
      ),
    ).current;

  const loadingTranslateX =
    useRef(
      new Animated.Value(
        -60,
      ),
    ).current;

  /* =======================================================
   * ANIMATION
   * ======================================================= */

  useEffect(() => {
    /* =============================================
     * MAIN INTRO ANIMATION
     * ============================================= */

    Animated.sequence([
      /* ===========================================
       * LOGO ANIMATION
       * =========================================== */

      Animated.parallel([
        Animated.timing(
          logoOpacity,
          {
            toValue:
              1,

            duration:
              900,

            easing:
              Easing.out(
                Easing.ease,
              ),

            useNativeDriver:
              true,
          },
        ),

        Animated.spring(
          logoScale,
          {
            toValue:
              1,

            friction:
              7,

            tension:
              45,

            useNativeDriver:
              true,
          },
        ),

        Animated.timing(
          logoTranslateY,
          {
            toValue:
              0,

            duration:
              900,

            easing:
              Easing.out(
                Easing.cubic,
              ),

            useNativeDriver:
              true,
          },
        ),
      ]),

      /* ===========================================
       * LINE + SUBTITLE
       * =========================================== */

      Animated.parallel([
        Animated.timing(
          subtitleOpacity,
          {
            toValue:
              1,

            duration:
              650,

            easing:
              Easing.out(
                Easing.ease,
              ),

            useNativeDriver:
              true,
          },
        ),

        Animated.timing(
          subtitleTranslateY,
          {
            toValue:
              0,

            duration:
              650,

            easing:
              Easing.out(
                Easing.cubic,
              ),

            useNativeDriver:
              true,
          },
        ),

        Animated.timing(
          lineScale,
          {
            toValue:
              1,

            duration:
              700,

            easing:
              Easing.out(
                Easing.ease,
              ),

            useNativeDriver:
              true,
          },
        ),
      ]),

      /* ===========================================
       * LOADER
       * =========================================== */

      Animated.timing(
        loaderOpacity,
        {
          toValue:
            1,

          duration:
            500,

          easing:
            Easing.out(
              Easing.ease,
            ),

          useNativeDriver:
            true,
        },
      ),
    ]).start();

    /* =============================================
     * LOGO BREATHING / PULSE
     * ============================================= */

    const pulseAnimation =
      Animated.loop(
        Animated.sequence([
          Animated.timing(
            pulseScale,
            {
              toValue:
                1.025,

              duration:
                900,

              easing:
                Easing.inOut(
                  Easing.ease,
                ),

              useNativeDriver:
                true,
            },
          ),

          Animated.timing(
            pulseScale,
            {
              toValue:
                1,

              duration:
                900,

              easing:
                Easing.inOut(
                  Easing.ease,
                ),

              useNativeDriver:
                true,
            },
          ),
        ]),
      );

    pulseAnimation.start();

    /* =============================================
     * LOADING BAR ANIMATION
     * ============================================= */

    const loadingAnimation =
      Animated.loop(
        Animated.sequence([
          Animated.timing(
            loadingTranslateX,
            {
              toValue:
                60,

              duration:
                900,

              easing:
                Easing.inOut(
                  Easing.ease,
                ),

              useNativeDriver:
                true,
            },
          ),

          Animated.timing(
            loadingTranslateX,
            {
              toValue:
                -60,

              duration:
                900,

              easing:
                Easing.inOut(
                  Easing.ease,
                ),

              useNativeDriver:
                true,
            },
          ),
        ]),
      );

    loadingAnimation.start();

    /* =============================================
     * NAVIGATE AFTER 4.5 SECONDS
     * ============================================= */

    const timer =
      setTimeout(
        () => {
          navigation.replace(
            'Login',
          );
        },

        4500,
      );

    /* =============================================
     * CLEANUP
     * ============================================= */

    return () => {
      clearTimeout(
        timer,
      );

      pulseAnimation.stop();

      loadingAnimation.stop();
    };
  }, [
    navigation,
    logoOpacity,
    logoScale,
    logoTranslateY,
    subtitleOpacity,
    subtitleTranslateY,
    lineScale,
    loaderOpacity,
    pulseScale,
    loadingTranslateX,
  ]);

  /* =======================================================
   * UI
   * ======================================================= */

  return (
    <View
      style={
        styles.container
      }
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#A9090D"
      />

      {/* ================================================= */}
      {/* BACKGROUND DECORATION */}
      {/* ================================================= */}

      <View
        pointerEvents="none"
        style={[
          styles.circle,
          styles.circleTop,
        ]}
      />

      <View
        pointerEvents="none"
        style={[
          styles.circle,
          styles.circleBottom,
        ]}
      />

      <View
        pointerEvents="none"
        style={
          styles.goldCircle
        }
      />

      {/* ================================================= */}
      {/* MAIN CONTENT */}
      {/* ================================================= */}

      <View
        style={
          styles.content
        }
      >
        {/* ================================================= */}
        {/* LOGO */}
        {/* ================================================= */}

        <Animated.View
          style={[
            styles.logoWrapper,

            {
              opacity:
                logoOpacity,

              transform: [
                {
                  translateY:
                    logoTranslateY,
                },

                {
                  scale:
                    Animated.multiply(
                      logoScale,
                      pulseScale,
                    ),
                },
              ],
            },
          ]}
        >
          <Image
            source={require('../assets/logo.png')}
            resizeMode="contain"
            style={
              styles.logo
            }
          />
        </Animated.View>

        {/* ================================================= */}
        {/* GOLD DIVIDER */}
        {/* ================================================= */}

        <Animated.View
          style={[
            styles.goldLine,

            {
              transform: [
                {
                  scaleX:
                    lineScale,
                },
              ],
            },
          ]}
        />

        {/* ================================================= */}
        {/* TAGLINE */}
        {/* ================================================= */}

        <Animated.View
          style={{
            opacity:
              subtitleOpacity,

            transform: [
              {
                translateY:
                  subtitleTranslateY,
              },
            ],
          }}
        >
          <Text
            style={
              styles.subtitle
            }
          >
            Fresh Food • Made With Care
          </Text>
        </Animated.View>

        {/* ================================================= */}
        {/* LOADING */}
        {/* ================================================= */}

        <Animated.View
          style={[
            styles.loadingWrapper,

            {
              opacity:
                loaderOpacity,
            },
          ]}
        >
          <View
            style={
              styles.loadingTrack
            }
          >
            <Animated.View
              style={[
                styles.loadingBar,

                {
                  transform: [
                    {
                      translateX:
                        loadingTranslateX,
                    },
                  ],
                },
              ]}
            />
          </View>

          <Text
            style={
              styles.loadingText
            }
          >
            Preparing your kitchen...
          </Text>
        </Animated.View>
      </View>

      {/* ================================================= */}
      {/* BOTTOM TEXT */}
      {/* ================================================= */}

      <Animated.Text
        style={[
          styles.bottomText,

          {
            opacity:
              subtitleOpacity,
          },
        ]}
      >
        KP'S KITCHEN
      </Animated.Text>
    </View>
  );
};

export default Splash;

/* =========================================================
 * STYLES
 * ========================================================= */

const styles =
  StyleSheet.create({
    container: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#A9090D',

      overflow:
        'hidden',
    },

    /* =====================================================
     * BACKGROUND
     * ===================================================== */

    circle: {
      position:
        'absolute',

      borderWidth:
        1,

      borderColor:
        'rgba(212,164,39,0.16)',

      backgroundColor:
        'rgba(255,255,255,0.015)',
    },

    circleTop: {
      width:
        320,

      height:
        320,

      borderRadius:
        160,

      top:
        -130,

      right:
        -120,
    },

    circleBottom: {
      width:
        270,

      height:
        270,

      borderRadius:
        135,

      bottom:
        -120,

      left:
        -105,
    },

    goldCircle: {
      position:
        'absolute',

      width:
        430,

      height:
        430,

      borderRadius:
        215,

      borderWidth:
        1,

      borderColor:
        'rgba(214,162,44,0.08)',
    },

    /* =====================================================
     * CONTENT
     * ===================================================== */

    content: {
      width:
        '100%',

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        28,
    },

    /* =====================================================
     * LOGO
     * ===================================================== */

    logoWrapper: {
      width:
        '100%',

      maxWidth:
        370,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    logo: {
      width:
        330,

      height:
        245,
    },

    /* =====================================================
     * GOLD LINE
     * ===================================================== */

    goldLine: {
      width:
        125,

      height:
        2,

      borderRadius:
        10,

      backgroundColor:
        '#D6A22C',

      marginTop:
        12,
    },

    /* =====================================================
     * SUBTITLE
     * ===================================================== */

    subtitle: {
      color:
        '#FFF8EB',

      fontSize:
        14,

      fontWeight:
        '600',

      letterSpacing:
        1.1,

      textAlign:
        'center',

      marginTop:
        17,
    },

    /* =====================================================
     * LOADING
     * ===================================================== */

    loadingWrapper: {
      alignItems:
        'center',

      marginTop:
        35,
    },

    loadingTrack: {
      width:
        80,

      height:
        4,

      borderRadius:
        20,

      backgroundColor:
        'rgba(255,255,255,0.16)',

      overflow:
        'hidden',
    },

    loadingBar: {
      width:
        35,

      height:
        4,

      borderRadius:
        20,

      backgroundColor:
        '#D6A22C',
    },

    loadingText: {
      color:
        'rgba(255,255,255,0.76)',

      fontSize:
        11,

      fontWeight:
        '500',

      letterSpacing:
        0.5,

      marginTop:
        11,
    },

    /* =====================================================
     * BOTTOM
     * ===================================================== */

    bottomText: {
      position:
        'absolute',

      bottom:
        34,

      color:
        'rgba(255,255,255,0.65)',

      fontSize:
        9,

      fontWeight:
        '700',

      letterSpacing:
        2.4,
    },
  });