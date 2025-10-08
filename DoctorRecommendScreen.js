// screens/DoctorRecommendScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Linking,
  TextInput,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigation, useRoute } from '@react-navigation/native';

const radius = 14;

// แมป "หมวดไดอารี่" -> "แท็กแพทย์" (สำหรับค้น initial)
const CATEGORY_TO_TAGS = {
  'ความเครียด/งาน': ['ความเครียด', 'ภาวะหมดไฟ', 'องค์กร/งาน'],
  'ความสัมพันธ์/ครอบครัว': ['ความสัมพันธ์', 'คู่รัก', 'ครอบครัว'],
  'ซึมเศร้า': ['ซึมเศร้า', 'อารมณ์เศร้า', 'พลังงานต่ำ'],
  'วิตกกังวล/แพนิค': ['วิตกกังวล', 'แพนิค', 'ย้ำคิดย้ำทำ'],
  'นอนไม่หลับ': ['นอนหลับ', 'นอนไม่หลับ'],
  'การเรียน/วัยเรียน': ['วัยเรียน', 'ความกดดันการเรียน'],
  'การเสพติด/พฤติกรรม': ['การเสพติด', 'เกม/มือถือ', 'สารเสพติด'],
};

const norm = (v) => String(v ?? '').trim().toLowerCase();
const normArr = (arr) => (arr || []).map(norm);

// แยกสาขาเฉพาะทางเป็น “รายการ” จากสตริงคั่นด้วย , / | / 、 เป็นต้น
const splitSpecialties = (value) =>
  String(value ?? '')
    .split(/,|\u3001|\||\/|·/g) // , 、 | / ·
    .map((s) => s.trim())
    .filter(Boolean);

