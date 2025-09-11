import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ScrollView, TextInput
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { auth, db } from '../firebase';
import {
  doc, setDoc, getDoc, getDocs,
  collection, query, where
} from 'firebase/firestore';
import moment from 'moment';
import 'moment/locale/th';
import AsyncStorage from '@react-native-async-storage/async-storage';

moment.locale('th');

const moodIcons = ['😭', '😢', '😐', '🙂', '😄'];
const dayLabels = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];
const screenWidth = Dimensions.get('window').width;

export default function HomeScreen() {
  const [moodData, setMoodData] = useState(
    Array(7).fill().map((_, i) => ({
      day: dayLabels[i],
      mood: 0,
      note: '',
      timestamp: null
    }))
  );
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(null);
  const [moodModalVisible, setMoodModalVisible] = useState(false);
  const [note, setNote] = useState('');
  const [weeklyAvg, setWeeklyAvg] = useState(null);

  const todayIndex = moment().isoWeekday() - 1;

  const getDateByDayIndex = (index) => {
    const startOfWeek = moment().startOf('isoWeek');
    return startOfWeek.clone().add(index, 'days').format('YYYY-MM-DD');
  };

  // --- รีเซ็ตทุก 7 โมง ---
  useEffect(() => {
    const resetDailyCheck = async () => {
      const lastReset = await AsyncStorage.getItem('lastReset');
      const now = moment();
      const todayResetTime = moment().hour(7).minute(0).second(0); // 7 โมงวันนี้

      if (!lastReset || moment(lastReset).isBefore(todayResetTime)) {
        // รีเซ็ต moodData ของวันนี้
        const newData = [...moodData];
        newData[todayIndex] = {
          ...newData[todayIndex],
          mood: 0,
          note: '',
          timestamp: null,
        };
        setMoodData(newData);

        // เก็บเวลาที่รีเซ็ตล่าสุด
        await AsyncStorage.setItem('lastReset', now.toISOString());
      }
    };

    resetDailyCheck();
  }, []);

  // --- โหลดข้อมูลประจำสัปดาห์ ---
  const fetchMoodData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const startOfWeek = moment().startOf('isoWeek');
    const endOfWeek = moment().endOf('isoWeek');

    const q = query(
      collection(db, 'moods', user.uid, 'entries'),
      where('date', '>=', startOfWeek.format('YYYY-MM-DD')),
      where('date', '<=', endOfWeek.format('YYYY-MM-DD'))
    );

    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map(doc => doc.data());

    const newMoodData = [];
    let totalMood = 0;
    let moodCount = 0;

    for (let i = 0; i < 7; i++) {
      const date = getDateByDayIndex(i);
      const moodEntry = docs.find(entry => entry.date === date);

      const moodValue = moodEntry?.mood ?? 0;

      newMoodData.push({
        day: dayLabels[i],
        mood: moodValue,
        note: moodEntry?.note || '',
        timestamp: moodEntry?.timestamp || null
      });

      if (moodEntry?.timestamp) {
        totalMood += moodValue;
        moodCount += 1;
      }
    }

    setMoodData(newMoodData);
    const avg = moodCount > 0 ? (totalMood / moodCount).toFixed(2) : null;
    setWeeklyAvg(avg);

    // --- เซฟ avg ลง Firestore ---
    if (avg !== null) {
      const yearWeek = startOfWeek.format('YYYY-[W]WW');
      const weeklyAvgRef = doc(db, 'moods', user.uid, 'weeklyAvg', yearWeek);
      await setDoc(weeklyAvgRef, {
        yearWeek,
        avg: Number(avg),
        updatedAt: new Date().toISOString(),
      });
    }

    const todayMood = newMoodData[todayIndex];
    if (!todayMood.timestamp) {
      setSelectedHistoryIndex(todayIndex);
      setNote(todayMood.note || '');
      setMoodModalVisible(true);
    }
  };

  const fetchMonthlyData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const q = collection(db, 'moods', user.uid, 'monthly');
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const sorted = docs.sort((a, b) => a.id.localeCompare(b.id)).slice(-6);
    setMonthlyStats(sorted);
  };

  useEffect(() => {
    fetchMoodData();
    fetchMonthlyData();
  }, []);

  // --- อัพเดต avg แบบเรียลไทม์ ---
  const selectMoodForHistory = async (mood) => {
    if (selectedHistoryIndex !== null) {
      const user = auth.currentUser;
      if (!user) return;

      const date = getDateByDayIndex(selectedHistoryIndex);
      const yearMonth = date.slice(0, 7);
      const timestamp = new Date();

      await setDoc(doc(db, 'moods', user.uid, 'entries', date), {
        date,
        mood,
        note,
        timestamp: timestamp.toISOString()
      });

      const monthRef = doc(db, 'moods', user.uid, 'monthly', yearMonth);
      const monthSnap = await getDoc(monthRef);

      if (monthSnap.exists()) {
        const data = monthSnap.data();
        const newSum = data.moodSum + mood;
        const newCount = data.moodCount + 1;
        await setDoc(monthRef, {
          yearMonth,
          moodSum: newSum,
          moodAvg: newSum / newCount,
          moodCount: newCount
        });
      } else {
        await setDoc(monthRef, {
          yearMonth,
          moodSum: mood,
          moodAvg: mood,
          moodCount: 1
        });
      }

      // อัพเดต state ท้องถิ่น
      const newData = [...moodData];
      newData[selectedHistoryIndex].mood = mood;
      newData[selectedHistoryIndex].note = note;
      newData[selectedHistoryIndex].timestamp = timestamp;
      setMoodData(newData);

      // --- คำนวณ avg ใหม่ ---
      let totalMood = 0;
      let moodCount = 0;
      newData.forEach(item => {
        if (item.timestamp) {
          totalMood += item.mood;
          moodCount += 1;
        }
      });

      const newAvg = moodCount > 0 ? (totalMood / moodCount).toFixed(2) : null;
      setWeeklyAvg(newAvg);

      // เซฟ avg ใหม่ลง Firestore
      if (newAvg !== null) {
        const startOfWeek = moment().startOf('isoWeek');
        const yearWeek = startOfWeek.format('YYYY-[W]WW');
        const weeklyAvgRef = doc(db, 'moods', user.uid, 'weeklyAvg', yearWeek);
        await setDoc(weeklyAvgRef, {
          yearWeek,
          avg: Number(newAvg),
          updatedAt: new Date().toISOString(),
        });
      }

      setMoodModalVisible(false);
      setSelectedHistoryIndex(null);
      setNote('');

      fetchMonthlyData();
    }
  };

  const openMoodModal = (index) => {
    if (index > todayIndex) return;
    if (moodData[index]?.timestamp) {
      alert('วันนี้เช็คอินอารมณ์ไปแล้ว');
      return;
    }
    setSelectedHistoryIndex(index);
    setNote(moodData[index]?.note || '');
    setMoodModalVisible(true);
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'ยังไม่เคยบันทึก';
    const date = new Date(ts);
    return moment(date).format('DD/MM/YYYY เวลา HH:mm');
  };

  const todayFullText = () => {
    const now = moment();
    return `วัน ${now.format('dddd')} ที่ ${now.format('D MMMM YYYY')}`;
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>{todayFullText()}</Text>
      {weeklyAvg !== null && (
        <View style={styles.weeklyAvgContainer}>
          <Text style={styles.weeklyAvgEmoji}>{moodIcons[Math.round(weeklyAvg)]}</Text>
          <Text style={styles.weeklyAvgLabel}>อารมณ์เฉลี่ยสัปดาห์นี้</Text>
          <Text style={styles.weeklyAvgScore}>{weeklyAvg}</Text>
        </View>
      )}

      <Text style={styles.subHeader}>เลือกอารมณ์ย้อนหลัง</Text>
      <View style={styles.historyRow}>
        {moodData.map((item, index) => {
          const dateNumber = moment(getDateByDayIndex(index)).format('D');
          const dayShort = dayLabels[index];
          return (
            <TouchableOpacity
              key={index}
              style={[styles.historyButton, index > todayIndex && { opacity: 0.3 }]}
              onPress={() => openMoodModal(index)}
              disabled={index > todayIndex}
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
          labels: moodData.map(item => item.day),
          datasets: [{ data: moodData.map(item => item.mood) }]
        }}
        width={screenWidth - 20}
        height={220}
        chartConfig={{
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          color: (opacity = 1) => `rgba(0, 0, 255, ${opacity})`,
          labelColor: () => '#000'
        }}
        style={styles.chartStyle}
        bezier
        fromZero
        yLabelsOffset={10}
      />

      <Text style={styles.subHeader}>สรุปเฉลี่ยอารมณ์รายเดือน</Text>
      <BarChart
        data={{
          labels: monthlyStats.map(item => item.id.slice(5)),
          datasets: [{ data: monthlyStats.map(item => item.moodAvg) }]
        }}
        width={screenWidth - 20}
        height={220}
        fromZero
        showValuesOnTopOfBars
        chartConfig={{
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
          labelColor: () => '#000'
        }}
        style={{ marginVertical: 10, borderRadius: 8 }}
      />

      <Modal visible={moodModalVisible} transparent={true} animationType="slide">
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

            <Text style={styles.timestampText}>
              {formatTimestamp(moodData[selectedHistoryIndex]?.timestamp)}
            </Text>

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
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  historyButton: {
    alignItems: 'center',
    width: '13%',
    marginVertical: 5,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#e6f0ff',
  },
  historyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  historyMood: { fontSize: 30, textAlign: 'center' },
  chartStyle: { borderRadius: 8, marginVertical: 10 },
  modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', margin: 30, padding: 20, borderRadius: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  moodIconRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 },
  moodIcon: { fontSize: 30 },
  noteLabel: { fontSize: 16, marginTop: 10, marginBottom: 5 },
  noteInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  timestampText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  cancelText: { textAlign: 'center', color: 'red', marginTop: 10 },
  weeklyAvgContainer: {
    backgroundColor: '#e8f4ff',
    borderRadius: 12,
    paddingVertical: 16,
    marginVertical: 12,
    alignItems: 'center',
  },
  weeklyAvgLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  weeklyAvgEmoji: {
    fontSize: 60,
    marginBottom: 4,
  },
  weeklyAvgScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
});
