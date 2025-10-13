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
const PROD_SERVER_URL = 'http://<YOUR-LAN-IP>:11434'; // <-- อย่าลืมเปลี่ยน IP ถ้าทดสอบบนเครื่องจริง
const SERVER_URL = __DEV__ ? DEV_SERVER_URL : PROD_SERVER_URL;

const OLLAMA_MODEL = 'llama3.1';

const api = axios.create({
  baseURL: SERVER_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

/* ===================== Helpers & Mappings ===================== */

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

function getSpecialtiesFromCategories(selectedCategories) {
  if (!selectedCategories || selectedCategories.length === 0) {
    return [];
  }
  const specialties = new Set();
  selectedCategories.forEach(cat => {
    if (CATEGORY_TO_SPECIALTY_MAP[cat]) {
      specialties.add(CATEGORY_TO_SPECIALTY_MAP[cat]);
    }
  });
  return Array.from(specialties);
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

function normalizeAIScore(n) {
  const x = Number(n);
  return Number.isInteger(x) && x >= 0 && x <= 4 ? x : null;
}

function pickEmotionScoreFromAPI(data) {
  if (!data || typeof data !== 'object') return null;
  if (typeof data.emotionScore === 'number' || data.emotionScore === null) return data.emotionScore;
  if (typeof data.emotion_score === 'number' || data.emotion_score === null) return data.emotion_score;
  return null;
}

function pickEmotionExplanationFromAPI(data) {
  if (!data || typeof data !== 'object') return null;
  if (typeof data.emotionExplanation === 'string') return data.emotionExplanation.trim();
  if (typeof data.emotion_explanation === 'string') return data.emotion_explanation.trim();
  return null;
}

function safeParseJSONObject(s) {
  try {
    if (!s) return null;
    const m = s.match(/\{[\s\S]*\}/);
    if (!m) return null;
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

/* ===================== Ollama /api/chat ===================== */
async function callOllamaChatWithRetry(message, retries = 1) {
  let lastErr;
  const prompt = `
คุณคือผู้ช่วยวิเคราะห์อารมณ์ ให้ตอบเป็น JSON เท่านั้น (ห้ามมีคำบรรยายก่อน/หลัง)
วิเคราะห์จาก "ความหมาย/รูปประโยค/บริบท" ของข้อความด้านล่างเท่านั้น
ห้ามใช้การจับคีย์เวิร์ดตรงตัว และห้ามตอบสิ่งอื่นนอกจาก JSON

ข้อความบันทึก:
<<<
${message}
>>>

ให้ตอบ JSON ที่มีคีย์ดังนี้:
{
  "risk": "เสี่ยงสูง" | "เสี่ยงต่ำ" | "ปกติ",
  "emotion": "เศร้า" | "วิตกกังวล" | "เหนื่อย" | "ปกติ" | "อารมณ์ดี" | null,
  "emotion_score": 0 | 1 | 2 | 3 | 4 | null,
  "emotion_explanation": "สรุปเหตุผลเชิงอธิบาย 1–3 ประโยค อธิบายว่าทำไมถึงได้ emotion นี้"
}

กติกา:
- วิเคราะห์จากความหมาย ไม่ใช่จากคำตรงตัว
- Mapping คะแนน:
    เศร้า = 0, วิตกกังวล = 1, เหนื่อย = 2, ปกติ = 3, อารมณ์ดี = 4
- ใช้ค่า null เฉพาะกรณี "ข้อความว่าง/ไม่สื่อสาร/สุ่ม/อ่านไม่รู้เรื่อง" เท่านั้น
  กรณีที่มีความหมายแต่ไม่ชัด ให้เลือกอารมณ์ที่เป็นไปได้มากที่สุด
- ห้ามส่งข้อความนอกเหนือจาก JSON เดียว
`.trim();

  const payload = {
    model: OLLAMA_MODEL,
    format: 'json',
    stream: false,
    options: { temperature: 0, num_predict: 256 },
    messages: [
      { role: 'system', content: 'คุณเป็นผู้ช่วยวิเคราะห์อารมณ์ ตอบเป็น JSON เท่านั้น' },
      { role: 'user', content: prompt },
    ],
  };

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await api.post('/api/chat', payload);
      const raw = res?.data?.message?.content || res?.data?.response || '';
      console.log('🧠 RAW LLM:', raw);
      const parsed = safeParseJSONObject(raw);
      if (parsed) return parsed;

      const strictPayload = {
        ...payload,
        messages: [
          { role: 'system', content: 'ตอบเป็น JSON เดียวเท่านั้น ห้ามมีข้อความอื่น' },
          {
            role: 'user',
            content:
              `ตอบเป็น JSON เดียวเท่านั้น:\n` +
              `{"risk":"...","emotion":"...","emotion_score":...,"emotion_explanation":"..."}\n\n` +
              `วิเคราะห์ข้อความ:\n<<<\n${message}\n>>>`,
          },
        ],
      };
      const res2 = await api.post('/api/chat', strictPayload);
      const raw2 = res2?.data?.message?.content || res2?.data?.response || '';
      console.log('🧠 RAW LLM (strict):', raw2);
      const parsed2 = safeParseJSONObject(raw2);
      return parsed2 ?? null;
    } catch (e) {
      lastErr = e;
      if (i < retries) continue;
    }
  }
  throw lastErr || new Error('call ollama /api/chat failed');
}

/* =================== AI-first scoring helpers (uses Ollama) ===================== */
async function getSmartEmotionEval(message) {
  let emotion = null;
  let risk = 'ปกติ';
  let emotionScore = null;
  let emotionScoreSource = 'local-fallback';
  let emotionExplanation = 'ไม่สามารถวิเคราะห์ได้ หรือความเชื่อมั่นไม่เพียงพอ';

  try {
    const data = await callOllamaChatWithRetry(message, 1);

    if (typeof data?.risk === 'string') risk = data.risk;
    if (typeof data?.emotion === 'string' || data?.emotion === null) emotion = data.emotion;

    const explain = pickEmotionExplanationFromAPI(data);
    if (explain) emotionExplanation = explain;

    const aiScoreRaw = pickEmotionScoreFromAPI(data);
    if (aiScoreRaw !== undefined) {
      const s = aiScoreRaw === null ? null : normalizeAIScore(aiScoreRaw);
      if (s === null) {
        emotionScore = emotionToScore(emotion);
        emotionScoreSource = emotionScore == null ? 'ai-null' : 'mapped-from-label';
      } else {
        emotionScore = s;
        emotionScoreSource = 'ai';
      }
    } else {
      emotionScore = emotionToScore(emotion);
      emotionScoreSource = emotionScore == null ? 'ai-missing' : 'mapped-from-label';
    }
  } catch (e) {
    console.warn('getSmartEmotionEval fallback local:', e?.message || e);
    emotionScore = emotionToScore(emotion);
    emotionScoreSource = emotionScore == null ? 'error-null' : 'mapped-from-label';
  }

  return { emotion, risk, emotionScore, emotionScoreSource, emotionExplanation };
}

/* =================== High-risk keyword guard (local) ===================== */
const HIGH_RISK_HINTS = ['อยากตาย', 'ฆ่าตัวตาย', 'ไม่อยากอยู่แล้ว', 'ไม่อยากอยู่บนโลกนี้', 'จบชีวิต', 'ทำร้ายตัวเอง', 'เจ็บตัวเอง', 'จากไปดีกว่า', 'ตายไปคงดี', 'ชีวิตไม่มีค่า', 'ไร้ค่าเกินไป', 'ไม่เหลือใคร', 'อยู่ไปก็เท่านั้น'];

function hasHighRiskKeywords(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.toLowerCase();
  return HIGH_RISK_HINTS.some((k) => t.includes(k.toLowerCase()));
}

/* ========================================================================= */

export default function DiaryScreen() {
  const today = getTodayDate(); // --- [เพิ่ม] เก็บวันที่ปัจจุบันไว้ในตัวแปร ---
  const [selectedDate, setSelectedDate] = useState(today); // --- [แก้ไข] ให้วันเริ่มต้นเป็นวันปัจจุบันเสมอ ---
  const [diaryEntries, setDiaryEntries] = useState({});
  const [modalVisible, setModalVisible] = useState(false);

  const [title, setTitle] = useState('');
  const [categories, setCategories] = useState([]);
  const [content, setContent] = useState('');

  const [categoryOptions, setCategoryOptions] = useState([]);

  const navigation = useNavigation();
  const user = getAuth().currentUser;

  const [alertShown, setAlertShown] = useState(false);

  function calcAverageScore(entriesObj) {
    const entries = Object.values(entriesObj || {});
    if (!entries.length) return null;
    const scores = entries.map((e) => { if (typeof e?.emotionScore === 'number') return normalizeAIScore(e.emotionScore); return emotionToScore(e?.emotion); }).filter((n) => Number.isFinite(n));
    if (!scores.length) return null;
    const sum = scores.reduce((a, b) => a + b, 0);
    return sum / scores.length;
  }

  function checkAndAlertAverage(entriesObj) {
    if (alertShown) return;
    const avg = calcAverageScore(entriesObj);
    if (avg == null) return;
    if (avg <= 1) {
      setAlertShown(true);
      Alert.alert(
        'คำแนะนำด้านสุขภาพ',
        'คะแนนอารมณ์เฉลี่ยของคุณต่ำกว่า 1 แนะนำให้ปรึกษาผู้เชี่ยวชาญ/พบแพทย์เพื่อรับคำแนะนำเพิ่มเติม',
        [
          { text: 'พบแพทย์ของเรา', onPress: () => navigation.navigate('DoctorRecommend'), style: 'default' },
          { text: 'OK', style: 'cancel' },
        ],
        { cancelable: true }
      );
    }
  }

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
      
      // --- [แก้ไข] บันทึกข้อมูลสำหรับวันที่ปัจจุบัน (today) เสมอ ---
      await setDoc(doc(db, 'diaryEntries', user.uid, 'entries', today), payload);

      setDiaryEntries((prev) => {
        const updated = { ...prev, [today]: payload };
        checkAndAlertAverage(updated);
        return updated;
      });

      setTitle('');
      setContent('');
      setCategories([]);
      setModalVisible(false);

      if (highRisk) {
        const recommendedSpecialties = getSpecialtiesFromCategories(categories);

        let recommendationMessage = 'ตรวจพบสัญญาณความเสี่ยงสูงจากข้อความของคุณ แนะนำให้ปรึกษาผู้เชี่ยวชาญหรือพบแพทย์ทันที หากอยู่ในภาวะฉุกเฉิน โปรดติดต่อบริการฉุกเฉินใกล้คุณ';

        if (recommendedSpecialties && recommendedSpecialties.length > 0) {
          const specialtiesText = recommendedSpecialties.map(s => `• ${s.split(',')[0]}`).join('\n');
          recommendationMessage += `\n\nจากหมวดหมู่ที่คุณเลือก ขอแนะนำแพทย์เฉพาะทางด้าน:\n${specialtiesText}`;
        }

        Alert.alert(
          '🚨 ความปลอดภัยมาก่อน',
          recommendationMessage,
          [
            { text: 'โทรสายด่วนสุขภาพจิต 1323', onPress: () => Linking.openURL('tel:1323') },
            {
              text: 'ดูรายชื่อแพทย์ที่แนะนำ',
              onPress: () => navigation.navigate('DoctorRecommend', {
                from: 'Diary',
                risk: 'high',
                recommendedSpecialties: recommendedSpecialties,
              }),
            },
            { text: 'ตกลง', style: 'cancel' },
          ],
          { cancelable: true }
        );

      } else {
        Alert.alert('✅ บันทึกสำเร็จ', `บันทึกสำหรับวันที่ ${today} แล้ว`);
      }
    } catch (error) {
      console.error('บันทึกผิดพลาด: ', error);
      Alert.alert('❌ เกิดข้อผิดพลาด', error.message);
    }
  };
  
  // --- [เพิ่ม] ตัวแปรเช็คว่ามีบันทึกของวันนี้หรือยัง ---
  const entryExistsForToday = diaryEntries[today];

  return (
    <View style={styles.container}>
      <Calendar
        // --- [เพิ่ม] ล็อคไม่ให้เลือกวันในอนาคต ---
        maxDate={today}
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
      
      {/* --- [แก้ไข] ปรับปรุงปุ่มเขียน/แก้ไข ให้ทำงานเฉพาะกับวันปัจจุบัน --- */}
      <TouchableOpacity 
        style={styles.writeButton} 
        onPress={() => {
            // ถ้ามีข้อมูลของวันนี้อยู่แล้ว ให้โหลดขึ้นมาเพื่อแก้ไข
            if (entryExistsForToday) {
                setTitle(entryExistsForToday.title);
                setCategories(entryExistsForToday.categories || []);
                setContent(entryExistsForToday.content);
            } else {
            // ถ้ายังไม่มี ให้เคลียร์ค่าทั้งหมดสำหรับบันทึกใหม่
                setTitle('');
                setCategories([]);
                setContent('');
            }
            setModalVisible(true);
        }}
      >
        <Icon name="create-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>
            {entryExistsForToday ? 'แก้ไขบันทึก' : 'เขียนบันทึก'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.libraryButton}
        onPress={() => navigation.navigate('DiaryLibrary', { diaryEntries })}
      >
        <Icon name="book" size={22} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>คลังไดอารี่</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>✏️ {entryExistsForToday ? 'แก้ไขบันทึก' : 'เขียนบันทึก'}</Text>

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
