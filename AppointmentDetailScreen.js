// screens/AppointmentDetailScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  Linking, ActivityIndicator, ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { db } from '../firebase';
import { doc, onSnapshot, runTransaction, deleteField } from 'firebase/firestore';

const radius = 14;

export default function AppointmentDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { appt: initAppt } = route.params || {};
  const [appt, setAppt] = useState(initAppt || null);
  const [loading, setLoading] = useState(!initAppt);

  const apptRef = useMemo(
    () => (initAppt?.id ? doc(db, 'appointments', initAppt.id) : null),
    [initAppt?.id]
  );

  useEffect(() => {
    if (!apptRef) return;
    const unsub = onSnapshot(
      apptRef,
      (snap) => {
        setAppt(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [apptRef]);

  const handleCancel = async () => {
    if (!appt?.id || !appt?.doctorId || !appt?.date || !appt?.time) {
      Alert.alert('ข้อมูลไม่ครบ', 'ไม่สามารถยกเลิกนัดหมายได้');
      return;
    }
    Alert.alert(
      'ยืนยันการยกเลิก',
      `ต้องการยกเลิกนัดหมายกับ ${appt.doctorName || 'แพทย์'} วันที่ ${appt.date} เวลา ${appt.time} ใช่ไหม?`,
      [
        { text: 'ไม่ใช่', style: 'cancel' },
        {
          text: 'ยกเลิกนัดหมาย',
          style: 'destructive',
          onPress: async () => {
            try {
              await runTransaction(db, async (tx) => {
                const apptDoc = doc(db, 'appointments', appt.id);
                const dayRef = doc(db, 'doctors', appt.doctorId, 'days', appt.date);
                const daySnap = await tx.get(dayRef);
                if (daySnap.exists()) {
                  const taken = daySnap.data()?.taken || {};
                  if (taken[appt.time] === appt.id) {
                    tx.update(dayRef, { [`taken.${appt.time}`]: deleteField() });
                  }
                }
                tx.update(apptDoc, { status: 'cancelled' });
              });
              Alert.alert('ยกเลิกสำเร็จ', 'สล็อตเวลาถูกคืนเรียบร้อย');
              navigation.goBack();
            } catch (e) {
              Alert.alert('ผิดพลาด', 'ไม่สามารถยกเลิกได้');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const StatusBadge = ({ status }) => {
    const map = {
      upcoming: { text: 'กำลังมาถึง', bg: '#ecfeff', bd: '#cffafe', color: '#0891b2', icon: 'time-outline' },
      cancelled: { text: 'ยกเลิกแล้ว', bg: '#fee2e2', bd: '#fecaca', color: '#991b1b', icon: 'close-circle-outline' },
      completed: { text: 'เสร็จสิ้น', bg: '#dcfce7', bd: '#bbf7d0', color: '#166534', icon: 'checkmark-circle-outline' },
      default: { text: String(status || 'unknown'), bg: '#f3f4f6', bd: '#e5e7eb', color: '#374151', icon: 'help-circle-outline' },
    };
    const s = map[status] || map.default;
    return (
      <View style={[styles.pill, { backgroundColor: s.bg, borderColor: s.bd }]}>
        <Ionicons name={s.icon} size={14} color={s.color} />
        <Text style={[styles.pillText, { color: s.color }]}>{s.text}</Text>
      </View>
    );
  };

  if (loading || !appt) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={{ marginTop: 8, color: '#6b7280' }}>กำลังโหลดรายละเอียดนัดหมาย…</Text>
      </View>
    );
  }

  const canCancel = appt?.status === 'upcoming';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(appt.doctorName || 'พ')[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{appt.doctorName || 'แพทย์'}</Text>
          <View style={styles.statusRow}>
            <StatusBadge status={appt.status} />
            {appt.duration ? (
              <View style={[styles.pill, { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' }]}>
                <Ionicons name="time-outline" size={14} color="#6d28d9" />
                <Text style={[styles.pillText, { color: '#6d28d9' }]}>{appt.duration} นาที</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* When / Who / Price / Contact */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>วันและเวลา</Text>
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={18} color="#374151" />
          <Text style={styles.rowText}>{appt.date} · {appt.time}</Text>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>ผู้รับบริการ</Text>
        <View style={styles.row}>
          <Ionicons name="person-circle-outline" size={18} color="#374151" />
          <Text style={styles.rowText}>{appt.userName || appt.userEmail || 'ผู้ใช้'}</Text>
        </View>

        {!!appt?.price && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>ค่าใช้จ่าย</Text>
            <View style={styles.row}>
              <Ionicons name="cash-outline" size={18} color="#374151" />
              <Text style={[styles.rowText, { fontWeight: '800' }]}>{appt.price} บาท</Text>
            </View>
          </>
        )}

        {!!appt?.doctorContact && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>ติดต่อแพทย์</Text>
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:${appt.doctorContact}`)}
              activeOpacity={0.9}
            >
              <Ionicons name="call-outline" size={18} color="#10b981" />
              <Text style={styles.callBtnText}>{appt.doctorContact}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('DoctorDetail', { doctor: { id: appt.doctorId, name: appt.doctorName } })}
          activeOpacity={0.9}
        >
          <Ionicons name="person-outline" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>ดูโปรไฟล์แพทย์</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, !canCancel && { opacity: 0.5 }]}
          disabled={!canCancel}
          onPress={handleCancel}
          activeOpacity={0.9}
        >
          <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
          <Text style={[styles.secondaryBtnText, { color: '#ef4444' }]}>ยกเลิกนัดหมาย</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', flex: 1, padding: 16 },
  headerCard: {
    flexDirection: 'row', gap: 12, marginBottom: 12, padding: 14, borderRadius: radius,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#4338ca', fontWeight: '800', fontSize: 20 },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  statusRow: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  sectionCard: {
    padding: 14, borderRadius: radius, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f5f9',
    marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  rowText: { color: '#374151', fontSize: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  pillText: { fontWeight: '700', fontSize: 12 },
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  callBtnText: { color: '#10b981', fontWeight: '800' },
  primaryBtn: {
    flex: 1, backgroundColor: '#ef4444', paddingVertical: 12, borderRadius: radius, alignItems: 'center',
    justifyContent: 'center', flexDirection: 'row', gap: 8, shadowColor: '#ef4444', shadowOpacity: 0.2,
    shadowRadius: 8, shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  secondaryBtn: {
    flex: 1, backgroundColor: '#fff', paddingVertical: 12, borderRadius: radius, alignItems: 'center',
    justifyContent: 'center', flexDirection: 'row', gap: 8, borderWidth: 1, borderColor: '#fee2e2',
  },
  secondaryBtnText: { fontWeight: '800' },
});
