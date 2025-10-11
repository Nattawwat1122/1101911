// screens/BookAppointmentScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const ALL_TIMES = [
  '10:00', '11:00', '13:00', '14:00', '15:00', '16:00',
  '17:00', '18:00', '19:00', '20:00',
];

const radius = 14;

// ---- Helpers for local date/time ----
const formatLocalDate = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export default function BookAppointmentScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { doctor } = route.params || {};

  // Default selected date = today (local)
  const [selectedDate, setSelectedDate] = useState(formatLocalDate());
  const [selectedTime, setSelectedTime] = useState(null);
  const [duration, setDuration] = useState(30);
  const [loadingDay, setLoadingDay] = useState(false);
  const [taken, setTaken] = useState({}); // { "14:00": "appointmentId", ... }

  useEffect(() => {
    if (!doctor?.id) {
      Alert.alert('ข้อมูลแพทย์ไม่ครบ', 'ต้องมี doctor.id');
      return;
    }
  }, [doctor]);

  // subscribe เวลาที่จองแล้วของวันนั้น
  useEffect(() => {
    if (!doctor?.id || !selectedDate) return;

    setLoadingDay(true);
    const dayRef = doc(db, 'doctors', doctor.id, 'days', selectedDate);
    const unsub = onSnapshot(
      dayRef,
      (snap) => {
        const data = snap.exists() ? snap.data() : {};
        setTaken(data?.taken || {});
        setLoadingDay(false);
      },
      (err) => {
        console.log('load day err:', err);
        setTaken({});
        setLoadingDay(false);
      }
    );
    return () => unsub();
  }, [doctor?.id, selectedDate]);

  const markedDates = useMemo(() => {
    if (!selectedDate) return {};
    return {
      [selectedDate]: {
        selected: true,
        selectedColor: '#ef4444',
        selectedTextColor: '#fff',
      },
    };
  }, [selectedDate]);

  // today context (recomputed each render)
  const todayLocal = formatLocalDate();
  const now = new Date();
  const isToday = selectedDate === todayLocal;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  // Optional buffer (minutes) before the earliest bookable time today
  const BUFFER = 0; // เปลี่ยนเป็น 30 ถ้าต้องการเว้นล่วงหน้า 30 นาที

  const computePrice = (m) => (m === 60 ? 900 : 500);

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('กรุณาเลือกวันและเวลา');
      return;
    }
    navigation.navigate('Payment', {
      doctor, // ต้องมี { id, name, specialty }
      date: selectedDate,
      time: selectedTime,
      duration,
      total: computePrice(duration),
    });
  };

  return (
    <ScrollView style={{ backgroundColor: '#fff' }} contentContainerStyle={styles.container}>
      {/* Doctor header card */}
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {doctor?.name?.trim()?.slice(0, 1) ?? 'ด'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.docName}>{doctor?.name || 'แพทย์'}</Text>
          {!!doctor?.specialty && (
            <View style={styles.chip}>
              <Ionicons name="medkit-outline" size={14} color="#2563eb" />
              <Text style={styles.chipText}>{doctor.specialty}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Calendar */}
      <Text style={styles.sectionTitle}>เลือกวันนัดหมาย</Text>
      <Calendar
        onDayPress={(d) => {
          setSelectedDate(d.dateString);
          setSelectedTime(null); // reset เวลาเมื่อเปลี่ยนวัน
        }}
        markedDates={markedDates}
        minDate={todayLocal} // อนุญาตจองตั้งแต่วันนี้ขึ้นไป
        theme={{
          textDayFontWeight: '600',
          textMonthFontWeight: '800',
          textDayHeaderFontWeight: '700',
          todayTextColor: '#ef4444',
          arrowColor: '#ef4444',
        }}
        style={styles.calendar}
      />

      {/* Time slots */}
      <View style={styles.rowHeader}>
        <Text style={styles.sectionTitle}>เลือกเวลา</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.legendText}>ไม่ว่าง</Text>
          <View style={[styles.legendDot, { backgroundColor: '#e5e7eb' }]} />
          <Text style={styles.legendText}>ว่าง</Text>
          <View style={[styles.legendDot, { backgroundColor: '#fecaca' }]} />
          <Text style={styles.legendText}>ผ่านไปแล้ว</Text>
        </View>
      </View>

      {loadingDay ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#ef4444" />
          <Text style={{ marginLeft: 8, color: '#6b7280' }}>กำลังโหลดช่วงเวลา…</Text>
        </View>
      ) : (
        <View style={styles.timeBox}>
          {ALL_TIMES.map((t) => {
            const isTaken = !!taken[t];
            const isPastToday = isToday && toMinutes(t) <= (nowMinutes + BUFFER);
            const disabled = isTaken || isPastToday;
            const isSelected = selectedTime === t;
            return (
              <TouchableOpacity
                key={t}
                disabled={disabled}
                style={[
                  styles.timeChip,
                  isSelected && styles.timeChipActive,
                  disabled && styles.timeChipDisabled,
                ]}
                onPress={() => setSelectedTime(t)}
              >
                <Text
                  style={[
                    styles.timeText,
                    isSelected && { color: '#fff', fontWeight: '800' },
                  ]}
                >
                  {t} {isTaken ? '· ไม่ว่าง' : isPastToday ? '· ผ่านไปแล้ว' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Duration */}
      <Text style={styles.sectionTitle}>ระยะเวลา</Text>
      <View style={styles.timeBox}>
        {[30, 60].map((m) => {
          const active = duration === m;
          return (
            <TouchableOpacity
              key={m}
              style={[styles.timeChip, active && styles.timeChipActive]}
              onPress={() => setDuration(m)}
            >
              <Text style={[styles.timeText, active && { color: '#fff', fontWeight: '800' }]}>
                {m} นาที
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Summary Bar */}
      <View style={styles.summaryCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryTitle}>สรุปการนัดหมาย</Text>
          <Text style={styles.summaryLine}>
            <Ionicons name="calendar-outline" size={14} />{' '}
            {selectedDate || 'ยังไม่เลือกวัน'} · {selectedTime || 'ยังไม่เลือกเวลา'}
          </Text>
          <Text style={styles.summaryLine}>
            <Ionicons name="time-outline" size={14} /> {duration} นาที
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.priceLabel}>ยอดประมาณการ</Text>
          <Text style={styles.priceValue}>{computePrice(duration)} บาท</Text>
        </View>
      </View>

      {/* Confirm */}
      <TouchableOpacity
        style={[
          styles.confirmButton,
          (!selectedDate || !selectedTime) && { opacity: 0.5 },
        ]}
        onPress={handleConfirm}
        disabled={!selectedDate || !selectedTime}
        activeOpacity={0.9}
      >
        <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
        <Text style={styles.confirmText}>ยืนยันนัดหมาย</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  calendar: {
    borderRadius: radius,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
    marginBottom: 12,
  },

  // Header doctor card
  headerCard: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: radius,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#4338ca', fontWeight: '800', fontSize: 18 },
  docName: { fontSize: 18, fontWeight: '800', color: '#111827' },
  chip: {
    alignSelf: 'flex-start',
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#cffafe',
  },
  chipText: { color: '#2563eb', fontWeight: '600', fontSize: 12 },

  // Sections
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 6, marginBottom: 8 },

  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: '#6b7280', fontSize: 12 },

  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },

  // Time chips
  timeBox: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeChip: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  timeChipActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  timeChipDisabled: {
    opacity: 0.4,
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  timeText: { color: '#111827', fontWeight: '600' },

  // Summary
  summaryCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#fff',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  summaryTitle: { fontWeight: '800', color: '#111827', marginBottom: 2 },
  summaryLine: { color: '#374151', marginTop: 2 },

  priceLabel: { color: '#6b7280', fontSize: 12, textAlign: 'right' },
  priceValue: { color: '#111827', fontWeight: '900', fontSize: 18 },

  // Confirm button
  confirmButton: {
    marginTop: 16,
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: radius,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#ef4444',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  confirmText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
