import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ScrollView, TextInput, Platform, Alert // 👈 เพิ่ม Alert
} from 'react-native';
import axios from 'axios';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import moment from 'moment';
import 'moment/locale/th';
import AsyncStorage from '@react-native-async-storage/async-storage';

moment.locale('th');

const moodIcons = ['😭', '😢', '😐', '🙂', '😄'];
const moodTexts = ['อารมณ์แย่มาก', 'อารมณ์แย่', 'ปกติ', 'อารมณ์ดี', 'อารมณ์ดีมาก'];
const dayLabels = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];
const screenWidth = Dimensions.get('window').width;


// ---- Ollama Config (11434) ----
const OLLAMA_BASE = __DEV__
  ? (Platform.OS === 'ios' ? 'http://localhost:11434' : 'http://10.0.2.2:11434')
  : 'http://<YOUR-LAN-IP>:11434';

// เรียก Ollama /api/chat
async function getAdviceFromOllama(score) {
  const system_prompt = `
คุณเป็นผู้ช่วยที่จะแนะนำกิจกรรมตามระดับคะแนนอารมณ์ของผู้ใช้ (0-5):

กติกา:
- ผู้ใช้จะส่งคะแนนอารมณ์มาให้ (0 = แย่มาก, 5 = ดีมากที่สุด)
- ให้คุณเลือกกิจกรรมที่เหมาะสมที่สุดตามช่วงคะแนนด้านล่าง
- ตอบสั้น กระชับ ใช้ภาษาที่ให้กำลังใจ

ช่วงคะแนนและกิจกรรมแนะนำ:
1.1-2: เพิ่มพลัง — ออกกำลังกายเบาๆ, โยคะ, วาดรูป
2.1-3: สร้างความสุข — ดูหนังตลก, พบปะเพื่อน, ทำอาหารที่ชอบ
3.1-4: เสริมความมั่นใจ — ตั้งเป้าหมายเล็กๆ, เรียนรู้อะไรใหม่ๆ, ทำงานอาสาสมัคร
4.1-5: เสริมความสัมพันธ์ — เวลากับครอบครัว, กิจกรรมกับเพื่อน, แสดงความขอบคุณต่อผู้อื่น

ให้เลือก 1-2 กิจกรรมเหมาะกับคะแนน และใส่กำลังใจสั้นๆ
`.trim();

  const user_prompt = `คะแนนอารมณ์เฉลี่ยของผู้ใช้คือ ${score}`;

  const body = {
    model: 'llama3.1',
    stream: false,
    options: { temperature: 0.7 },
    messages: [
      { role: 'system', content: system_prompt },
      { role: 'user', content: user_prompt },
    ],
  };

  const res = await axios.post(`${OLLAMA_BASE}/api/chat`, body, {
    timeout: 60000,
    headers: { 'Content-Type': 'application/json' },
  });

  return (res && res.data && res.data.message && (res.data.message.content || '').trim()) || '';
}

