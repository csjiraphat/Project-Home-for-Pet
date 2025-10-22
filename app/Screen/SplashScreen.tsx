// app/Screen/SplashScreen.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  StatusBar,
  Image,         
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const BG_START = '#F4F5FF';
const BG_END   = '#FFFFFF';

export default function SplashScreen() {
  const navigation = useNavigation<any>();
  const opacity = useRef(new Animated.Value(0)).current;
  const bg = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(850),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 700, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(bg,      { toValue: 1, duration: 700, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      ]),
    ]).start(() => {
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    });
  }, [navigation, opacity, bg]);

  const containerStyle = {
    ...styles.container,
    backgroundColor: bg.interpolate({
      inputRange: [0, 1],
      outputRange: [BG_START, BG_END],
    }),
  };

  return (
    <Animated.View style={containerStyle}>
      {Platform.OS === 'android' && <View style={{ height: StatusBar.currentHeight || 0 }} />}

      <Animated.View style={[styles.center, { opacity }]}>
        {/* ✅ ใช้รูป splash.png แทนวงกลม + emoji */}
        <Image
          source={require('../../assets/splash.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />

        <Text style={styles.title}>Home For Pet</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  logoImage: {
    width: 200,
    height: 200,
  },
  title: { marginTop: 18, fontSize: 24, fontWeight: '800', color: '#111' },
});
