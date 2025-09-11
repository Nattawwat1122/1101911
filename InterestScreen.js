import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Dimensions, Modal } from "react-native";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";

export default function InterestScreen({ navigation }) {
  const [interests, setInterests] = useState([]);
  const [selected, setSelected] = useState([]);
  const [showModal, setShowModal] = useState(false); 
  const auth = getAuth();

  useEffect(() => {
    const fetchInterests = async () => {
      try {
        const snapshot = await getDocs(collection(db, "interests"));
        const list = [];
        snapshot.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setInterests(list);
      } catch (error) {
        console.error("Error fetching interests:", error);
      }
    };
    fetchInterests();
  }, []);

  const toggleSelect = (id) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(item => item !== id));
    } else {
      if (selected.length >= 3) {
        setShowModal(true); 
        return;
      }
      setSelected([...selected, id]);
    }
  };

  const handleSubmit = async () => {
    if (selected.length === 0) {
      setShowModal(true); 
      return;
    }
    try {
      const user = auth.currentUser;
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { selectedInterests: selected }, { merge: true });
      navigation.replace("MainTabs");
    } catch (error) {
      console.error("Error saving interests:", error);
      setShowModal(true); 
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.item, selected.includes(item.id) && styles.selectedItem]}
      onPress={() => toggleSelect(item.id)}
      activeOpacity={0.8}
    >
      <View style={styles.imageWrapper}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}><Text>รูป</Text></View>
        )}
      </View>
      <Text style={styles.itemText}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>เลือกกิจกรรมที่คุณชอบ (สูงสุด 3)</Text>

      <FlatList
        data={interests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 15 }}
      />

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitText}>บันทึกกิจกรรม</Text>
      </TouchableOpacity>

      {/* Popup Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showModal}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>แจ้งเตือน</Text>
            <Text style={styles.modalMessage}>คุณเลือกครบ 3 กิจกรรมแล้ว!</Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => setShowModal(false)}>
              <Text style={styles.modalButtonText}>ตกลง</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const { width } = Dimensions.get("window");
const ITEM_MARGIN = 10;
const ITEM_WIDTH = (width - 40 - ITEM_MARGIN) / 2; // 40 = padding ซ้าย+ขวา container

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f5f7fa" },
  header: { fontSize: 20, fontWeight: "bold", marginBottom: 20, textAlign: "center", color: "#333" },

  item: {
    width: ITEM_WIDTH,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 3,
    alignItems: "center",
  },
  selectedItem: { borderWidth: 2, borderColor: "#0077b6", backgroundColor: "#e0f7ff" },

  imageWrapper: {
    width: "100%",
    height: ITEM_WIDTH,
    borderBottomWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#ddd",
  },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  imagePlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },

  itemText: { marginTop: 10, fontSize: 16, fontWeight: "500", textAlign: "center", color: "#333" },

  submitButton: { backgroundColor: "#0077b6", padding: 15, borderRadius: 15, alignItems: "center", marginTop: 20 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalContainer: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 5,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10, color: "#0077b6" },
  modalMessage: { fontSize: 16, textAlign: "center", marginBottom: 20, color: "#333" },
  modalButton: { backgroundColor: "#0077b6", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  modalButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
