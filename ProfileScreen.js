import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Image, Button, Modal, TextInput,
  TouchableOpacity, Alert, SafeAreaView
} from 'react-native';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export default function ProfileScreen({ navigation }) {
  const [name, setName] = useState('ชื่อของคุณ');
  const [modalVisible, setModalVisible] = useState(false);
  const [tempName, setTempName] = useState(name);
  const [profileImage, setProfileImage] = useState('https://i.pravatar.cc/150?img=3');

  const saveProfile = () => {
    setName(tempName);
    setModalVisible(false);
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
          onPress: () => {
            signOut(auth)
              .then(() => {
                navigation.replace('Login');
              })
              .catch((error) => {
                Alert.alert('เกิดข้อผิดพลาด', error.message);
              });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.profileSection}>
          <Image source={{ uri: profileImage }} style={styles.avatar} />
          <Text style={styles.name}>{name}</Text>

          <TouchableOpacity style={styles.editButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.editButtonText}>แก้ไขโปรไฟล์</Text>
          </TouchableOpacity>
        </View>

        {/* ปุ่มออกจากระบบอยู่ล่างสุด */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>ออกจากระบบ</Text>
        </TouchableOpacity>
      </View>

      {/* Modal แก้ไขโปรไฟล์ */}
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
              value={tempName}
              onChangeText={setTempName}
              placeholder="ชื่อใหม่"
            />
            <Button title="บันทึก" onPress={saveProfile} />
            <Button title="ยกเลิก" onPress={() => setModalVisible(false)} color="gray" />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  profileSection: {
    alignItems: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'dodgerblue',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  editButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 30,
    backgroundColor: 'dodgerblue',
    borderRadius: 20,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  logoutButton: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#d63031',
    borderRadius: 25,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 15,
    borderRadius: 8,
  },
});
