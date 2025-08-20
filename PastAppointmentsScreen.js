//PastAppointmentsScreen
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function PastAppointmentsScreen() {
  const [data, setData] = useState([]);

  const fetchData = async () => {
    const q = query(
      collection(db, 'appointments'),
      where('status', '==', 'past'),
      where('userId', '==', auth.currentUser.uid)
    );
    const snap = await getDocs(q);
    const arr = [];
    snap.forEach(d => arr.push({ ...d.data(), id: d.id }));
    setData(arr);
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>นัดหมายที่ผ่านมา</Text>
      {data.map(item => (
        <View key={item.id} style={styles.card}>
          <Text>แพทย์: {item.doctorName}</Text>
          <Text>วันเวลา: {item.date} {item.time}</Text>
          <Text>ระยะเวลา: {item.duration} นาที</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, padding:20 },
  title:{ fontSize:20, fontWeight:'bold', marginBottom:15 },
  card:{ borderWidth:1, padding:15, borderRadius:10, marginBottom:10 }
});
