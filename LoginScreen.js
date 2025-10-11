import React, { useState } from 'react';
import { 
  View, TextInput, Button, Text, StyleSheet, Alert, 
  TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView ,Image
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth'; 
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { sendPasswordResetEmail } from "firebase/auth";

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

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("กรุณากรอกอีเมลก่อนเพื่อรีเซ็ตรหัสผ่าน");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert("ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว");
    } catch (error) {
      console.error("Reset password error:", error);
      Alert.alert("ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่าน", error.message);
    }
  };

 return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView 
        contentContainerStyle={styles.container} 
        keyboardShouldPersistTaps="handled"
      >
        <Image 
          source={require('../assets/logoHope.jpg')} 
          style={{ 
            width: 150, 
            height: 150, 
            marginBottom: 20, 
            alignSelf: 'center', 
            borderRadius: 40, 
            shadowColor: '#000', 
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.2, 
            shadowRadius: 5,
            elevation: 5,
          }} 
        />
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
        
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>เข้าสู่ระบบ</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Forgot')}>
          <Text style={styles.link}>ลืมรหัสผ่าน?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.replace('SignUp')}>
          <Text style={styles.link}>ยังไม่มีบัญชี? สมัครสมาชิก</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    backgroundColor: '#FFC0CB',
    flexGrow: 1, 
    justifyContent: 'center', 
    padding: 24
  },
  header: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#f9afd4ff', 
    padding: 12, 
    marginBottom: 16, 
    borderRadius: 8 ,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  link: { 
    marginTop: 16, 
    color: '#000000ff', 
    textAlign: 'center' 
  }, 
  loginButton: { 
    backgroundColor: '#ff69b4', 
    borderRadius: 8,
    paddingVertical: 14,
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loginButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
