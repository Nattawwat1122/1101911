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
  Modal,
  SectionList
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Picker } from '@react-native-picker/picker';

const provinceSections = [
  { title: 'ภาคเหนือ', data: ["เชียงใหม่","ลำพูน","ลำปาง","อุตรดิตถ์","แพร่","น่าน","พะเยา","เชียงราย","แม่ฮ่องสอน"] },
  { title: 'ภาคกลาง', data: ["กรุงเทพมหานคร","สมุทรปราการ","นนทบุรี","ปทุมธานี","พระนครศรีอยุธยา","อ่างทอง","ลพบุรี","สิงห์บุรี","ชัยนาท","สระบุรี"] },
  { title: 'ภาคตะวันออก', data: ["ชลบุรี","ระยอง","จันทบุรี","ตราด","ฉะเชิงเทรา","ปราจีนบุรี","นครนายก","สระแก้ว"] },
  { title: 'ภาคตะวันตก', data: ["กาญจนบุรี","ราชบุรี","สุพรรณบุรี","นครปฐม","สมุทรสาคร","สมุทรสงคราม","เพชรบุรี","ประจวบคีรีขันธ์"] },
  { title: 'ภาคตะวันออกเฉียงเหนือ', data: ["นครราชสีมา","บุรีรัมย์","สุรินทร์","ศรีสะเกษ","อุบลราชธานี","ยโสธร","ชัยภูมิ","อำนาจเจริญ","หนองบัวลำภู","ขอนแก่น","อุดรธานี","เลย","หนองคาย","มหาสารคาม","ร้อยเอ็ด","กาฬสินธุ์","สกลนคร","นครพนม","มุกดาหาร"] },
  { title: 'ภาคใต้', data: ["นครศรีธรรมราช","กระบี่","พังงา","ภูเก็ต","สุราษฎร์ธานี","ระนอง","ชุมพร","สงขลา","สตูล","ตรัง","พัทลุง","ปัตตานี","ยะลา","นราธิวาส"] }
];

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState('ชาย');
  const [province, setProvince] = useState('');
  const [birthdate, setBirthdate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [provinceModal, setProvinceModal] = useState(false);
  const [search, setSearch] = useState('');

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setBirthdate(selectedDate);
  };

  const filteredSections = provinceSections.map(section => ({
    title: section.title,
    data: section.data.filter(p => p.includes(search))
  })).filter(section => section.data.length > 0);

  const handleSignUp = async () => {
    if (!username.trim() || !email.trim() || !password) {
      Alert.alert('กรุณากรอก Username, อีเมล และรหัสผ่าน');
      return;
    }
    if (!birthdate) {
      Alert.alert('กรุณาเลือกวันเกิด');
      return;
    }
    if (!province) {
      Alert.alert('กรุณาเลือกจังหวัด');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      const userRef = doc(db, 'users', user.uid);

      await setDoc(userRef, {
        username: username.trim(),
        email: email.trim(),
        gender,
        birthdate: birthdate.toISOString().split('T')[0],
        province,
        totalScore: 0,
        level: 1,
        status: "online",
        lastActive: serverTimestamp(),
        lastAssessment: null,
        selectedInterests: []
      });

      // ตรวจสอบสถานะผู้ใช้หลังสมัคร
      const userSnap = await getDoc(userRef);
      const data = userSnap.data();

      if (!data.lastAssessment) {
        navigation.replace("Assessment");
      } else if (!data.selectedInterests || data.selectedInterests.length === 0) {
        navigation.replace("Interests");
      } else {
        navigation.replace("MainTabs");
      }

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
        placeholder="ชื่อผู้ใช้"
        style={styles.input}
        value={username}
        onChangeText={setUsername}
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

      <Text style={styles.label}>เพศ</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={gender}
          onValueChange={setGender}
          style={{ width: '100%' }}
        >
          <Picker.Item label="ชาย" value="ชาย" />
          <Picker.Item label="หญิง" value="หญิง" />
          <Picker.Item label="อื่นๆ" value="อื่นๆ" />
        </Picker>
      </View>

      <Text style={styles.label}>จังหวัด</Text>
      <TouchableOpacity
        onPress={() => setProvinceModal(true)}
        style={styles.datePickerButton}
      >
        <Text>{province || 'เลือกจังหวัด'}</Text>
      </TouchableOpacity>

      <Modal visible={provinceModal} animationType="slide">
        <View style={{flex:1, padding:16}}>
          <TextInput
            placeholder="ค้นหาจังหวัด..."
            style={{borderWidth:1, borderColor:'#ccc', padding:8, borderRadius:8, marginBottom:16}}
            value={search}
            onChangeText={setSearch}
          />
          <SectionList
            sections={filteredSections}
            keyExtractor={(item, index) => item+index}
            renderItem={({item}) => (
              <TouchableOpacity
                onPress={() => { setProvince(item); setProvinceModal(false); setSearch(''); }}
                style={{padding:12, borderBottomWidth:1, borderColor:'#eee'}}
              >
                <Text>{item}</Text>
              </TouchableOpacity>
            )}
            renderSectionHeader={({section: {title}}) => (
              <Text style={{fontWeight:'bold', fontSize:16, marginTop:12}}>{title}</Text>
            )}
          />
          <Button title="ปิด" onPress={() => setProvinceModal(false)} />
        </View>
      </Modal>

      <Text style={styles.label}>วันเกิด</Text>
      <TouchableOpacity
        onPress={() => setShowDatePicker(true)}
        style={styles.datePickerButton}
      >
        <Text>{birthdate ? birthdate.toLocaleDateString('th-TH') : 'เลือกวันเกิด'}</Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={birthdate || new Date(2000,0,1)}
          mode="date"
          display="default"
          onChange={onChangeDate}
          maximumDate={new Date()}
        />
      )}

    

      <TouchableOpacity style={styles.loginButton} onPress={handleSignUp}>
                <Text style={styles.loginButtonText}>เข้าสู่ระบบ</Text>
              </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.replace('Login')}>
        <Text style={styles.link}>มีบัญชีแล้ว? เข้าสู่ระบบ</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 , backgroundColor: '#FFC0CB'},
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#f9afd4ff', padding: 12, marginBottom: 16, borderRadius: 8 ,backgroundColor: 'rgba(255, 255, 255, 0.9)'},
  label: { marginBottom: 8, fontWeight: 'bold' },
  pickerContainer: { borderWidth: 1, borderColor: '#f9afd4ff', borderRadius: 8, marginBottom: 16 ,backgroundColor: 'rgba(255, 255, 255, 0.9)'},
  datePickerButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#f9afd4ff',
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)'
  },
  link: { marginTop: 20, color: '#000000ff', textAlign: 'center' },
  // ✅ 
  loginButton: { 
    backgroundColor: '#ff69b4', 
    borderRadius: 8,
    paddingVertical: 14,
    marginVertical: 10,
    // --- ส่วนของเงา ---
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    // -------------------
  },
  loginButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
