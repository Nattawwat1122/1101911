//UpcomingAppointmentsScreen
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';   // ⭐ import icon

export default function UpcomingAppointmentsScreen() {
  const navigation = useNavigation();
  const [data, setData] = useState([]);

  const fetchData = async () => {
    const q = query(
      collection(db, 'appointments'),
      where('status', '==', 'upcoming'),
      where('userId', '==', auth.currentUser.uid)
    );
    const snap = await getDocs(q);
    const arr = [];
    snap.forEach(d => arr.push({ ...d.data(), id: d.id }));
    setData(arr);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCancel = async (id) => {
    try {
      await updateDoc(doc(db, 'appointments', id), { status: 'cancelled' });
      Alert.alert('ยกเลิกสำเร็จ');
      fetchData();
    } catch (e) {
      Alert.alert('ผิดพลาด', 'ไม่สามารถยกเลิกได้');
    }
  };

  return (
    <View style={styles.container}>
      

      <Text style={styles.title}>นัดหมายในอนาคต</Text>

      {data.map(item => (
        <View key={item.id} style={styles.card}>
          <Text>แพทย์: {item.doctorName}</Text>
          <Text>วันเวลา: {item.date} {item.time}</Text>
          <Text>ระยะเวลา: {item.duration} นาที</Text>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item.id)}>
            <Text style={{ color: 'white' }}>ยกเลิกนัดหมาย</Text>
          </TouchableOpacity>
        </View>
      ))}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginVertical: 15 },
  card: { borderWidth: 1, padding: 15, borderRadius: 10, marginBottom: 10 },
  cancelBtn: {
    marginTop: 8,
    backgroundColor: 'tomato',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center'
  }
});
