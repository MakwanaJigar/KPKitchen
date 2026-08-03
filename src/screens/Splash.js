import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

const Splash = ({navigation}) => {
  console.log('Splash component rendered');

  useEffect(() => {
    console.log('Splash useEffect started');

    const timer = setTimeout(() => {
      console.log('Navigating to Home');
      navigation.replace('Login');
    }, 2000);

    return () => {
      console.log('Splash timer cleared');
      clearTimeout(timer);
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>My App</Text>

      <Text style={styles.subtitle}>
        Welcome to our application
      </Text>

      <ActivityIndicator
        size="large"
        color="#ffffff"
        style={styles.loader}
      />
    </View>
  );
};

export default Splash;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e63946',
    justifyContent: 'center',
    alignItems: 'center',
  },

  logo: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: 'bold',
  },

  subtitle: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 10,
  },

  loader: {
    marginTop: 30,
  },
});