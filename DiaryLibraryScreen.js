import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, Button } from 'react-native';

export default function DiaryLibraryScreen({ route, navigation }) {
  const { diaryEntries } = route.params || {};
  const entries = diaryEntries
    ? Object.entries(diaryEntries).sort((a, b) => (a[0] < b[0] ? 1 : -1))
    : [];

  // ✅ รายการคำต้องห้าม (เพิ่มหรือลดได้ตามต้องการ)
  const forbiddenWords = ['s', 'ฆ่า', 'ตาย', 'เศร้า', 'เสียใจ', 'อยากตาย'];

  const onEntryPress = (date, text = '') => {
    // เคลียร์ข้อความ: แปลงเป็นพิมพ์เล็ก + ลบเครื่องหมายพิเศษ
    const cleanedText = text.toLowerCase().replace(/[^\w\sก-๙]/gi, '');

    // ตรวจว่ามีคำต้องห้ามไหม
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
      Alert.alert(
        `ไดอารี่วันที่ ${date}`,
        text || 'ไม่มีข้อความบันทึก',
        [{ text: 'ปิด' }]
      );
    }
  };

  const renderItem = ({ item }) => {
    const [date, text] = item;
    const preview = text.length > 30 ? text.substring(0, 30) + '...' : text;
    return (
      <TouchableOpacity style={styles.entryItem} onPress={() => onEntryPress(date, text)}>
        <Text style={styles.entryDate}>{date}</Text>
        <Text style={styles.entryPreview}>{preview}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📔 คลังไดอารี่</Text>
      {entries.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 20 }}>ยังไม่มีบันทึกเก่า</Text>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item[0]}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      <View style={{ marginTop: 10 }}>
        <Button title="กลับ" onPress={() => navigation.goBack()} color="tomato" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 15,
  },
  entryItem: {
    padding: 12,
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
  },
  entryDate: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  entryPreview: {
    color: '#555',
    fontSize: 14,
  },
});
