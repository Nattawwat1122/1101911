import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, Modal, ScrollView, TextInput } from 'react-native';
// documentId ไม่ได้ใช้แล้วในการ query แต่เก็บไว้เผื่ออนาคต
import { getFirestore, collection, query, onSnapshot, doc, deleteDoc, setDoc, documentId } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "../firebase";
import moment from 'moment';
import 'moment/locale/th';
import { Calendar } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/Ionicons';

moment.locale('th');

export default function DiaryLibraryScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editCategories, setEditCategories] = useState([]);
  
  const [allCategories, setAllCategories] = useState([]);
  const [selectedFilterCategories, setSelectedFilterCategories] = useState(new Set());
  const [selectedFilterDate, setSelectedFilterDate] = useState(null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  const db = getFirestore(app);
  const auth = getAuth();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("❌ ยังไม่ได้ล็อกอิน");
      return;
    }
    
    // ✅ 1. แก้ไข Query: เอา orderBy ออกเพื่อไม่ให้เกิด Error
    const q = query(
      collection(db, "diaryEntries", user.uid, "entries")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // ✅ 2. แก้ไขโดยเพิ่ม: เรียงลำดับข้อมูลฝั่งแอป (Client-Side Sorting)
      //    b.id.localeCompare(a.id) จะเรียงวันที่ (YYYY-MM-DD) จากล่าสุดไปเก่าสุด
      data.sort((a, b) => b.id.localeCompare(a.id));

      setEntries(data); // set state ด้วยข้อมูลที่เรียงลำดับแล้ว

      const categoriesSet = new Set();
      data.forEach(entry => {
        entry.categories?.forEach(cat => categoriesSet.add(cat));
      });
      setAllCategories(Array.from(categoriesSet).sort());

    }, (error) => {
      console.error("โหลดข้อมูลผิดพลาด:", error);
      Alert.alert("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    });

    return () => unsubscribe();
  }, []);
  
  const filteredEntries = useMemo(() => {
    if (selectedFilterCategories.size === 0 && !selectedFilterDate) {
      return entries;
    }

    return entries.filter(entry => {
      const dateMatch = !selectedFilterDate || entry.id === selectedFilterDate;
      const categoryMatch = selectedFilterCategories.size === 0 || 
        (entry.categories && Array.from(selectedFilterCategories).some(filterCat => entry.categories.includes(filterCat)));
      return dateMatch && categoryMatch;
    });
  }, [entries, selectedFilterCategories, selectedFilterDate]);

  const toggleFilterCategory = (category) => {
    const newSet = new Set(selectedFilterCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setSelectedFilterCategories(newSet);
  };

  const clearFilters = () => {
    setSelectedFilterCategories(new Set());
    setSelectedFilterDate(null);
  };

  const forbiddenWords = ['ฆ่า', 'ตาย', 'เศร้า', 'เสียใจ', 'อยากตาย'];

  const onEntryPress = (entry) => {
    const cleanedText = (entry.content || "").toLowerCase().replace(/[^\w\sก-๙]/gi, '');
    const found = forbiddenWords.find(word =>
      cleanedText.includes(word.toLowerCase())
    );

    if (found) {
      Alert.alert(
        'คำเตือน 🚫',
        `พบคำต้องห้าม "${found}" ในไดอารี่นี้\nโปรดตรวจสอบเนื้อหาอีกครั้ง`,
        [{ text: 'ปิด' }]
      );
    } else {
      setSelectedEntry(entry);
      setModalVisible(true);
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;
    const user = auth.currentUser;
    if (!user) return;

    Alert.alert(
      'ลบไดอารี่',
      'คุณแน่ใจไหมว่าต้องการลบไดอารี่นี้?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "diaryEntries", user.uid, "entries", selectedEntry.id));
              setModalVisible(false);
              setSelectedEntry(null);
            } catch (error)              {
              console.error("ลบผิดพลาด:", error);
              Alert.alert("เกิดข้อผิดพลาดในการลบ");
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => {
    const preview = item.content?.length > 50 ? item.content.substring(0, 50) + '...' : item.content || '';
    const categoriesText = item.categories?.join(', ') || '';
    const entryDateText = moment(item.id).isValid() ? moment(item.id).format('D MMMM YYYY') : item.id;

    return (
      <TouchableOpacity 
        style={styles.entryCard} 
        onPress={() => onEntryPress(item)}
      >
        <Text style={styles.entryTitle}>{item.title}</Text>
        <Text style={styles.entryCategory}>🏷️ {categoriesText}</Text>
        <Text style={styles.entryPreview}>📓 {preview}</Text>
        <View style={styles.entryFooter}>
          <Text style={styles.entryDate}>{entryDateText}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📔 คลังไดอารี่</Text>
      </View>
      
      <View style={styles.filterContainer}>
        <Text style={styles.filterTitle}>ตัวกรอง</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
          {allCategories.map(cat => {
            const isSelected = selectedFilterCategories.has(cat);
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                onPress={() => toggleFilterCategory(cat)}
              >
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>{cat}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
        <View style={styles.filterActions}>
          <TouchableOpacity style={styles.dateButton} onPress={() => setDatePickerVisible(true)}>
            <Icon name="calendar-outline" size={16} color="#FF6B81" />
            <Text style={styles.dateButtonText}>
              {selectedFilterDate ? moment(selectedFilterDate).format('D MMM YY') : 'เลือกวันที่'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
             <Icon name="refresh-outline" size={16} color="#555" />
            <Text style={styles.clearButtonText}>ล้างตัวกรอง</Text>
          </TouchableOpacity>
        </View>
      </View>

      {filteredEntries.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 20, fontSize: 16 }}>ไม่พบบันทึกตามเงื่อนไข</Text>
      ) : (
        <FlatList
          data={filteredEntries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>กลับ</Text>
      </TouchableOpacity>
      
       <Modal
        visible={isDatePickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setDatePickerVisible(false)}>
          <View style={styles.calendarModalContent}>
            <Calendar
              onDayPress={(day) => {
                setSelectedFilterDate(day.dateString);
                setDatePickerVisible(false);
              }}
              markedDates={{
                [selectedFilterDate]: { selected: true, selectedColor: '#FF6B81' }
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          setIsEditing(false);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {!isEditing && (
              <TouchableOpacity
                style={{ position: 'absolute', top: 15, right: 15, zIndex: 10, padding: 5 }}
                onPress={() => {
                  setIsEditing(true);
                  setEditTitle(selectedEntry?.title || '');
                  setEditCategories(selectedEntry?.categories || []);
                  setEditContent(selectedEntry?.content || '');
                }}
              >
                  <Icon name="create-outline" size={24} color="#FF6B81"/>
              </TouchableOpacity>
            )}

            <ScrollView>
              {isEditing ? (
                <>
                  <TextInput style={[styles.modalTitle, { fontSize: 20, borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8 }]} value={editTitle} onChangeText={setEditTitle} placeholder="หัวข้อ" />
                  <TextInput style={[styles.modalCategory, { fontSize: 14, borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginTop: 10 }]} value={editCategories.join(', ')} onChangeText={text => setEditCategories(text.split(',').map(c => c.trim()))} placeholder="หมวดหมู่คั่นด้วย ," />
                  <TextInput style={[styles.modalText, { minHeight: 200, borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginTop: 10 }]} value={editContent} onChangeText={setEditContent} multiline textAlignVertical="top" />
                </>
              ) : (
                <>
                  <Text style={styles.modalTitle}>{selectedEntry?.title}</Text>
                  <Text style={styles.modalCategory}>{selectedEntry?.categories?.join(', ')}</Text>
                  <Text style={styles.modalDate}>
                    {selectedEntry?.id ? moment(selectedEntry.id).format('D MMMM YYYY') : ''}
                  </Text>
                  <Text style={styles.modalSubDate}>
                    บันทึกเมื่อ: {selectedEntry?.createdAt ? moment(selectedEntry.createdAt).format('D MMM YY, HH:mm น.') : '-'}
                  </Text>
                  <Text style={styles.modalText}>{selectedEntry?.content}</Text>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              {isEditing ? (
                <>
                  <TouchableOpacity style={[styles.closeButton, { backgroundColor: '#aaa', marginRight: 10 }]} onPress={() => setIsEditing(false)}>
                    <Text style={styles.closeButtonText}>ยกเลิก</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.closeButton} onPress={async () => {
                      try {
                        const user = auth.currentUser;
                        if (!user) return;
                        await setDoc(doc(db, "diaryEntries", user.uid, "entries", selectedEntry.id), { ...selectedEntry, title: editTitle, categories: editCategories, content: editContent, });
                        setSelectedEntry({ ...selectedEntry, title: editTitle, categories: editCategories, content: editContent });
                        setIsEditing(false);
                        Alert.alert("✅ บันทึกสำเร็จ");
                      } catch (error) {
                        console.error("แก้ไขผิดพลาด:", error);
                        Alert.alert("เกิดข้อผิดพลาดในการบันทึก");
                      }
                    }} >
                    <Text style={styles.closeButtonText}>บันทึก</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={{flexDirection: 'row', justifyContent: 'space-between', width: '100%'}}>
                    <TouchableOpacity style={[styles.closeButton, {flex: 1, marginRight: 5, backgroundColor: '#dc3545'}]} onPress={handleDelete}>
                        <Text style={styles.closeButtonText}>ลบ</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.closeButton, {flex: 1, marginLeft: 5}]} onPress={() => setModalVisible(false)}>
                        <Text style={styles.closeButtonText}>ปิด</Text>
                    </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  header: { backgroundColor: '#FFD6E0', paddingVertical: 20, alignItems: 'center', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 2 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#FF6B81' },
  filterContainer: { paddingVertical: 10, backgroundColor: '#fff', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  filterTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginLeft: 15, marginBottom: 8 },
  categoryChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#f1f1f1', marginRight: 8, borderWidth: 1, borderColor: '#ddd' },
  categoryChipSelected: { backgroundColor: '#FF6B81', borderColor: '#FF6B81' },
  categoryChipText: { fontSize: 14, color: '#333' },
  categoryChipTextSelected: { color: '#fff', fontWeight: '600' },
  filterActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, marginTop: 10 },
  dateButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#FFF4F6', borderRadius: 10, borderWidth: 1, borderColor: '#FFD6E0' },
  dateButtonText: { color: '#FF6B81', fontWeight: '600', marginLeft: 6 },
  clearButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  clearButtonText: { color: '#555', fontWeight: '600', marginLeft: 6 },
  entryCard: { backgroundColor: '#FFF', borderRadius: 15, padding: 15, marginHorizontal: 15, marginVertical: 8, shadowColor: "#000", shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 4 },
  entryTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6, color: '#FF6B81' },
  entryCategory: { fontSize: 14, fontWeight: '500', color: '#555', marginBottom: 6 },
  entryPreview: { fontSize: 14, color: '#333', marginBottom: 8 },
  entryFooter: { flexDirection: 'row', justifyContent: 'flex-end' },
  entryDate: { fontSize: 12, color: '#999' },
  backButton: { backgroundColor: '#FF6B6B', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginHorizontal: 15, marginTop: 10, marginBottom: 15, elevation: 3 },
  backButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, maxHeight: '80%', elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 10, color: '#FF6B81', textAlign: 'center' },
  modalCategory: { fontSize: 16, fontWeight: '600', color: '#555', marginBottom: 6, textAlign: 'center' },
  modalDate: { fontSize: 14, color: '#555', marginBottom: 2, textAlign: 'center', fontWeight: '600'},
  modalSubDate: { fontSize: 12, color: '#999', marginBottom: 12, textAlign: 'center' },
  modalText: { fontSize: 16, lineHeight: 24, color: '#333' },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  closeButton: { backgroundColor: '#FF6B6B', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center' },
  closeButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  calendarModalContent: { backgroundColor: 'white', borderRadius: 10, padding: 10, width: '100%' },
});