export default function HomeScreen() {
  const [moodData, setMoodData] = useState(
    Array(7).fill().map((_, i) => ({
      day: dayLabels[i],
      mood: 0,
      note: '',
      timestamp: null,
    }))
  );
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(null);
  const [moodModalVisible, setMoodModalVisible] = useState(false);
  const [note, setNote] = useState('');
  const [weeklyAvg, setWeeklyAvg] = useState(null);

  // ผลจาก Ollama
  const [aiAdvice, setAiAdvice] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const [recommendedActivity, setRecommendedActivity] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);

  // กัน Alert ซ้ำ ๆ
  const [hasShownLowAlert, setHasShownLowAlert] = useState(false);

  const todayIndex = moment().isoWeekday() - 1;

  const getDateByDayIndex = (index, offset = 0) => {
    const startOfWeek = moment().startOf('isoWeek').add(offset, 'weeks');
    return startOfWeek.clone().add(index, 'days').format('YYYY-MM-DD');
  };

  useEffect(() => {
    const resetDailyCheck = async () => {
      if (weekOffset !== 0) return;
      const lastReset = await AsyncStorage.getItem('lastReset');
      const now = moment();
      const todayResetTime = moment().hour(7).minute(0).second(0);
      if (!lastReset || moment(lastReset).isBefore(todayResetTime)) {
        const newData = [...moodData];
        newData[todayIndex] = { ...newData[todayIndex], mood: 0, note: '', timestamp: null };
        setMoodData(newData);
        await AsyncStorage.setItem('lastReset', now.toISOString());
      }
    };
    resetDailyCheck();
  }, [weekOffset]);

  const fetchMoodData = async (offset = 0) => {
    const user = auth.currentUser;
    if (!user) return;

    const startOfWeek = moment().startOf('isoWeek').add(offset, 'weeks');
    const endOfWeek = moment().endOf('isoWeek').add(offset, 'weeks');

    const q = query(
      collection(db, 'moods', user.uid, 'entries'),
      where('date', '>=', startOfWeek.format('YYYY-MM-DD')),
      where('date', '<=', endOfWeek.format('YYYY-MM-DD'))
    );

    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map((d) => d.data());

    const newMoodData = [];
    let totalMood = 0;
    let moodCount = 0;

    for (let i = 0; i < 7; i++) {
      const date = getDateByDayIndex(i, offset);
      const moodEntry = docs.find((entry) => entry.date === date);
      const moodValue = moodEntry?.mood ?? 0;

      newMoodData.push({
        day: dayLabels[i],
        mood: moodValue,
        note: moodEntry?.note || '',
        timestamp: moodEntry?.timestamp || null,
      });

      if (moodEntry?.timestamp) {
        totalMood += moodValue;
        moodCount++;
      }
    }

    setMoodData(newMoodData);
    const avg = moodCount > 0 ? Number((totalMood / moodCount).toFixed(2)) : null;
    setWeeklyAvg(avg);

    if (offset === 0) {
      const todayMood = newMoodData[todayIndex];
      if (!todayMood.timestamp) {
        setSelectedHistoryIndex(todayIndex);
        setNote(todayMood.note || '');
        setMoodModalVisible(true);
      }
    }
  };

  const fetchMonthlyData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const q = collection(db, 'moods', user.uid, 'monthly');
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    const sorted = docs.sort((a, b) => a.id.localeCompare(b.id)).slice(-6);
    const fixedStats = sorted.map((item) => ({
      ...item,
      moodAvg: Number(item.moodAvg.toFixed(2)),
    }));

    setMonthlyStats(fixedStats);
  };

  useEffect(() => {
    fetchMoodData(weekOffset);
    fetchMonthlyData();
  }, [weekOffset]);


  // ✅ เงื่อนไขหลัก: ถ้า 0–1 ให้ Alert + งดเรียก AI
  useEffect(() => {
    if (weeklyAvg === null || Number.isNaN(Number(weeklyAvg))) {
      setAiAdvice('');
      setAiError('');
      setHasShownLowAlert(false);
      return;
    }

    if (weeklyAvg >= 0 && weeklyAvg <= 1) {
      setAiAdvice('');
      setAiError('');
      setRecommendedActivity('');

      // เด้งเตือนครั้งเดียวต่อการอยู่ในช่วงนี้
      if (!hasShownLowAlert) {
        Alert.alert(
          'แนะนำพบแพทย์',
          'คะแนนอารมณ์เฉลี่ยอยู่ในช่วง 0–1\nเพื่อความปลอดภัย แนะนำปรึกษาผู้เชี่ยวชาญหรือติดต่อสายด่วนสุขภาพจิต 1323'
        );
        setHasShownLowAlert(true);
      }
      return; // ❌ ไม่เรียก AI
    } else {
      // ออกนอกช่วง 0–1 แล้ว รีเซ็ต flag เพื่อให้แจ้งเตือนได้อีกหากกลับเข้าเงื่อนไข
      setHasShownLowAlert(false);
    }

    // 🔁 กรณีอื่น ๆ เรียก AI
    const run = async () => {
      try {
        setAiLoading(true);
        setAiError('');
        const score = Number(weeklyAvg.toFixed(2));
        const advice = (await getAdviceFromOllama(score)).trim();
        setAiAdvice(advice || 'วันนี้พักผ่อนให้เพียงพอ แล้วค่อยเริ่มใหม่พรุ่งนี้นะ ✨');
      } catch (e) {
        console.warn('ollama error:', e && (e.message || e));
        setAiAdvice('');
        setAiError('ไม่สามารถดึงคำแนะนำได้ในขณะนี้');
      } finally {
        setAiLoading(false);
      }
    };
    run();
  }, [weeklyAvg, hasShownLowAlert]);

  const selectMoodForHistory = async (mood) => {
    if (selectedHistoryIndex !== null) {
      const user = auth.currentUser;
      if (!user) return;

      const date = getDateByDayIndex(selectedHistoryIndex, weekOffset);
      const yearMonth = date.slice(0, 7);
      const timestamp = new Date();

      await setDoc(doc(db, 'moods', user.uid, 'entries', date), {
        date,
        mood,
        note,
        timestamp: timestamp.toISOString(),
      });

      const monthRef = doc(db, 'moods', user.uid, 'monthly', yearMonth);
      const monthSnap = await getDoc(monthRef);

      if (monthSnap.exists()) {
        const data = monthSnap.data();
        const newSum = (data.moodSum || 0) + mood;
        const newCount = (data.moodCount || 0) + 1;
        await setDoc(monthRef, {
          yearMonth,
          moodSum: newSum,
          moodAvg: Number((newSum / newCount).toFixed(2)),
          moodCount: newCount,
        });
      } else {
        await setDoc(monthRef, {
          yearMonth,
          moodSum: mood,
          moodAvg: Number(mood.toFixed(2)),
          moodCount: 1,
        });
      }

      const newData = [...moodData];
      newData[selectedHistoryIndex] = { ...newData[selectedHistoryIndex], mood, note, timestamp };
      setMoodData(newData);

      let totalMood = 0;
      let moodCount = 0;
      newData.forEach((item) => {
        if (item.timestamp) {
          totalMood += item.mood;
          moodCount += 1;
        }
      });
      const newAvg = moodCount > 0 ? Number((totalMood / moodCount).toFixed(2)) : null;
      setWeeklyAvg(newAvg);

      setMoodModalVisible(false);
      setSelectedHistoryIndex(null);
      setNote('');

      fetchMonthlyData();
    }
  };

  const openMoodModal = (index) => {
    if (weekOffset > 0) return;
    if (index > todayIndex && weekOffset === 0) return;
    setSelectedHistoryIndex(index);
    setNote(moodData[index]?.note || '');
    setMoodModalVisible(true);
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'ยังไม่เคยบันทึก';
    return moment(new Date(ts)).format('DD/MM/YYYY เวลา HH:mm');
  };

  const todayFullText = () => {
    const now = moment();
    return `วัน ${now.format('dddd')} ที่ ${now.format('D MMMM YYYY')}`;
  };

  const moodDescription = (avg) => {
    if (avg === null) return '';
    const index = Math.round(Number(avg));
    return `${moodIcons[index]} ${moodTexts[index]}`;
  };

  const currentTs = selectedHistoryIndex !== null ? moodData[selectedHistoryIndex]?.timestamp : null;

  const isLowRange = weeklyAvg !== null && weeklyAvg >= 0 && weeklyAvg <= 1;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>{todayFullText()}</Text>

      <View style={styles.weekNav}>
        <TouchableOpacity style={styles.weekButton} onPress={() => setWeekOffset((prev) => prev - 1)}>
          <Text style={styles.weekArrow}>◀️</Text>
        </TouchableOpacity>
        <Text style={styles.weekLabel}>
          {weekOffset === 0
            ? 'สัปดาห์นี้'
            : `สัปดาห์ที่ ${moment().startOf('isoWeek').add(weekOffset, 'weeks').format('D MMM')}`}
        </Text>
        <TouchableOpacity
          style={styles.weekButton}
          onPress={() => weekOffset < 0 && setWeekOffset((prev) => prev + 1)}
          disabled={weekOffset === 0}
        >
          <Text style={[styles.weekArrow, { opacity: weekOffset === 0 ? 0.3 : 1 }]}>▶️</Text>
        </TouchableOpacity>
      </View>

      {weeklyAvg !== null && (
        <View style={styles.weeklyAvgContainer}>
          <Text style={styles.weeklyAvgEmoji}>
            {moodIcons[Math.round(Number(weeklyAvg))]}
          </Text>
          <Text style={styles.weeklyAvgLabel}>อารมณ์เฉลี่ยสัปดาห์นี้</Text>

          {/* 🔴 ป้ายแจ้งเตือนสีแดงเมื่อ 0–1 */}
          {isLowRange && (
            <View style={styles.medicalBanner}>
              <Text style={styles.medicalBannerText}>
                แนะนำให้ปรึกษาผู้เชี่ยวชาญหรือติดต่อสายด่วนสุขภาพจิต <Text style={{ fontWeight: 'bold' }}>1323</Text>
              </Text>
            </View>
          )}

          {/* คำแนะนำจาก AI (แสดงเฉพาะเมื่อไม่ใช่ช่วง 0–1) */}
          {!isLowRange && (
            <>
              {aiLoading ? (
                <Text style={styles.aiAdviceLoading}>กำลังประมวลผลคำแนะนำ…</Text>
              ) : aiError ? (
                <Text style={styles.aiAdviceError}>{aiError}</Text>
              ) : aiAdvice ? (
                <View style={styles.aiAdviceBox}>
                  <Text style={styles.aiAdviceHeader}>คำแนะนำสำหรับคุณ</Text>
                  <Text style={styles.aiAdviceText}>{aiAdvice}</Text>
                </View>
              ) : null}
            </>
          )}

          {/* คะแนนเฉลี่ย */}
          <Text style={styles.weeklyAvgScore}>
            {weeklyAvg} ({moodDescription(weeklyAvg)})
          </Text>

          {/* Fallback: เฉพาะเมื่อไม่ใช่ช่วง 0–1 และไม่มี AI */}
          {!isLowRange && !aiAdvice && recommendedActivity ? (
            <View style={styles.activityContainer}>
              <Text style={styles.activityHeader}>กิจกรรมแนะนำเพื่อปรับอารมณ์</Text>
              <Text style={styles.activityText}>{recommendedActivity}</Text>
            </View>
          ) : null}
        </View>
      )}

      <Text style={styles.subHeader}>เลือกอารมณ์ย้อนหลัง</Text>
      <View style={styles.historyRow}>
        {moodData.map((item, index) => {
          const dateNumber = moment(getDateByDayIndex(index, weekOffset)).format('D');
          const dayShort = dayLabels[index];
          return (
            <TouchableOpacity
              key={index}
              style={[styles.historyButton, index > todayIndex && weekOffset === 0 && { opacity: 0.3 }]}
              onPress={() => openMoodModal(index)}
              disabled={index > todayIndex && weekOffset === 0}
            >
              <Text style={styles.historyText}>
                {dateNumber} {dayShort}
              </Text>
              <Text style={styles.historyMood}>
                {item.timestamp ? moodIcons[item.mood] : '➕'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.subHeader}>กราฟรายสัปดาห์</Text>
      <LineChart
        data={{
          labels: moodData.map((item) => item.day),
          datasets: [{ data: moodData.map((item) => item.mood) }],
        }}
        width={screenWidth - 20}
        height={220}
        chartConfig={{
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          color: (opacity = 1) => `rgba(0, 0, 255, ${opacity})`,
          labelColor: () => '#000',
        }}
        style={styles.chartStyle}
        bezier
        fromZero
        yLabelsOffset={10}
      />

      <Text style={styles.subHeader}>สรุปเฉลี่ยอารมณ์รายเดือน</Text>
      <BarChart
        data={{
          labels: monthlyStats.map((item) => item.id.slice(5)),
          datasets: [{ data: monthlyStats.map((item) => item.moodAvg) }],
        }}
        width={screenWidth - 20}
        height={220}
        fromZero
        showValuesOnTopOfBars
        chartConfig={{
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
          labelColor: () => '#000',
        }}
        style={{ marginVertical: 10, borderRadius: 8 }}
      />

      <Modal visible={moodModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>เลือกอารมณ์</Text>
            <View style={styles.moodIconRow}>
              {moodIcons.map((icon, index) => (
                <TouchableOpacity key={index} onPress={() => selectMoodForHistory(index)}>
                  <Text style={styles.moodIcon}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.noteLabel}>บันทึกความรู้สึก (ไม่บังคับ)</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="เช่น รู้สึกเหนื่อยจากงาน"
              multiline
            />

            <Text style={styles.timestampText}>{formatTimestamp(currentTs)}</Text>

            <TouchableOpacity onPress={() => setMoodModalVisible(false)}>
              <Text style={styles.cancelText}>ยกเลิก</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#f9f9f9' },
  header: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginTop: 10 },
  todayMood: { fontSize: 60, textAlign: 'center', marginVertical: 10 },
  subHeader: { fontSize: 18, marginTop: 20, marginBottom: 5 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap' },
  historyButton: { alignItems: 'center', width: '13%', marginVertical: 5, paddingVertical: 4, borderRadius: 6, backgroundColor: '#e6f0ff' },
  historyText: { fontSize: 14, fontWeight: '600', color: '#333', textAlign: 'center' },
  historyMood: { fontSize: 30, textAlign: 'center' },
  chartStyle: { borderRadius: 8, marginVertical: 10 },
  modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', margin: 30, padding: 20, borderRadius: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  moodIconRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 },
  moodIcon: { fontSize: 30 },
  noteLabel: { fontSize: 16, marginTop: 10, marginBottom: 5 },
  noteInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, minHeight: 60, textAlignVertical: 'top' },
  timestampText: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 10 },
  cancelText: { textAlign: 'center', color: 'red', marginTop: 10 },

  weeklyAvgContainer: { 
    backgroundColor: '#e8f4ff',
    borderRadius: 12,
    paddingVertical: 16,
    marginVertical: 12,
    alignItems: 'center',
  },
  weeklyAvgLabel: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  weeklyAvgEmoji: { fontSize: 60, marginBottom: 4 },
  weeklyAvgScore: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center' },

  // 🔴 ป้ายเตือนสีแดง
  medicalBanner: {
    backgroundColor: '#ffe6e6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ff9b9b',
    width: '100%',
  },
  medicalBannerText: {
    color: '#c0392b',
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // กล่องคำแนะนำ AI
  aiAdviceBox: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 10, width: '100%' },
  aiAdviceHeader: { fontSize: 16, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  aiAdviceText: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  aiAdviceLoading: { fontSize: 14, color: '#666', marginBottom: 8 },
  aiAdviceError: { fontSize: 14, color: '#c0392b', marginBottom: 8 },

  activityContainer: { backgroundColor: '#fff0f0', borderRadius: 12, padding: 16, marginTop: 12, alignItems: 'center' },
  activityHeader: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  activityText: { fontSize: 16, color: '#e74c3c', textAlign: 'center' },

  weekNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10 },
  weekButton: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#d0e7ff', borderRadius: 6 },
  weekArrow: { fontSize: 18 },
  weekLabel: { fontSize: 16, fontWeight: 'bold' },
});
