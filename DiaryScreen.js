import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

import { getFirestore, doc, setDoc, getDocs, collection } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; 

const db = getFirestore();

export default function DiaryScreen() {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [diaryEntries, setDiaryEntries] = useState({});
  const [modalVisible, setModalVisible] = useState(false);

  const [title, setTitle] = useState('');
  const [categories, setCategories] = useState([]); // เลือกหลาย category
  const [content, setContent] = useState('');

  const navigation = useNavigation();
  const user = getAuth().currentUser;

  const categoryOptions = ["การเรียน", "การทำงาน", "ความเครียด", "การระบาย", "อื่น ๆ"];

  function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  useEffect(() => {
    if (!user) return;
    const loadEntries = async () => {
      try {
        const snap = await getDocs(collection(db, "diaryEntries", user.uid, "entries"));
        let data = {};
        snap.forEach(docSnap => {
          data[docSnap.id] = docSnap.data();
        });
        setDiaryEntries(data);
      } catch (error) {
        console.error("โหลดข้อมูลผิดพลาด: ", error);
      }
    };
    loadEntries();
  }, [user]);

  const onDayPress = (day) => setSelectedDate(day.dateString);

  const toggleCategory = (cat) => {
    setCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('⚠️ กรุณาใส่หัวข้อและเนื้อหา');
      return;
    }

    try {
      await setDoc(doc(db, "diaryEntries", user.uid, "entries", selectedDate), {
        title,
        categories,
        content,
        createdAt: new Date().toISOString(),
      });

      setDiaryEntries(prev => ({
        ...prev,
        [selectedDate]: { title, categories, content }
      }));

      setTitle('');
      setContent('');
      setCategories([]);
      setModalVisible(false);

      Alert.alert('✅ บันทึกสำเร็จ', `บันทึกสำหรับวันที่ ${selectedDate} แล้ว`);
    } catch (error) {
      console.error("บันทึกผิดพลาด: ", error);
      Alert.alert('❌ เกิดข้อผิดพลาด', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={onDayPress}
        markedDates={{
          ...Object.keys(diaryEntries).reduce((acc, date) => {
            acc[date] = {
              marked: true,
              dotColor: 'red',
              ...(date === selectedDate && { selected: true, selectedColor: 'dodgerblue' }),
            };
            return acc;
          }, {
            [selectedDate]: { selected: true, selectedColor: 'dodgerblue' },
          })
        }}
        style={styles.calendar}
      />

      <Text style={styles.label}>บันทึกของวันที่ {selectedDate}</Text>

      <TouchableOpacity style={styles.writeButton} onPress={() => setModalVisible(true)}>
        <Icon name="create-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>เขียนบันทึก</Text>
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
            <Text style={styles.modalTitle}>✏️ เขียนบันทึก</Text>

            <TextInput
              placeholder="หัวข้อ"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
            />

            <Text style={styles.modalSubtitle}>เลือกหมวดหมู่ (สามารถเลือกได้หลายหมวด)</Text>
            <View style={styles.categoryContainer}>
              {categoryOptions.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryItem,
                    categories.includes(cat) && styles.categoryItemSelected
                  ]}
                  onPress={() => toggleCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      categories.includes(cat) && styles.categoryTextSelected
                    ]}
                  >
                    {cat}
                  </Text>
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
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>ยกเลิก</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  calendar: { marginBottom: 10 },
  label: { fontSize: 16, fontWeight: '600', marginVertical: 8, textAlign: 'center' },

  writeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B4D8',
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    marginBottom: 10,
    elevation: 3,
  },
  libraryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C77DFF',
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    elevation: 3,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  modalSubtitle: { fontSize: 16, fontWeight: "600", marginTop: 10, marginBottom: 5 },
  categoryContainer: { flexDirection: "row", flexWrap: "wrap", marginVertical: 8 },
  categoryItem: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
    backgroundColor: "#f9f9f9"
  },
  categoryItemSelected: {
    backgroundColor: "#00B4D8",
    borderColor: "#00B4D8"
  },
  categoryText: { fontSize: 14, color: "#333" },
  categoryTextSelected: { color: "#fff", fontWeight: "600" },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
    fontSize: 16,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  saveButton: {
    flex: 1,
    backgroundColor: '#FF6B81',
    padding: 12,
    borderRadius: 8,
    marginRight: 5,
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 8,
    marginLeft: 5,
    alignItems: 'center',
  },
});