export default function DoctorRecommendScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const categories = route.params?.categories ?? [];

  // รวมแท็กจากหมวด (normalize & จำกัด 10 ตามข้อจำกัด Firestore)
  const wantedTags = useMemo(() => {
    const set = new Set();
    categories.forEach((cat) => {
      const mapped = CATEGORY_TO_TAGS[cat] || [cat];
      mapped.forEach((t) => set.add(norm(t)));
    });
    return Array.from(set).slice(0, 10);
  }, [categories]);

  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]); // raw list

  // ตัวกรอง UI
  const [search, setSearch] = useState('');
  const [expandedFilter, setExpandedFilter] = useState(true);
  const [selectedSpecialties, setSelectedSpecialties] = useState(new Set());
  const [minRating, setMinRating] = useState(0);
  const [onlyWithPhone, setOnlyWithPhone] = useState(false);
  const [selectedTags, setSelectedTags] = useState(new Set());
  const [sortKey, setSortKey] = useState('rating'); // rating|reviews|name

  const hydrate = (doc) => {
    const data = doc.data();

    // แท็ก
    const tags = Array.isArray(data?.tags) ? data.tags : [];

    // แยก specialty เป็นรายการ + เก็บเวอร์ชัน normalize เพื่อค้น/กรอง
    const specialties = splitSpecialties(data?.specialty);
    const _normSpecialties = specialties.map(norm);

    // สร้าง avgRating จากฟิลด์รวม ถ้ามี
    let ratingsCount = typeof data?.ratingsCount === 'number' ? data.ratingsCount : 0;
    let ratingsSum = typeof data?.ratingsSum === 'number' ? data.ratingsSum : 0;
    let avgRating =
      typeof data?.avgRating === 'number'
        ? data.avgRating
        : ratingsCount > 0
        ? ratingsSum / ratingsCount
        : undefined;

    return {
      id: doc.id,
      ...data,
      tags,
      specialties, // เป็น array เช่น ["จิตเวชผู้สูงอายุ", "ภาวะสมองเสื่อม", "อัลไซเมอร์"]
      ratingsCount,
      ratingsSum,
      avgRating,
      _normTags: normArr(tags),
      _normName: norm(data?.name),
      _normSpecialties,
    };
  };

  const fetchAll = async (coll) => {
    const snap = await getDocs(collection(db, coll));
    const arr = [];
    snap.forEach((d) => arr.push(hydrate(d)));
    return arr;
  };

  // ถ้าเอกสารยังไม่มีฟิลด์รวม ให้ดึงซับคอลเลกชัน reviews มาคำนวณ (fallback)
  const enrichRatingsFromSubcollection = async (list) => {
    const next = await Promise.all(
      list.map(async (it) => {
        if (typeof it.avgRating === 'number' && it.ratingsCount > 0) return it;

        try {
          const revSnap = await getDocs(collection(db, 'doctors', it.id, 'reviews'));
          if (revSnap.empty) return it;

          let sum = 0;
          let count = 0;
          revSnap.forEach((r) => {
            const v = r.data()?.rating;
            if (typeof v === 'number') {
              sum += v;
              count += 1;
            }
          });
          if (count > 0) {
            return {
              ...it,
              ratingsCount: count,
              ratingsSum: sum,
              avgRating: sum / count,
            };
          }
        } catch (e) {
          // เงียบๆ ถ้าดึงไม่ได้
        }
        return it;
      })
    );
    return next;
  };

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      let list = [];

      // ถ้ามี wantedTags ให้ลอง query แบบ array-contains-any ในคอลเลกชันหลักก่อน
      if (wantedTags.length > 0) {
        const q1 = query(
          collection(db, 'doctors'),
          where('tags', 'array-contains-any', wantedTags),
          limit(50)
        );
        const s1 = await getDocs(q1);
        s1.forEach((d) => list.push(hydrate(d)));

        // ถ้ายังไม่เจอเลย ลองคอลเลกชันเก่า
        if (list.length === 0) {
          const q2 = query(
            collection(db, 'psychiatrists'),
            where('tags', 'array-contains-any', wantedTags),
            limit(50)
          );
          const s2 = await getDocs(q2);
          s2.forEach((d) => list.push(hydrate(d)));
        }
      }

      // ถ้ายังว่างหรือไม่มีแท็ก → fallback ดึงทั้งหมด
      if (list.length === 0) {
        list = await fetchAll('doctors');
        if (!list || list.length === 0) list = await fetchAll('psychiatrists');
      }

      // กำจัดซ้ำ
      const map = new Map();
      list.forEach((it) => map.set(it.id, it));
      list = Array.from(map.values());

      // เติมเรตติ้งจาก subcollection ถ้าเอกสารยังไม่มีค่า
      list = await enrichRatingsFromSubcollection(list);

      setDoctors(list);
    } catch (e) {
      console.log('fetch doctors error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantedTags.join('|')]);

  // อนุพันธ์: specialties & tags (แยกเป็นหัวข้อรายตัว)
  const allSpecialties = useMemo(() => {
    const set = new Set();
    doctors.forEach((d) => (d.specialties || []).forEach((sp) => set.add(String(sp))));
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b), 'th'));
  }, [doctors]);

  const allTags = useMemo(() => {
    const set = new Set();
    doctors.forEach((d) => (d?.tags || []).forEach((t) => set.add(String(t))));
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b), 'th'));
  }, [doctors]);

  // ฟิลเตอร์ + เรียง: ค้นหาได้จากชื่อ/สาขา/แท็ก
  const filteredDoctors = useMemo(() => {
    const s = norm(search);
    const specSet = new Set(Array.from(selectedSpecialties).map(norm));
    const tagSet = new Set(Array.from(selectedTags).map(norm));

    let list = doctors.filter((d) => {
      // ค้นหา: ชื่อ หรือ สาขา (รายการ) หรือ แท็ก
      if (s) {
        const inName = (d._normName || '').includes(s);
        const inSpec = (d._normSpecialties || []).some((x) => x.includes(s));
        const inTags = (d._normTags || []).some((t) => t.includes(s));
        if (!inName && !inSpec && !inTags) return false;
      }

      // กรองตามสาขาที่เลือก (มี intersect อย่างน้อย 1)
      if (specSet.size > 0) {
        const arr = d?._normSpecialties || [];
        if (!arr.some((x) => specSet.has(x))) return false;
      }

      // เรตติ้งขั้นต่ำ
      if (minRating > 0) {
        if (typeof d?.avgRating !== 'number' || d.avgRating < minRating) return false;
      }

      // ต้องมีเบอร์
      if (onlyWithPhone && !String(d?.contact || '').trim()) return false;

      // แท็กที่เลือก (มี intersect)
      if (tagSet.size > 0) {
        const arr = d?._normTags || [];
        if (!arr.some((t) => tagSet.has(t))) return false;
      }
      return true;
    });

    if (sortKey === 'rating') {
      list.sort((a, b) => {
        const ar = typeof a?.avgRating === 'number' ? a.avgRating : 0;
        const br = typeof b?.avgRating === 'number' ? b.avgRating : 0;
        if (br !== ar) return br - ar;
        const ac = typeof a?.ratingsCount === 'number' ? a.ratingsCount : 0;
        const bc = typeof b?.ratingsCount === 'number' ? b.ratingsCount : 0;
        return bc - ac;
      });
    } else if (sortKey === 'reviews') {
      list.sort((a, b) => {
        const ac = typeof a?.ratingsCount === 'number' ? a.ratingsCount : 0;
        const bc = typeof b?.ratingsCount === 'number' ? b.ratingsCount : 0;
        if (bc !== ac) return bc - ac;
        const ar = typeof a?.avgRating === 'number' ? a.avgRating : 0;
        const br = typeof b?.avgRating === 'number' ? b.avgRating : 0;
        return br - ar;
      });
    } else {
      list.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'th'));
    }

    return list;
  }, [doctors, search, selectedSpecialties, minRating, onlyWithPhone, selectedTags, sortKey]);

  // Header + ฟิลเตอร์
  const renderHeader = useMemo(
    () => (
      <View>
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

        {categories.length > 0 ? (
          <>
            <Text style={styles.header}>กำลังกรองจากหมวดไดอารี่</Text>
            <View style={styles.chipsRow}>
              {categories.map((c) => (
                <View
                  key={`cat-${c}`}
                  style={[styles.chip, { backgroundColor: '#eff6ff', borderColor: '#dbeafe' }]}
                >
                  <Ionicons name="pricetag-outline" size={14} color="#2563eb" />
                  <Text style={[styles.chipText, { color: '#2563eb' }]}>{c}</Text>
                </View>
              ))}
            </View>

            {wantedTags.length > 0 && (
              <View style={[styles.chipsRow, { marginTop: 8 }]}>
                {wantedTags.map((t) => (
                  <View
                    key={`tag-${t}`}
                    style={[styles.chip, { backgroundColor: '#f9fafb', borderColor: '#f3f4f6' }]}
                  >
                    <Text style={[styles.chipText, { color: '#374151' }]}>{t}</Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              onPress={() => navigation.setParams({ categories: [] })}
              style={[styles.smallBtn, { backgroundColor: '#fef2f2', borderColor: '#fee2e2', marginTop: 10 }]}
              activeOpacity={0.9}
            >
              <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
              <Text style={[styles.smallBtnText, { color: '#ef4444' }]}>ล้างตัวกรองไดอารี่</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.header}>รายชื่อจิตแพทย์ทั้งหมด</Text>
        )}

        {/* Search + toggle filters */}
        <View style={[styles.searchRow, { marginTop: 12 }]}>
          <Ionicons name="search-outline" size={18} color="#6b7280" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="ค้นหาด้วยชื่อแพทย์ สาขา หรือแท็ก…"
            style={styles.searchInput}
            placeholderTextColor="#9ca3af"
            autoCorrect={false}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setExpandedFilter((v) => !v)} style={styles.filterToggler}>
            <Ionicons name={expandedFilter ? 'options' : 'options-outline'} size={18} color="#111827" />
            <Text style={{ fontWeight: '700', color: '#111827', marginLeft: 6 }}>ตัวกรอง</Text>
          </TouchableOpacity>
        </View>

        {expandedFilter && (
          <View style={styles.filterCard}>
            {/* สาขาเฉพาะทาง (รายหัวข้อ) */}
            {allSpecialties.length > 0 && (
              <>
                <Text style={styles.filterGroupTitle}>สาขาเฉพาะทาง</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
                  <View style={styles.chipsRow}>
                    {allSpecialties.map((sp) => {
                      const active = selectedSpecialties.has(sp);
                      return (
                        <TouchableOpacity
                          key={`sp-${sp}`}
                          onPress={() => {
                            const next = new Set(selectedSpecialties);
                            if (active) next.delete(sp);
                            else next.add(sp);
                            setSelectedSpecialties(next);
                          }}
                          style={[
                            styles.chip,
                            active
                              ? { backgroundColor: '#e0f2fe', borderColor: '#bae6fd' }
                              : { backgroundColor: '#f9fafb', borderColor: '#f3f4f6' },
                          ]}
                          activeOpacity={0.9}
                        >
                          <Ionicons name="medkit-outline" size={14} color={active ? '#0369a1' : '#6b7280'} />
                          <Text style={[styles.chipText, { color: active ? '#075985' : '#374151' }]}>{sp}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </>
            )}

            {/* เรตติ้งขั้นต่ำ */}
            <Text style={[styles.filterGroupTitle, { marginTop: 12 }]}>เรตติ้งขั้นต่ำ</Text>
            <View style={styles.chipsRow}>
              {[0, 4.0, 4.5].map((r) => {
                const active = minRating === r;
                const label = r === 0 ? 'ทั้งหมด' : `≥ ${r.toFixed(1)} ★`;
                return (
                  <TouchableOpacity
                    key={`rating-${r}`}
                    onPress={() => setMinRating(r)}
                    style={[
                      styles.chip,
                      active
                        ? { backgroundColor: '#fff7ed', borderColor: '#ffedd5' }
                        : { backgroundColor: '#f9fafb', borderColor: '#f3f4f6' },
                    ]}
                    activeOpacity={0.9}
                  >
                    <Ionicons name="star" size={14} color={active ? '#b45309' : '#6b7280'} />
                    <Text style={[styles.chipText, { color: active ? '#b45309' : '#374151' }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* เฉพาะที่มีเบอร์ */}
            <View style={[styles.rowWrap, { marginTop: 12 }]}>
              <TouchableOpacity
                onPress={() => setOnlyWithPhone((v) => !v)}
                style={[
                  styles.toggleBtn,
                  onlyWithPhone
                    ? { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' }
                    : { backgroundColor: '#f9fafb', borderColor: '#f3f4f6' },
                ]}
                activeOpacity={0.9}
              >
                <Ionicons name="call-outline" size={16} color={onlyWithPhone ? '#166534' : '#6b7280'} />
                <Text style={[styles.toggleText, { color: onlyWithPhone ? '#166534' : '#374151' }]}>
                  เฉพาะที่มีเบอร์ติดต่อ
                </Text>
              </TouchableOpacity>
            </View>

            {/* แท็ก */}
            {allTags.length > 0 && (
              <>
                <Text style={[styles.filterGroupTitle, { marginTop: 12 }]}>แท็ก</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
                  <View style={styles.chipsRow}>
                    {allTags.map((tg) => {
                      const active = selectedTags.has(tg);
                      return (
                        <TouchableOpacity
                          key={`tg-${tg}`}
                          onPress={() => {
                            const next = new Set(selectedTags);
                            if (active) next.delete(tg);
                            else next.add(tg);
                            setSelectedTags(next);
                          }}
                          style={[
                            styles.chip,
                            active
                              ? { backgroundColor: '#eef2ff', borderColor: '#e0e7ff' }
                              : { backgroundColor: '#f9fafb', borderColor: '#f3f4f6' },
                          ]}
                          activeOpacity={0.9}
                        >
                          <Ionicons name="pricetag-outline" size={14} color={active ? '#4f46e5' : '#6b7280'} />
                          <Text style={[styles.chipText, { color: active ? '#4f46e5' : '#374151' }]}>{tg}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </>
            )}

            {/* เรียงลำดับ */}
            <Text style={[styles.filterGroupTitle, { marginTop: 12 }]}>เรียงลำดับ</Text>
            <View style={styles.chipsRow}>
              {[
                { k: 'rating', label: 'เรตติ้งสูง → ต่ำ' },
                { k: 'reviews', label: 'จำนวนรีวิวมาก → น้อย' },
                { k: 'name', label: 'ชื่อ A → Z' },
              ].map((opt) => {
                const active = sortKey === opt.k;
                return (
                  <TouchableOpacity
                    key={`sort-${opt.k}`}
                    onPress={() => setSortKey(opt.k)}
                    style={[
                      styles.chip,
                      active
                        ? { backgroundColor: '#e5e7eb', borderColor: '#d1d5db' }
                        : { backgroundColor: '#f9fafb', borderColor: '#f3f4f6' },
                    ]}
                    activeOpacity={0.9}
                  >
                    <Ionicons
                      name={opt.k === 'name' ? 'text-outline' : opt.k === 'reviews' ? 'people-outline' : 'star-outline'}
                      size={14}
                      color={active ? '#111827' : '#6b7280'}
                    />
                    <Text style={[styles.chipText, { color: active ? '#111827' : '#374151' }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ปุ่มล้างตัวกรอง */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setSearch('');
                  setSelectedSpecialties(new Set());
                  setMinRating(0);
                  setOnlyWithPhone(false);
                  setSelectedTags(new Set());
                  setSortKey('rating');
                }}
                style={[styles.smallBtn, { backgroundColor: '#fef2f2', borderColor: '#fee2e2' }]}
                activeOpacity={0.9}
              >
                <Ionicons name="refresh-outline" size={18} color="#ef4444" />
                <Text style={[styles.smallBtnText, { color: '#ef4444' }]}>ล้างตัวกรองทั้งหมด</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    ),
    [
      navigation,
      categories,
      wantedTags,
      search,
      expandedFilter,
      allSpecialties,
      allTags,
      selectedSpecialties,
      minRating,
      onlyWithPhone,
      selectedTags,
      sortKey,
    ]
  );

  const DoctorCard = ({ item }) => {
    const initial = (item?.name || 'ด')[0];
    const specialties = item?.specialties || [];
    const contact = item?.contact || '';
    const avgRating = item?.avgRating;
    const ratingsCount = item?.ratingsCount;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('DoctorDetail', { doctor: item })}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item?.name || '-'}</Text>

          <View style={styles.chipsRow}>
            {specialties.slice(0, 2).map((sp) => (
              <View key={`sp-chip-${item.id}-${sp}`} style={[styles.chip, { backgroundColor: '#ecfeff', borderColor: '#cffafe' }]}>
                <Ionicons name="medkit-outline" size={14} color="#0891b2" />
                <Text style={[styles.chipText, { color: '#0891b2' }]}>{sp}</Text>
              </View>
            ))}

            {typeof avgRating === 'number' && ratingsCount > 0 && (
              <View style={[styles.chip, { backgroundColor: '#fff7ed', borderColor: '#ffedd5' }]}>
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text style={[styles.chipText, { color: '#b45309' }]}>{avgRating.toFixed(1)} ★ · {ratingsCount}</Text>
              </View>
            )}
          </View>

          {!!contact && (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${contact}`)} style={styles.callRow} activeOpacity={0.8}>
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
        data={filteredDoctors}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => <DoctorCard item={item} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <Text style={{ color: '#9ca3af' }}>
            ยังไม่พบแพทย์ตามเงื่อนไขที่เลือก ลองปรับตัวกรองหรือเคลียร์ตัวกรองทั้งหมด
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },

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

  header: { fontSize: 18, fontWeight: '800', marginBottom: 8, color: '#111827' },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 999,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, paddingVertical: 6, color: '#111827' },
  filterToggler: { flexDirection: 'row', alignItems: 'center', paddingLeft: 8 },

  filterCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: radius,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  filterGroupTitle: { fontWeight: '800', color: '#111827', marginBottom: 6 },

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

  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  toggleText: { fontWeight: '700' },

  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  callRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  callText: { color: '#10b981', fontWeight: '700' },
});
