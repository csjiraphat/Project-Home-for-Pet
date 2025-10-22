import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { RadioButton } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import API from '../../../android/app/src/config';

type RegisterScreenProps = {
  navigation: StackNavigationProp<{ Login: undefined }, 'Login'>;
};

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [userType, setUserType] = useState<string>('fpet');
  const [passwordMatch, setPasswordMatch] = useState<boolean>(true);

  useEffect(() => {
    setPasswordMatch(password === confirmPassword);
  }, [password, confirmPassword]);

  const handleRegister = () => {
    if (!passwordMatch) {
      Alert.alert('ข้อผิดพลาด', 'รหัสผ่านไม่ตรงกัน');
      return;
    }

    fetch(API.USERS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `action=register&username=${username}&email=${email}&password=${password}&userType=${userType}`,
    })
      .then((response) => response.json())
      .then((data) => {

        if (data.error) {
          Alert.alert('ลงทะเบียนไม่สำเร็จ', data.error);
        } else if (data.message) {
          Alert.alert('สำเร็จ', 'ลงทะเบียนเรียบร้อยแล้ว');
          navigation.navigate('Login');
        } else {
          Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถลงทะเบียนได้');
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ลงทะเบียน</Text>
      <TextInput
        style={styles.input}
        placeholder="ชื่อผู้ใช้"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="อีเมล"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="รหัสผ่าน"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="ยืนยันรหัสผ่าน"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      {!passwordMatch && <Text style={styles.errorText}>รหัสผ่านไม่ตรงกัน</Text>}
      <View style={styles.radioContainer}>
        <Text>ประเภทการใช้งาน (กรุณาระบุ)</Text>
        <View style={styles.radioItem}>
          <RadioButton
            value="fpet"
            status={userType === 'fpet' ? 'checked' : 'unchecked'}
            onPress={() => setUserType('fpet')}
          />
          <Text>รับเลี้ยงสัตว์เลี้ยง</Text>
        </View>
        <View style={styles.radioItem}>
          <RadioButton
            value="fhome"
            status={userType === 'fhome' ? 'checked' : 'unchecked'}
            onPress={() => setUserType('fhome')}
          />
          <Text>หาบ้านให้สัตว์เลี้ยง</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={!passwordMatch}>
        <Text style={styles.buttonText}>ลงทะเบียน</Text>
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
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  radioContainer: {
    marginBottom: 15,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    backgroundColor: 'blue',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
});

export default RegisterScreen;