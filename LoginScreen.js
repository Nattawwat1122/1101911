import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      // อัปเดต status = online
      await setDoc(userRef, { 
        status: "online", 
        lastActive: serverTimestamp(), 
        email: user.email 
      }, { merge: true });

      if (!userSnap.exists()) {
        await setDoc(userRef, { lastAssessment: null }, { merge: true });
        navigation.replace("Assessment");
        return;
      }

      const data = userSnap.data();
      if (!data.lastAssessment) {
        navigation.replace("Assessment");
      } else if (!data.selectedInterests || data.selectedInterests.length === 0) {
        navigation.replace("Interests");
      } else {
        navigation.replace("MainTabs");
      }

    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('เข้าสู่ระบบล้มเหลว', error.message);
    }
  };

  // ฟังก์ชัน logout (อัปเดต status offline ก่อน)
  const handleLogout = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { status: "offline", lastActive: serverTimestamp() });
        await signOut(auth);
      }
      navigation.replace('Login');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('ไม่สามารถออกจากระบบได้', error.message);
    }
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
