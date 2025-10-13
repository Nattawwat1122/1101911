// screens/DoctorDetailScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,

  TextInput,
  Alert,
  Linking,
  ScrollView, 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { db, auth } from '../firebase';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  orderBy,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';

const radius = 16;

export default function DoctorDetailScreen({ route }) {
  const navigation = useNavigation();
  const { doctor } = route.params;

  const [apptCount, setApptCount] = useState(0);

  // รีวิว
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [showMore, setShowMore] = useState(false);

  // ฟอร์มรีวิว
  const [pendingRating, setPendingRating] = useState(5);
  const [pendingText, setPendingText] = useState('');

  const doctorRoot = 'doctors';
  const legacyRoot = 'psychiatrists';

  const reviewPathCandidates = useMemo(
    () => [
      { root: doctorRoot, path: doc(db, doctorRoot, doctor.id) },
      { root: legacyRoot, path: doc(db, legacyRoot, doctor.id) },
    ],
    [doctor?.id]
  );

  // โหลดจำนวนการนัด
  const loadAppointmentCount = async () => {
    try {
      const qAppt = query(
        collection(db, 'appointments'),
        where('doctorId', '==', doctor.id)
      );
      const snap = await getDocs(qAppt);
      setApptCount(snap.size || 0);
    } catch (e) {
      console.log('load appt count error:', e);
    }
  };

  // โหลดรีวิว
  const loadReviews = async () => {
    try {
      let list = [];
      for (const cand of reviewPathCandidates) {
        const ref = collection(cand.path, 'reviews');
        const snap = await getDocs(query(ref, orderBy('createdAt', 'desc')));
        if (!snap.empty) {
          list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          break;
        }
      }
      setReviewCount(list.length);
      setReviews(list);
      if (list.length) {
        const sum = list.reduce((s, r) => s + (Number(r.rating) || 0), 0);
        setAvgRating(Math.round((sum / list.length) * 10) / 10);
      } else {
        setAvgRating(0);
      }
    } catch (e) {
      console.log('load reviews error:', e);
    }
  };

  useEffect(() => {
    if (!doctor?.id) return;
    loadAppointmentCount();
    loadReviews();
  }, [doctor?.id]);

  const onSubmitReview = async () => {
    if (!pendingRating || pendingRating < 1 || pendingRating > 5) {
      Alert.alert('ให้คะแนน 1-5 ดาว');
      return;
    }
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('กรุณาเข้าสู่ระบบก่อน');
        return;
      }

      let displayName = '';
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) displayName = userSnap.data()?.userID || '';
      } catch (e) {
        console.log('fetch userID error:', e);
      }
      if (!displayName) displayName = user.email || 'ผู้ใช้';

      const target = reviewPathCandidates[0];
      const reviewsRef = collection(target.path, 'reviews');
      await addDoc(reviewsRef, {
        rating: Number(pendingRating),
        text: pendingText || '',
        username: displayName,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });

      setPendingRating(5);
      setPendingText('');
      Alert.alert('ขอบคุณสำหรับรีวิว!');
      loadReviews();
    } catch (e) {
      console.log('add review error:', e);
      Alert.alert('ไม่สามารถส่งรีวิวได้');
    }
  };

  const educationList = useMemo(() => {
    const edu = doctor?.education;
    if (!edu) return [];
    if (Array.isArray(edu)) return edu.filter(Boolean);
    return [String(edu)].filter(Boolean);
  }, [doctor?.education]);

  const Star = ({ active, onPress, size = 22 }) => (
    <TouchableOpacity onPress={onPress} style={{ paddingHorizontal: 2 }}>
      <Text style={{ fontSize: size }}>{active ? '★' : '☆'}</Text>
    </TouchableOpacity>
  );

  const RatingBar = ({ value, onChange }) => (
    <View style={{ flexDirection: 'row', marginTop: 6 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} active={i <= value} onPress={() => onChange?.(i)} size={26} />
      ))}
    </View>
  );

  const displayReviews = showMore ? reviews : reviews.slice(0, 3);

  // --- [แก้ไข] เปลี่ยน View หลักเป็น ScrollView ---
  return (
    <ScrollView style={styles.screen}>
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{doctor?.name?.[0] ?? 'ด'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{doctor.name}</Text>
          <View style={styles.chipsRow}>
            {!!doctor.specialty && (
              <View style={styles.chip}>
                <Ionicons name="medkit-outline" size={14} color="#2563eb" />
                <Text style={styles.chipText}>{doctor.specialty}</Text>
              </View>
            )}
            <View style={[styles.chip, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text style={[styles.chipText, { color: '#b45309' }]}>
                {avgRating > 0 ? `${avgRating} ★ • ${reviewCount} รีวิว` : 'ยังไม่มีรีวิว'}
              </Text>
            </View>
            {!!doctor.contact && (
              <TouchableOpacity
                style={[styles.chip, { backgroundColor: '#eef2ff', borderColor: '#e0e7ff' }]}
                onPress={() => Linking.openURL(`tel:${doctor.contact}`)}
              >
                <Ionicons name="call-outline" size={14} color="#4f46e5" />
                <Text style={[styles.chipText, { color: '#4f46e5' }]}>{doctor.contact}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* KPIs */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiNumber}>{apptCount}</Text>
          <Text style={styles.kpiLabel}>ครั้งที่มีการนัดหมาย</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiNumber}>{avgRating > 0 ? `${avgRating} ★` : '-'}</Text>
          <Text style={styles.kpiLabel}>คะแนนเฉลี่ย</Text>
        </View>
      </View>

      {/* Education */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>ประวัติการศึกษา</Text>
        {educationList.length === 0 ? (
          <Text style={styles.muted}>–</Text>
        ) : (
          educationList.map((line, idx) => (
            <Text key={idx} style={styles.eduLine}>• {line}</Text>
          ))
        )}
      </View>

      {/* ปุ่มนัดหมาย */}
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => navigation.navigate('BookAppointment', { doctor })}
        activeOpacity={0.9}
      >
        <Ionicons name="calendar-outline" size={18} color="#fff" />
        <Text style={styles.primaryBtnText}>นัดหมายออนไลน์</Text>
      </TouchableOpacity>

      {/* ฟอร์มรีวิว */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>ให้คะแนนและรีวิว</Text>
        <RatingBar value={pendingRating} onChange={setPendingRating} />
        <TextInput
          style={styles.input}
          placeholder="เขียนความเห็นของคุณ (ไม่บังคับ)"
          value={pendingText}
          onChangeText={setPendingText}
          multiline
        />
        <TouchableOpacity style={styles.darkBtn} onPress={onSubmitReview}>
          <Text style={styles.darkBtnText}>ส่งรีวิว</Text>
        </TouchableOpacity>
      </View>

      {/* รีวิวล่าสุด */}
      <Text style={[styles.sectionTitle, { marginTop: 8, marginBottom: 8 }]}>
        รีวิวล่าสุด
      </Text>

      {reviews.length === 0 ? (
        <Text style={styles.muted}>ยังไม่มีรีวิว</Text>
      ) : (
        <>
          {/* --- [แก้ไข] เปลี่ยนจาก FlatList มาใช้ map --- */}
          {displayReviews.map((item) => (
            <View key={item.id} style={styles.reviewCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.reviewName}>
                  {item.username || item.userName || item.userEmail || 'ผู้ใช้'}
                </Text>
                <Text style={styles.reviewStars}>
                  {'★'.repeat(item.rating || 0)}
                  {'☆'.repeat(Math.max(0, 5 - (item.rating || 0)))}
                </Text>
              </View>
              {!!item.text && <Text style={styles.reviewText}>{item.text}</Text>}
              {item.createdAt?.toDate && (
                <Text style={styles.reviewDate}>
                  {item.createdAt.toDate().toLocaleString()}
                </Text>
              )}
            </View>
          ))}
          
          {reviews.length > 3 && (
            <TouchableOpacity
              style={styles.moreBtn}
              onPress={() => setShowMore(!showMore)}
              activeOpacity={0.9}
            >
              <Ionicons name={showMore ? 'chevron-up' : 'chevron-down'} size={18} color="#2563eb" />
              <Text style={styles.moreText}>{showMore ? 'ย่อรีวิว' : 'ดูเพิ่มเติม'}</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff', padding: 16 },

  headerCard: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: radius,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#4338ca' },
  name: { fontSize: 20, fontWeight: '800', color: '#111827' },
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
  chipText: { fontSize: 12, fontWeight: '600' },

  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  kpiCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  kpiNumber: { fontSize: 18, fontWeight: '800', color: '#1f2937' },
  kpiLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },

  sectionCard: {
    padding: 14,
    borderRadius: radius,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  muted: { color: '#9ca3af', marginTop: 4 },
  eduLine: { fontSize: 14, color: '#374151' },

  primaryBtn: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: radius,
    marginBottom: 12,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: radius,
    padding: 12,
    minHeight: 60,
    marginTop: 8,
    textAlignVertical: 'top',
  },
  darkBtn: {
    backgroundColor: '#111827',
    borderRadius: radius,
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 10,
  },
  darkBtnText: { color: '#fff', fontWeight: '800' },

  reviewCard: {
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: radius,
    padding: 12,
    marginBottom: 10,
  },
  reviewName: { fontWeight: '800', color: '#111827' },
  reviewStars: { color: '#f59e0b', fontWeight: '800' },
  reviewText: { marginTop: 6, color: '#374151' },
  reviewDate: { marginTop: 4, fontSize: 12, color: '#9ca3af' },

  moreBtn: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#eff6ff',
    marginBottom: 20, // เพิ่มระยะห่างด้านล่างเล็กน้อย
  },
  moreText: { color: '#2563eb', fontWeight: '800' },
});

