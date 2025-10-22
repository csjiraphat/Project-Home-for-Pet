import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUser } from '../../../context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../../android/app/src/config';

interface UserData {
  id: string;
  username: string;
  email: string;
  userType: string;
}

type RootStackParamList = {
  Register: undefined;
  Home: undefined;
};

interface LoginScreenProps {
  navigation: StackNavigationProp<RootStackParamList, 'Register' | 'Home'>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { setUser } = useUser();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    try {
      const response = await fetch(API.USERS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `action=login&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
      });

      const data = await response.json();

      if (data.error) {
        if (data.errorCode === 'ACCOUNT_SUSPENDED') {
          Alert.alert(
            'บัญชีถูกระงับ',
            data.error
          );
        } else {
          Alert.alert('ข้อผิดพลาด', data.error);
        }
        return;
      }

      if (data.id && data.username && data.email && data.userType) {
        setUser(data);

        await AsyncStorage.setItem('username', data.username);
        await AsyncStorage.setItem('userType', data.userType);

        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      }
    } catch (error) {
      console.error('Error logging in:', error);
      Alert.alert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ลงชื่อเข้าใช้</Text>
      <TextInput
        style={styles.input}
        placeholder="อีเมล"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="รหัสผ่าน"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>เข้าสู่ระบบ</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.registerText}>ยังไม่มีบัญชี? ลงทะเบียน</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 44,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  registerText: {
    color: '#007bff',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default LoginScreen;