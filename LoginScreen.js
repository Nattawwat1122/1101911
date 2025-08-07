import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    signInWithEmailAndPassword(auth, email.trim(), password)
      .then(() => {
        navigation.replace('MainTabs');
      })
      .catch((error) => {
        console.error('Login error:', error);
        Alert.alert('เข้าสู่ระบบล้มเหลว', error.message);
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>เข้าสู่ระบบ</Text>
      <TextInput
        placeholder="อีเมล"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        placeholder="รหัสผ่าน"
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="เข้าสู่ระบบ" onPress={handleLogin} color="#0984e3" />
      <TouchableOpacity onPress={() => navigation.replace('SignUp')}>
        <Text style={styles.link}>ยังไม่มีบัญชี? สมัครสมาชิก</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 16, borderRadius: 8 },
  link: { marginTop: 20, color: '#0984e3', textAlign: 'center' },
});
