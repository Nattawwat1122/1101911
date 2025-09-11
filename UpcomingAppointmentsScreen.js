// screens/UpcomingAppointmentsScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, FlatList } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, getDocs, doc, runTransaction, deleteField } from 'firebase/firestore';
import { db, auth } from '../firebase';

const radius = 14;

export default function UpcomingAppointmentsScreen() {
  const navigation = useNavigation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = auth.currentUser?.uid;

  const fetchData = async () => {
    try {
      if (!userId) return;
      setLoading(true);
      const q = query(
        collection(db, 'appointments'),
        where('status', '==', 'upcoming'),
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);
      const arr = [];
      snap.forEach((d) => arr.push({ ...d.data(), id: d.id }));
      setData(arr);
    } catch (e) {
      Alert.alert('ผิดพลาด', 'โหลดรายการนัดหมายไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCancel = async (appt) => {
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
                const apptRef = doc(db, 'appointments', appt.id);
                const dayRef = doc(db, 'doctors', appt.doctorId, 'days', appt.date);
                const daySnap = await tx.get(dayRef);
                if (daySnap.exists()) {
                  const taken = daySnap.data()?.taken || {};
                  if (taken[appt.time] === appt.id) {
                    tx.update(dayRef, { [`taken.${appt.time}`]: deleteField() });
                  }
                }
                tx.update(apptRef, { status: 'cancelled' });
              });
              Alert.alert('ยกเลิกสำเร็จ', 'สล็อตเวลาถูกคืนเรียบร้อย');
              fetchData();
            } catch (e) {
              Alert.alert('ผิดพลาด', 'ไม่สามารถยกเลิกได้');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(item.doctorName || 'พ')[0]}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.doctorName || 'แพทย์'}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.pill, { backgroundColor: '#ecfeff', borderColor: '#cffafe' }]}>
              <Ionicons name="calendar-outline" size={14} color="#0891b2" />
              <Text style={[styles.pillText, { color: '#0891b2' }]}>{item.date} · {item.time}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' }]}>
              <Ionicons name="time-outline" size={14} color="#6d28d9" />
              <Text style={[styles.pillText, { color: '#6d28d9' }]}>{item.duration} นาที</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.detailBtn}
          onPress={() => navigation.navigate('AppointmentDetail', { appt: item })}
          activeOpacity={0.9}
        >
          <Ionicons name="information-circle-outline" size={18} color="#2563eb" />
          <Text style={styles.detailText}>ดูรายละเอียด</Text>
          <Ionicons name="chevron-forward" size={18} color="#93c5fd" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item)} activeOpacity={0.9}>
          <Ionicons name="close-circle-outline" size={18} color="#fff" />
          <Text style={styles.cancelText}>ยกเลิกนัดหมาย</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={{ marginTop: 8, color: '#6b7280' }}>กำลังโหลดนัดหมาย…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>นัดหมายในอนาคต</Text>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          { paddingBottom: 24 },
          data.length === 0 && { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
        ]}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-number-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>ยังไม่มีนัดหมาย</Text>
            <Text style={styles.emptyText}>ลองกลับไปเลือกแพทย์และทำการนัดหมายดูนะ</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 12, color: '#111827' },
  card: {
    padding: 14, borderRadius: radius, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', gap: 12, marginBottom: 10, alignItems: 'center' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#4338ca', fontWeight: '800', fontSize: 18 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  statusRow: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  pillText: { fontWeight: '700', fontSize: 12 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  detailBtn: {
    flex: 1, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#dbeafe', paddingVertical: 12, borderRadius: radius,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6,
  },
  detailText: { color: '#2563eb', fontWeight: '800' },
  cancelBtn: {
    flex: 1, backgroundColor: '#ef4444', paddingVertical: 12, borderRadius: radius, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8, shadowColor: '#ef4444', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  cancelText: { color: 'white', fontWeight: '800' },
  emptyBox: { alignItems: 'center', gap: 6 },
  emptyTitle: { marginTop: 6, fontWeight: '800', color: '#334155' },
  emptyText: { color: '#64748b' },
});
