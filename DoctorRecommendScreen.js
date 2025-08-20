import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigation } from '@react-navigation/native';

export default function DoctorRecommendScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);

  const fetchDoctors = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'psychiatrists'));
      const docs = [];
      querySnapshot.forEach(doc => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      setDoctors(docs);
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="tomato" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 🔺 ปุ่มด้านบน */}
      <View style={styles.topButtons}>
        <TouchableOpacity
          onPress={() => navigation.navigate('UpcomingAppointments')}
          style={styles.smallBtn}>
          <Text>นัดหมายในอนาคต</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('PastAppointments')}
          style={styles.smallBtn}>
          <Text>นัดหมายที่ผ่านมา</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.header}>🎯 แนะนำจิตแพทย์</Text>

      {doctors.map(doc => (
        <TouchableOpacity
          key={doc.id}
          style={styles.card}
          onPress={() => navigation.navigate('DoctorDetail', { doctor: doc })}
        >
          <Text style={styles.name}>{doc.name}</Text>
          <Text>เชี่ยวชาญ: {doc.specialty}</Text>
          <Text>โทร: {doc.contact}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  topButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  smallBtn: {
    backgroundColor: '#eee',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 18 },
  card: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
  },
  name: { fontSize: 16, fontWeight: 'bold' },
});
