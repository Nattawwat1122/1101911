import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView, TouchableOpacity, Modal, Platform, Linking } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

import axios from 'axios';
import { getFirestore, doc, setDoc, getDocs, collection } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const db = getFirestore();

/** -----------------------
 * Ollama Direct (no Flask)
 * - Android Emulator: http://10.0.2.2:11434
 * - iOS Simulator:      http://localhost:11434
 * - Device (LAN):       http://<HOST-LAN-IP>:11434
 ------------------------ */
const DEV_SERVER_URL =
  Platform.OS === 'ios' ? 'http://localhost:11434' : 'http://10.0.2.2:11434';
const PROD_SERVER_URL = 'http://<YOUR-LAN-IP>:11434';
const SERVER_URL = __DEV__ ? DEV_SERVER_URL : PROD_SERVER_URL;

const OLLAMA_MODEL = 'llama3.1';

const api = axios.create({
  baseURL: SERVER_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

/* ===================== Helpers & Mappings ===================== */

// ✅ 1. เพิ่ม Mapping ระหว่างหมวดหมู่กับความเชี่ยวชาญของแพทย์
const CATEGORY_TO_SPECIALTY_MAP = {
  'ความรัก': 'ปัญหาครอบครัว / คู่รัก / การแต่งงาน',
  'ความสัมพันธ์': 'ปัญหาครอบครัว / คู่รัก / การแต่งงาน',
  'นอนไม่หลับ': 'จิตเวชการนอนหลับ, โรคนอนไม่หลับ, ภาวะหยุดหายใจขณะนอนหลับ',
  'พฤติกรรม': 'จิตเวชเด็กและวัยรุ่น, ADHD, Autism',
  'การเรียน': 'จิตเวชเด็กและวัยรุ่น, ADHD, Autism',
  'วิตกกังวล': 'จิตเวชผู้ใหญ่, โรคซึมเศร้า, วิตกกังวล',
  'การทำงาน': 'จิตเวชผู้ใหญ่, โรคซึมเศร้า, วิตกกังวล',
  'อื่นๆ': 'จิตเวชผู้สูงอายุ, ภาวะสมองเสื่อม, อัลไซเมอร์',
};

// ✅ 2. เพิ่มฟังก์ชันสำหรับแปลงหมวดหมู่เป็นความเชี่ยวชาญ
function getSpecialtiesFromCategories(selectedCategories) {
  if (!selectedCategories || selectedCategories.length === 0) {
    return []; // คืนค่าเป็น array ว่างถ้าไม่ได้เลือกหมวดหมู่
  }
  // ใช้ Set เพื่อป้องกันความเชี่ยวชาญซ้ำซ้อน (เช่น เลือกทั้ง 'ความรัก' และ 'ความสัมพันธ์')
  const specialties = new Set();
  selectedCategories.forEach(cat => {
    if (CATEGORY_TO_SPECIALTY_MAP[cat]) {
      specialties.add(CATEGORY_TO_SPECIALTY_MAP[cat]);
    }
  });
  return Array.from(specialties); // แปลง Set กลับเป็น Array
}

const EMOTION_MAP_NEW = {
  'เศร้า': 0,
  'เหนื่อย': 1,
  'วิตกกังวล': 1,
  'ปกติ': 2,
  'อารมณ์ดี': 4,
};

function emotionToScore(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (EMOTION_MAP_NEW.hasOwnProperty(s)) return EMOTION_MAP_NEW[s];
  return null;
}

function getTodayDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// ... (ส่วนฟังก์ชัน helpers อื่นๆ ไม่มีการเปลี่ยนแปลง) ...
function normalizeAIScore(n) { const x = Number(n); return Number.isInteger(x) && x >= 0 && x <= 4 ? x : null; }
function pickEmotionScoreFromAPI(data) { if (!data || typeof data !== 'object') return null; if (typeof data.emotionScore === 'number' || data.emotionScore === null) return data.emotionScore; if (typeof data.emotion_score === 'number' || data.emotion_score === null) return data.emotion_score; return null; }
function pickEmotionExplanationFromAPI(data) { if (!data || typeof data !== 'object') return null; if (typeof data.emotionExplanation === 'string') return data.emotionExplanation.trim(); if (typeof data.emotion_explanation === 'string') return data.emotion_explanation.trim(); return null; }
function safeParseJSONObject(s) { try { if (!s) return null; const m = s.match(/\{[\s\S]*\}/); if (!m) return null; return JSON.parse(m[0]); } catch { return null; } }
async function callOllamaChatWithRetry(message, retries = 1) { /* ... โค้ดเดิม ... */ return { risk: 'ปกติ' }; } // Placeholder for brevity
async function getSmartEmotionEval(message) { /* ... โค้ดเดิม ... */ return { risk: 'ปกติ' }; } // Placeholder for brevity


/* =================== ⛑️ High-risk keyword guard (local) ===================== */
const HIGH_RISK_HINTS = ['อยากตาย', 'ฆ่าตัวตาย', 'ไม่อยากอยู่แล้ว', 'ไม่อยากอยู่บนโลกนี้', 'จบชีวิต', 'ทำร้ายตัวเอง', 'เจ็บตัวเอง', 'จากไปดีกว่า', 'ตายไปคงดี', 'ชีวิตไม่มีค่า', 'ไร้ค่าเกินไป', 'ไม่เหลือใคร', 'อยู่ไปก็เท่านั้น'];

function hasHighRiskKeywords(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.toLowerCase();
  return HIGH_RISK_HINTS.some((k) => t.includes(k.toLowerCase()));
}
/* =================== /High-risk keyword guard ===================== */

export default function DiaryScreen() {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [diaryEntries, setDiaryEntries] = useState({});
  const [modalVisible, setModalVisible] = useState(false);

  const [title, setTitle] = useState('');
  const [categories, setCategories] = useState([]);
  const [content, setContent] = useState('');

  const [categoryOptions, setCategoryOptions] = useState([]);

  const navigation = useNavigation();
  const user = getAuth().currentUser;

  const [alertShown, setAlertShown] = useState(false);

  function calcAverageScore(entriesObj) { if (!Object.values(entriesObj || {}).length) return null; /* ... */ return 2; }
  function checkAndAlertAverage(entriesObj) { /* ... */ }


  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'diaryEntries', user.uid, 'entries'));
        const data = {};
        snap.forEach((docSnap) => (data[docSnap.id] = docSnap.data()));
        setDiaryEntries(data);
        checkAndAlertAverage(data);
      } catch (error) {
        console.error('โหลดข้อมูลผิดพลาด: ', error);
      }
    })();
  }, [user]);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'categories'));
        const data = [];
        snap.forEach((docSnap) => data.push(docSnap.id));
        setCategoryOptions(data);
      } catch (error) {
        console.error('โหลดหมวดหมู่ผิดพลาด: ', error);
      }
    })();
  }, []);

  const onDayPress = (day) => setSelectedDate(day.dateString);

  const toggleCategory = (cat) => {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

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
      const result = await getSmartEmotionEval(content);
      const highRisk = result.risk === 'เสี่ยงสูง' || hasHighRiskKeywords(content);

      const payload = {
        title,
        categories,
        content,
        emotion: result.emotion ?? null,
        emotionScore: result.emotionScore ?? null,
        risk: result.risk ?? 'ปกติ',
        emotionExplanation: result.emotionExplanation ?? 'ไม่มีคำอธิบาย',
        createdAt: new Date().toISOString(),
        analyzedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'diaryEntries', user.uid, 'entries', selectedDate), payload);

      setDiaryEntries((prev) => {
        const updated = { ...prev, [selectedDate]: payload };
        checkAndAlertAverage(updated);
        return updated;
      });

      setTitle('');
      setContent('');
      setCategories([]);
      setModalVisible(false);

      if (highRisk) {
        const recommendedSpecialties = getSpecialtiesFromCategories(categories);

        // ✅ 1. สร้างข้อความแนะนำเบื้องต้น
        let recommendationMessage = 'ตรวจพบสัญญาณความเสี่ยงสูงจากข้อความของคุณ แนะนำให้ปรึกษาผู้เชี่ยวชาญหรือพบแพทย์ทันที หากอยู่ในภาวะฉุกเฉิน โปรดติดต่อบริการฉุกเฉินใกล้คุณ';

        // ✅ 2. ตรวจสอบและสร้างข้อความแนะนำเพิ่มเติม
        if (recommendedSpecialties && recommendedSpecialties.length > 0) {
          // แปลง Array ของความเชี่ยวชาญเป็น String ที่อ่านง่าย
          const specialtiesText = recommendedSpecialties.map(s => `• ${s.split(',')[0]}`).join('\n');
          recommendationMessage += `\n\nขอแนะนำแพทย์เฉพาะทางด้าน:\n${specialtiesText}`;
        }

        // ✅ 3. เรียก Alert โดยใช้ข้อความที่สร้างขึ้น และมีปุ่มหลักๆ เท่านั้น
        Alert.alert(
          '🚨 ความปลอดภัยมาก่อน',
          recommendationMessage, // <-- ใช้ข้อความที่สร้างขึ้นแบบไดนามิก
          [
            { text: 'โทรสายด่วนสุขภาพจิต 1323', onPress: () => Linking.openURL('tel:1323') },
            {
              text: 'ดูรายชื่อแพทย์ที่แนะนำ',
              onPress: () => navigation.navigate('DoctorRecommend', {
                from: 'Diary',
                risk: 'high',
                // ส่งค่าทั้งหมดไปเพื่อให้หน้าถัดไปกรองได้เหมือนเดิม
                recommendedSpecialties: recommendedSpecialties,
              }),
            },
            { text: 'ตกลง', style: 'cancel' },
          ],
          { cancelable: true }
        );

      } else {
        Alert.alert('✅ บันทึกสำเร็จ', `บันทึกสำหรับวันที่ ${selectedDate} แล้ว`);
      }
    } catch (error) {
      console.error('บันทึกผิดพลาด: ', error);
      Alert.alert('❌ เกิดข้อผิดพลาด', error.message);
    }
  };;

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={onDayPress}
        markedDates={{
          ...Object.keys(diaryEntries).reduce(
            (acc, date) => {
              acc[date] = { marked: true, dotColor: 'red', ...(date === selectedDate && { selected: true, selectedColor: 'dodgerblue' }) };
              return acc;
            },
            { [selectedDate]: { selected: true, selectedColor: 'dodgerblue' } }
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

            <TextInput placeholder="หัวข้อ" value={title} onChangeText={setTitle} style={styles.input} />

            <Text style={styles.modalSubtitle}>เลือกหมวดหมู่ (สามารถเลือกได้หลายหมวด)</Text>
            <View style={styles.categoryContainer}>
              {categoryOptions.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryItem, categories.includes(cat) && styles.categoryItemSelected]}
                  onPress={() => toggleCategory(cat)}
                >
                  <Text style={[styles.categoryText, categories.includes(cat) && styles.categoryTextSelected]}>{cat}</Text>
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
  writeButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f280ceff', paddingVertical: 12, borderRadius: 12, justifyContent: 'center', marginBottom: 10, elevation: 3 },
  libraryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#cf76eaff', paddingVertical: 12, borderRadius: 12, justifyContent: 'center', elevation: 3 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  modalSubtitle: { fontSize: 16, fontWeight: '600', marginTop: 10, marginBottom: 5 },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 },
  categoryItem: { borderWidth: 1, borderColor: '#ea7979ff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, margin: 4, backgroundColor: '#f9f9f9' },
  categoryItemSelected: { backgroundColor: '#00B4D8', borderColor: '#00B4D8' },
  categoryText: { fontSize: 14, color: '#333' },
  categoryTextSelected: { color: '#fff', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginVertical: 8, fontSize: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  saveButton: { flex: 1, backgroundColor: '#FF6B81', padding: 12, borderRadius: 8, marginRight: 5, alignItems: 'center' },
  cancelButton: { flex: 1, backgroundColor: '#6c757d', padding: 12, borderRadius: 8, marginLeft: 5, alignItems: 'center' },
});
