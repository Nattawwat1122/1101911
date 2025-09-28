import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView, TouchableOpacity, Modal, Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

import axios from 'axios';
import { getFirestore, doc, setDoc, getDocs, collection } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const db = getFirestore();

/** -----------------------
 *  API Client (Flask + Ollama)
 *  ปรับ URL ให้ตรงอุปกรณ์/สภาพแวดล้อม
 *  - Android Emulator: http://10.0.2.2:5000
 *  - iOS Simulator:    http://localhost:5000
 *  - มือถือจริง/โปรดักชัน: ใช้ IP LAN ของเครื่องที่รัน Flask
 ------------------------ */
const DEV_SERVER_URL = Platform.OS === 'ios' ? 'http://localhost:5000' : ' http://192.168.1.137:5000';
// ⚠️ แทนที่ <YOUR-LAN-IP> เป็น IP เครื่องเซิร์ฟเวอร์เวลารันบนมือถือจริง/โปรดักชัน
const PROD_SERVER_URL = 'http://<YOUR-LAN-IP>:5000';
const SERVER_URL = __DEV__ ? DEV_SERVER_URL : PROD_SERVER_URL;

const api = axios.create({
  baseURL: SERVER_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// ✅ แปลงอารมณ์ (string) เป็นคะแนน (number)
function emotionToScore(raw) {
  if (!raw) return 2; // ดีฟอลต์ = ปกติ
  const s = String(raw).toLowerCase().trim();

  // รองรับสะกด/พิมพ์ผิดที่พบบ่อย
  if (s.includes('แยj')) return 1;

  // แมปแบบชัดเจน
  const map = {
    'อารมณ์แย่มาก': 0,
    'อารมณ์แย่': 1,
    'ปกติ': 2,
    'อารมณ์ดี': 3,
    'อารมณ์ดีมาก': 4,
  };

  // จับแบบ “ขึ้นต้นด้วย” เผื่อมีคำอธิบายต่อท้าย เช่น "อารมณ์ดีมาก 😊"
  for (const key of Object.keys(map)) {
    if (s.startsWith(key)) return map[key];
  }

  // เผื่อ backend ส่งอังกฤษ
  if (s.startsWith('very bad')) return 0;
  if (s.startsWith('bad')) return 1;
  if (s.startsWith('normal') || s.startsWith('neutral')) return 2;
  if (s.startsWith('good')) return 3;
  if (s.startsWith('very good') || s.startsWith('great')) return 4;

  return 2; // fallback = ปกติ
}


export default function DiaryScreen() {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [diaryEntries, setDiaryEntries] = useState({});
  const [modalVisible, setModalVisible] = useState(false);

  const [title, setTitle] = useState('');
  const [categories, setCategories] = useState([]);
  const [content, setContent] = useState('');

  const [categoryOptions, setCategoryOptions] = useState([]); // ✅ โหลดจาก Firestore

  const navigation = useNavigation();
  const user = getAuth().currentUser;

  function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  // โหลดบันทึกของผู้ใช้
  useEffect(() => {
    if (!user) return;
    const loadEntries = async () => {
      try {
        const snap = await getDocs(collection(db, 'diaryEntries', user.uid, 'entries'));
        let data = {};
        snap.forEach((docSnap) => {
          data[docSnap.id] = docSnap.data();
        });
        setDiaryEntries(data);
      } catch (error) {
        console.error('โหลดข้อมูลผิดพลาด: ', error);
      }
    };
    loadEntries();
  }, [user]);

  // โหลดหมวดหมู่จาก Firestore (คอลเลกชัน "categories")
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const snap = await getDocs(collection(db, 'categories'));
        let data = [];
        snap.forEach((docSnap) => {
          data.push(docSnap.id); // ใช้ document id เป็นชื่อหมวด
        });
        setCategoryOptions(data);
      } catch (error) {
        console.error('โหลดหมวดหมู่ผิดพลาด: ', error);
      }
    };
    loadCategories();
  }, []);

  const onDayPress = (day) => setSelectedDate(day.dateString);

  const toggleCategory = (cat) => {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  // บันทึกไดอารี่ + เรียก /diary เพื่อวิเคราะห์ (Ollama) ก่อนเซฟลง Firestore
  const handleSave = async () => {
    if (!user) {
      Alert.alert('ยังไม่ได้ล็อกอิน', 'กรุณาเข้าสู่ระบบก่อนบันทึกไดอารี่');
      return;
    }
    if (!title.trim() || !content.trim()) {
      Alert.alert('⚠️ กรุณาใส่หัวข้อและเนื้อหา');
      return;
    }

    try {
      // 1) เรียกเซิร์ฟเวอร์วิเคราะห์อารมณ์/ความเสี่ยง
      // 1) เรียกเซิร์ฟเวอร์วิเคราะห์อารมณ์/ความเสี่ยง
      let emotion = 'วิเคราะห์ไม่ได้';
      let risk = 'ปกติ';
      try {
        const res = await api.post('/diary', { message: content });
        emotion = res?.data?.emotion || emotion;
        risk = res?.data?.risk || risk;
      } catch (e) {
        console.warn('เรียก /diary ไม่สำเร็จ:', e?.message || e);
      }

      // ✅ 1.5) คำนวนคะแนนจากอารมณ์
      const emotionScore = emotionToScore(emotion);

      // 2) สร้าง payload พร้อมผลวิเคราะห์
      const payload = {
        title,
        categories,
        content,
        emotion,       // ข้อความอารมณ์จาก AI
        emotionScore,  // ✅ คะแนนอารมณ์ที่คำนวนได้
        risk,
        createdAt: new Date().toISOString(),
        analyzedAt: new Date().toISOString(),
      };


      // 3) เซฟลง Firestore ที่ path: diaryEntries/{uid}/entries/{YYYY-MM-DD}
      await setDoc(doc(db, 'diaryEntries', user.uid, 'entries', selectedDate), payload);

      // 4) อัปเดต state ในแอป
      setDiaryEntries((prev) => ({
        ...prev,
        [selectedDate]: payload,
      }));

      // 5) เคลียร์ฟอร์ม ปิดโมดัล
      setTitle('');
      setContent('');
      setCategories([]);
      setModalVisible(false);

      Alert.alert('✅ บันทึกสำเร็จ', `บันทึกสำหรับวันที่ ${selectedDate} แล้ว`);
    } catch (error) {
      console.error('บันทึกผิดพลาด: ', error);
      Alert.alert('❌ เกิดข้อผิดพลาด', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={onDayPress}
        markedDates={{
          ...Object.keys(diaryEntries).reduce(
            (acc, date) => {
              acc[date] = {
                marked: true,
                dotColor: 'red',
                ...(date === selectedDate && { selected: true, selectedColor: 'dodgerblue' }),
              };
              return acc;
            },
            {
              [selectedDate]: { selected: true, selectedColor: 'dodgerblue' },
            }
          ),
        }}
        style={styles.calendar}
      />

      <Text style={styles.label}>บันทึกของวันที่ {selectedDate}</Text>



      <TouchableOpacity style={styles.writeButton} onPress={() => setModalVisible(true)}>
        <Icon name="create-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>เขียนบันทึก</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.libraryButton}
        onPress={() => navigation.navigate('DiaryLibrary', { diaryEntries })}
      >
        <Icon name="book" size={22} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>คลังไดอารี่</Text>
      </TouchableOpacity>

      {/* Modal เขียนบันทึก */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>✏️ เขียนบันทึก</Text>

            <TextInput
              placeholder="หัวข้อ"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
            />

            <Text style={styles.modalSubtitle}>เลือกหมวดหมู่ (สามารถเลือกได้หลายหมวด)</Text>
            <View style={styles.categoryContainer}>
              {categoryOptions.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryItem, categories.includes(cat) && styles.categoryItemSelected]}
                  onPress={() => toggleCategory(cat)}
                >
                  <Text style={[styles.categoryText, categories.includes(cat) && styles.categoryTextSelected]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={{ maxHeight: 150 }}>
              <TextInput
                multiline
                placeholder="เขียนเนื้อหาที่นี่..."
                value={content}
                onChangeText={setContent}
                style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.buttonText}>บันทึก</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.buttonText}>ยกเลิก</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ----------------------- Styles ----------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  calendar: { marginBottom: 10 },
  label: { fontSize: 16, fontWeight: '600', marginVertical: 8, textAlign: 'center' },

  writeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B4D8',
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    marginBottom: 10,
    elevation: 3,
  },
  libraryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C77DFF',
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    elevation: 3,
  },

  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  modalSubtitle: { fontSize: 16, fontWeight: '600', marginTop: 10, marginBottom: 5 },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 },
  categoryItem: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
    backgroundColor: '#f9f9f9',
  },
  categoryItemSelected: {
    backgroundColor: '#00B4D8',
    borderColor: '#00B4D8',
  },
  categoryText: { fontSize: 14, color: '#333' },
  categoryTextSelected: { color: '#fff', fontWeight: '600' },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
    fontSize: 16,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  saveButton: {
    flex: 1,
    backgroundColor: '#FF6B81',
    padding: 12,
    borderRadius: 8,
    marginRight: 5,
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 8,
    marginLeft: 5,
    alignItems: 'center',
  },
});
