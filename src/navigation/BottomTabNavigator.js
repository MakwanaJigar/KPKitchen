import React from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
// import {BlurView} from '@react-native-community/blur';

import HomeScreen from '../screens/HomeScreen';
import OrdersScreen from '../screens/OrdersScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

/* ---------------------------------
   Custom floating bottom tab bar
---------------------------------- */

const CustomTabBar = ({state, descriptors, navigation}) => {
  const insets = useSafeAreaInsets();

  const getTabIcon = (routeName, focused) => {
    if (routeName === 'Home') {
      return focused
        ? require('../assets/home-light.png')
        : require('../assets/home-dark.png');
    }

    if (routeName === 'Orders') {
      return focused
        ? require('../assets/delivery-bike-light.png')
        : require('../assets/delivery-bike-dark.png');
    }

    if (routeName === 'Profile') {
      return focused
        ? require('../assets/user-light.png')
        : require('../assets/user-dark.png');
    }

    return require('../assets/home-dark.png');
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.tabBarPosition,
        {
          bottom:
            Platform.OS === 'ios'
              ? Math.max(insets.bottom, 16)
              : 18,
        },
      ]}>
      <View style={styles.tabBarShadow}>
        <View style={styles.tabBarContainer}>
          {/* <BlurView
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={20}
            reducedTransparencyFallbackColor="#ffffff"
          /> */}

          <View style={styles.glassOverlay} />

          <View style={styles.tabsRow}>
            {state.routes.map((route, index) => {
              const focused = state.index === index;
              const {options} = descriptors[route.key];

              const iconSource = getTabIcon(
                route.name,
                focused,
              );

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              const onLongPress = () => {
                navigation.emit({
                  type: 'tabLongPress',
                  target: route.key,
                });
              };

              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={
                    focused ? {selected: true} : {}
                  }
                  accessibilityLabel={
                    options.tabBarAccessibilityLabel
                  }
                  testID={options.tabBarButtonTestID}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  android_ripple={{
                    color: 'rgba(208,0,24,0.10)',
                    borderless: false,
                  }}
                  style={({pressed}) => [
                    styles.tabButton,
                    focused && styles.activeTabButton,
                    pressed && styles.pressedTabButton,
                  ]}>
                  <Image
                    source={iconSource}
                    resizeMode="contain"
                    style={[
                      styles.tabIcon,
                      focused && styles.activeTabIcon,
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
};

/* ---------------------------------
   Bottom tab navigator
---------------------------------- */

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
      />

      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;

/* ---------------------------------
   Styles
---------------------------------- */

const styles = StyleSheet.create({
  tabBarPosition: {
    position: 'absolute',

    // Exactly 80% width and horizontally centered
    left: '10%',
    right: '10%',

    height: 70,
    zIndex: 999,
  },

  tabBarShadow: {
    flex: 1,
    borderRadius: 25,

    backgroundColor: 'transparent',

    elevation: 18,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },

  tabBarContainer: {
    flex: 1,

    borderRadius: 25,
    overflow: 'hidden',

    backgroundColor: 'rgba(255,255,255,0.55)',

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
  },

  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  tabsRow: {
    flex: 1,
    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'space-evenly',

    paddingHorizontal: 8,
    paddingVertical: 7,
  },

  tabButton: {
    flex: 1,
    height: '100%',

    marginHorizontal: 5,

    borderRadius: 18,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: 'transparent',
    overflow: 'hidden',
  },

  activeTabButton: {
    // Active tab background colour
    backgroundColor: '#d00018',

    elevation: 5,

    shadowColor: '#d00018',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 7,
  },

  pressedTabButton: {
    opacity: 0.8,
    transform: [{scale: 0.96}],
  },

  tabIcon: {
    width: 24,
    height: 24,
  },

  activeTabIcon: {
    width: 27,
    height: 27,
  },
});