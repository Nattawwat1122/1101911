// screens/DoctorRecommendScreen.js
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigation } from '@react-navigation/native';

const radius = 14;

export default function DoctorRecommendScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);

  const fetchFrom = async (collName) => {
    const qs = await getDocs(collection(db, collName));
    const arr = [];
    qs.forEach((d) => arr.push({ id: d.id, ...d.data() }));
    return arr;
  };

  const fetchDoctors = async () => {
    try {
      // พยายามอ่านจาก 'doctors' ก่อน ถ้าไม่มีค่อย fallback ไป 'psychiatrists'
      let list = await fetchFrom('doctors');
      if (!list || list.length === 0) {
        list = await fetchFrom('psychiatrists');
      }
      setDoctors(list);
    } catch (err) {
      console.log('fetch doctors error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const renderHeader = useMemo(
    () => (
      <>
        {/* ปุ่มลัดด้านบน */}
        <View style={styles.topButtons}>
          <TouchableOpacity
            onPress={() => navigation.navigate('UpcomingAppointments')}
            style={[styles.smallBtn, { backgroundColor: '#eef2ff', borderColor: '#e0e7ff' }]}
            activeOpacity={0.9}
          >
            <Ionicons name="time-outline" size={18} color="#4f46e5" />
            <Text style={[styles.smallBtnText, { color: '#4f46e5' }]}>นัดหมายในอนาคต</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('PastAppointments')}
            style={[styles.smallBtn, { backgroundColor: '#ecfeff', borderColor: '#cffafe' }]}
            activeOpacity={0.9}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#0891b2" />
            <Text style={[styles.smallBtnText, { color: '#0891b2' }]}>นัดหมายที่ผ่านมา</Text>
          </TouchableOpacity>
        </View>

        
      </>
    ),
    [navigation]
  );

  const DoctorCard = ({ item }) => {
    const initial = (item?.name || 'ด')[0];
    const specialty = item?.specialty || 'ไม่ระบุ';
    const contact = item?.contact || '';
    const avgRating = item?.avgRating;           // ถ้าใช้ตามที่ผมแนะนำใน DoctorDetail
    const ratingsCount = item?.ratingsCount;     // ถ้ามีเก็บไว้ใน doc

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('DoctorDetail', { doctor: item })}
      >
        {/* ซ้าย: อวาตาร์ */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>

        {/* ขวา: ข้อมูล */}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>

          <View style={styles.chipsRow}>
            <View style={[styles.chip, { backgroundColor: '#ecfeff', borderColor: '#cffafe' }]}>
              <Ionicons name="medkit-outline" size={14} color="#0891b2" />
              <Text style={[styles.chipText, { color: '#0891b2' }]}>{specialty}</Text>
            </View>

            {typeof avgRating === 'number' && ratingsCount > 0 && (
              <View style={[styles.chip, { backgroundColor: '#fff7ed', borderColor: '#ffedd5' }]}>
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text style={[styles.chipText, { color: '#b45309' }]}>
                  {avgRating} ★ · {ratingsCount}
                </Text>
              </View>
            )}
          </View>

          {!!contact && (
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${contact}`)}
              style={styles.callRow}
              activeOpacity={0.8}
            >
              <Ionicons name="call-outline" size={16} color="#10b981" />
              <Text style={styles.callText}>{contact}</Text>
            </TouchableOpacity>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={{ marginTop: 8, color: '#6b7280' }}>กำลังโหลดรายชื่อแพทย์…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={doctors}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={DoctorCard}
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={<Text style={{ color: '#9ca3af' }}>ยังไม่มีรายชื่อแพทย์</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },

  // ปุ่มลัด
  topButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  smallBtnText: { fontWeight: '700' },

  header: { fontSize: 18, fontWeight: '800', marginBottom: 12, color: '#111827' },

  // การ์ดแพทย์
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#4338ca', fontWeight: '800', fontSize: 18 },

  name: { fontSize: 16, fontWeight: '800', color: '#111827' },
  chipsRow: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontWeight: '600', fontSize: 12 },

  callRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  callText: { color: '#10b981', fontWeight: '700' },
});
