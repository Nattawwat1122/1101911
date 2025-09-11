import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image,
  Modal, TextInput, TouchableOpacity,
  Alert, SafeAreaView, ScrollView, ActivityIndicator
} from 'react-native';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function ProfileScreen({ navigation }) {
  const [username, setUsername] = useState('ชื่อของคุณ');
  const [modalVisible, setModalVisible] = useState(false);
  const [tempUsername, setTempUsername] = useState(username);
  const [profileImage, setProfileImage] = useState('https://i.pravatar.cc/150?img=3');
  const [assessment, setAssessment] = useState(null);
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAssessment, setShowAssessment] = useState(false);
  const [showInterests, setShowInterests] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigation.replace('Login');
          return;
        }

        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        let userData = {};
        if (userSnap.exists()) {
          userData = userSnap.data();
          if (userData.username) setUsername(userData.username);
          if (userData.profileImage) setProfileImage(userData.profileImage);
          if (userData.lastAssessment) setAssessment(userData.lastAssessment);
        }

        if (userData.selectedInterests && userData.selectedInterests.length > 0) {
          const interestSnapshot = await getDocs(collection(db, 'interests'));
          const allInterests = {};
          interestSnapshot.forEach(doc => {
            allInterests[doc.id] = doc.data().name;
          });

          const selectedNames = userData.selectedInterests
            .map(id => allInterests[id])
            .filter(Boolean);
          setInterests(selectedNames);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const saveProfile = async () => {
    setUsername(tempUsername);
    setModalVisible(false);
    try {
      const user = auth.currentUser;
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { username: tempUsername }, { merge: true });
    } catch (error) {
      Alert.alert('ผิดพลาด', 'ไม่สามารถบันทึกชื่อได้');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'ยืนยันการออกจากระบบ',
      'คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ออกจากระบบ',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (user) {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, { status: 'offline' }); // อัปเดตสถานะเป็น offline
              }
              await signOut(auth);
              navigation.replace('Login');
            } catch (error) {
              Alert.alert('เกิดข้อผิดพลาด', error.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0077b6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 120 }]}>
        <Image source={{ uri: profileImage }} style={styles.avatar} />
        <Text style={styles.username}>{username}</Text>

        {/* เมนูแก้ไขโปรไฟล์ */}
        <TouchableOpacity style={styles.menuItem} onPress={() => setModalVisible(true)}>
          <Ionicons name="person-circle-outline" size={28} color="#0077b6" style={{ marginRight: 16 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>แก้ไขโปรไฟล์</Text>
            <Text style={styles.menuSubtitle}>เปลี่ยนชื่อผู้ใช้ของคุณ</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#ccc" />
        </TouchableOpacity>

        {/* เมนูผลการประเมิน */}
        <TouchableOpacity style={styles.menuItem} onPress={() => setShowAssessment(!showAssessment)}>
          <Ionicons name="document-text-outline" size={28} color="#0077b6" style={{ marginRight: 16 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>ผลการประเมิน</Text>
            <Text style={styles.menuSubtitle}>ตรวจสอบผลการประเมินล่าสุดของคุณ</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#ccc" />
        </TouchableOpacity>
        {showAssessment && assessment && (
          <View style={styles.box}>
            <Text style={styles.boxTitle}>ผลการประเมินล่าสุด</Text>
            <Text>คะแนนรวม: {assessment.totalScore ?? '-'}</Text>
            <Text>ระดับความเสี่ยง: {assessment.riskLevel ?? '-'}</Text>
            <Text>วันที่ประเมิน: {assessment.date ? new Date(assessment.date).toLocaleDateString() : '-'}</Text>
          </View>
        )}

        {/* เมนูกิจกรรมที่สนใจ */}
        <TouchableOpacity style={styles.menuItem} onPress={() => setShowInterests(!showInterests)}>
          <Ionicons name="heart-outline" size={28} color="#0077b6" style={{ marginRight: 16 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>กิจกรรมที่สนใจ</Text>
            <Text style={styles.menuSubtitle}>ตรวจสอบกิจกรรมที่คุณสนใจ</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#ccc" />
        </TouchableOpacity>
        {showInterests && interests.length > 0 && (
          <View style={styles.box}>
            <Text style={styles.boxTitle}>กิจกรรมที่คุณสนใจ</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
              {interests.map((interest, idx) => (
                <View key={idx} style={styles.interestItemBox}>
                  <Text style={styles.interestItemText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ปุ่มออกจากระบบ fixed ล่างสุด */}
      <TouchableOpacity style={styles.logoutButtonFixed} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={28} color="#fff" style={{ marginRight: 16 }} />
        <View>
          <Text style={styles.menuTitle}>ออกจากระบบ</Text>
        </View>
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>แก้ไขโปรไฟล์</Text>
            <TextInput
              style={styles.input}
              value={tempUsername}
              onChangeText={setTempUsername}
              placeholder="ชื่อใหม่"
            />
            <TouchableOpacity style={styles.modalButton} onPress={saveProfile}>
              <Text style={styles.modalButtonText}>บันทึก</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#ccc' }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>ยกเลิก</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  content: { padding: 20 },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: 'dodgerblue', alignSelf: 'center', marginBottom: 12 },
  username: { fontSize: 24, fontWeight: 'bold', alignSelf: 'center', marginBottom: 20 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    marginBottom: 12,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  menuTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
  menuSubtitle: { fontSize: 13, color: '#777' },
  box: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 1,
  },
  interestItemBox: { backgroundColor: '#ffd180', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, margin: 4 },
  interestItemText: { fontSize: 13, color: '#333' },
  logoutButtonFixed: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d63031',
    padding: 16,
    borderRadius: 15,
    margin: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 5,
  },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 15, borderRadius: 10 },
  modalButton: { backgroundColor: '#4facfe', paddingVertical: 12, borderRadius: 25, marginBottom: 10, alignItems: 'center' },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
