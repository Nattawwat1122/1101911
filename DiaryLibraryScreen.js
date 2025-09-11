import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, Modal, ScrollView } from 'react-native';
import { getFirestore, collection, query, orderBy, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "../firebase";

export default function DiaryLibraryScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const db = getFirestore(app);
  const auth = getAuth();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("❌ ยังไม่ได้ล็อกอิน");
      return;
    }

    const q = query(
      collection(db, "diaryEntries", user.uid, "entries"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEntries(data);
    }, (error) => {
      console.error("โหลดข้อมูลผิดพลาด:", error);
      Alert.alert("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    });

    return () => unsubscribe();
  }, []);

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
            } catch (error) {
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
    return (
      <TouchableOpacity 
        style={styles.entryCard} 
        onPress={() => onEntryPress(item)}
        onLongPress={async () => {
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
                    await deleteDoc(doc(db, "diaryEntries", user.uid, "entries", item.id));
                  } catch (error) {
                    console.error("ลบผิดพลาด:", error);
                    Alert.alert("เกิดข้อผิดพลาดในการลบ");
                  }
                }
              }
            ]
          );
        }}
      >
        <Text style={styles.entryTitle}>{item.title}</Text>
        <Text style={styles.entryDate}>{item.id} 🏷️ {item.category}</Text>
        <Text style={styles.entryPreview}>{preview}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📔 คลังไดอารี่</Text>
      </View>

      {entries.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 20, fontSize: 16 }}>ยังไม่มีบันทึกเก่า</Text>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>กลับ</Text>
      </TouchableOpacity>

      {/* Modal อ่านไดอารี่ */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>{selectedEntry?.title}</Text>
              <Text style={styles.modalCategory}>🏷️ {selectedEntry?.category}</Text>
              <Text style={styles.modalDate}>{selectedEntry?.id}</Text>
              <Text style={styles.modalText}>{selectedEntry?.content}</Text>
            </ScrollView>

            {/* ปุ่มขวาล่าง */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>ปิด</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },

  header: {
    backgroundColor: '#FFD6E0',
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 2,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#FF6B81' },

  entryCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
  entryTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6, color: '#FF6B81' },
  entryDate: { fontSize: 14, fontWeight: '500', color: '#555', marginBottom: 4 },
  entryPreview: { fontSize: 14, color: '#333' },

  backButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 15,
    elevation: 3,
  },
  backButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
    elevation: 5,
  },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 10, color: '#FF6B81', textAlign: 'center' },
  modalCategory: { fontSize: 16, fontWeight: '600', color: '#555', marginBottom: 6, textAlign: 'center' },
  modalDate: { fontSize: 14, color: '#999', marginBottom: 12, textAlign: 'center' },
  modalText: { fontSize: 16, lineHeight: 24, color: '#333' },

  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },

  closeButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
