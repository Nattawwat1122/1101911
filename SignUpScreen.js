import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase'; // แก้ path ให้ตรงกับโปรเจกต์ของคุณ
import { doc, setDoc } from 'firebase/firestore';

const provinces = [
  "กรุงเทพมหานคร", "สมุทรปราการ", "นนทบุรี", "ปทุมธานี", "พระนครศรีอยุธยา",
  "อ่างทอง", "ลพบุรี", "สิงห์บุรี", "ชัยนาท", "สระบุรี", "ชลบุรี", "ระยอง", "จันทบุรี", "ตราด",
  "ฉะเชิงเทรา", "ปราจีนบุรี", "นครนายก", "สระแก้ว", "นครราชสีมา", "บุรีรัมย์", "สุรินทร์",
  "ศรีสะเกษ", "อุบลราชธานี", "ยโสธร", "ชัยภูมิ", "อำนาจเจริญ", "หนองบัวลำภู", "ขอนแก่น",
  "อุดรธานี", "เลย", "หนองคาย", "มหาสารคาม", "ร้อยเอ็ด", "กาฬสินธุ์", "สกลนคร", "นครพนม",
  "มุกดาหาร", "เชียงใหม่", "ลำพูน", "ลำปาง", "อุตรดิตถ์", "แพร่", "น่าน", "พะเยา", "เชียงราย",
  "แม่ฮ่องสอน", "นครสวรรค์", "อุทัยธานี", "กำแพงเพชร", "ตาก", "สุโขทัย", "พิษณุโลก", "พิจิตร",
  "เพชรบูรณ์", "ราชบุรี", "กาญจนบุรี", "สุพรรณบุรี", "นครปฐม", "สมุทรสาคร", "สมุทรสงคราม",
  "เพชรบุรี", "ประจวบคีรีขันธ์", "นครศรีธรรมราช", "กระบี่", "พังงา", "ภูเก็ต", "สุราษฎร์ธานี",
  "ระนอง", "ชุมพร", "สงขลา", "สตูล", "ตรัง", "พัทลุง", "ปัตตานี", "ยะลา", "นราธิวาส"
];

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userID, setUserID] = useState('');
  const [province, setProvince] = useState(provinces[0]);
  const [birthdate, setBirthdate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setBirthdate(selectedDate);
  };

  const handleSignUp = async () => {
    if (!userID.trim() || !email.trim() || !password) {
      Alert.alert('กรุณากรอก UserID, อีเมล และรหัสผ่าน');
      return;
    }

    if (!birthdate) {
      Alert.alert('กรุณาเลือกวันเกิด');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // 🔥 บันทึกข้อมูลผู้ใช้พร้อม userID ที่ผู้ใช้กรอกเอง
      await setDoc(doc(db, 'users', user.uid), {
        userID: userID.trim(),
        email: email.trim(),
        province,
        birthdate: birthdate.toISOString().split('T')[0], // YYYY-MM-DD
      });

      Alert.alert('สมัครสมาชิกสำเร็จ');
      navigation.replace('MainTabs');

    } catch (error) {
      console.error('Sign up error:', error);
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('อีเมลนี้ถูกใช้งานแล้ว');
      } else {
        Alert.alert('เกิดข้อผิดพลาด', error.message);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>สมัครสมาชิก</Text>

      <TextInput
        placeholder="UserID"
        style={styles.input}
        value={userID}
        onChangeText={setUserID}
      />

      <TextInput
        placeholder="อีเมล"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        placeholder="รหัสผ่าน"
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Text style={styles.label}>จังหวัด</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={province}
          onValueChange={(itemValue) => setProvince(itemValue)}
          style={{ width: '100%' }}
        >
          {provinces.map((prov) => (
            <Picker.Item key={prov} label={prov} value={prov} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>วันเกิด</Text>
      <TouchableOpacity
        onPress={() => setShowDatePicker(true)}
        style={styles.datePickerButton}
      >
        <Text>{birthdate ? birthdate.toLocaleDateString('th-TH') : 'เลือกวันเกิด'}</Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={birthdate || new Date(2000, 0, 1)}
          mode="date"
          display="default"
          onChange={onChangeDate}
          maximumDate={new Date()}
        />
      )}

      <Button title="สมัครสมาชิก" onPress={handleSignUp} color="#0984e3" />

      <TouchableOpacity onPress={() => navigation.replace('Login')}>
        <Text style={styles.link}>มีบัญชีแล้ว? เข้าสู่ระบบ</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 16, borderRadius: 8 },
  label: { marginBottom: 8, fontWeight: 'bold' },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 16 },
  datePickerButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  link: { marginTop: 20, color: '#0984e3', textAlign: 'center' },
});
