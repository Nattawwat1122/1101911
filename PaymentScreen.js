// screens/PaymentScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { db, auth } from '../firebase';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';

export default function PaymentScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { doctor, date, time, duration = 30, total = 0 } = route.params || {};

  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    if (!auth.currentUser) {
      Alert.alert('ยังไม่ได้เข้าสู่ระบบ', 'กรุณาเข้าสู่ระบบก่อนชำระเงิน');
      return;
    }
    if (!doctor?.id || !date || !time) {
      Alert.alert('ข้อมูลไม่ครบ', 'ต้องมี doctor.id, วันที่ และเวลา');
      return;
    }

    setLoading(true);
    try {
      // ref เอกสารวันของหมอ และ ref สำหรับสร้างนัดหมาย
      const dayRef = doc(db, 'doctors', doctor.id, 'days', date);
      const apptRef = doc(collection(db, 'appointments'));

      const apptId = await runTransaction(db, async (tx) => {
        const daySnap = await tx.get(dayRef);
        const taken = daySnap.exists() ? (daySnap.data().taken || {}) : {};

        // ถ้าเวลานี้ถูกจองไว้แล้ว ให้ fail
        if (taken[time]) {
          throw new Error('SLOT_TAKEN');
        }

        // สร้างนัดหมาย
        tx.set(apptRef, {
          id: apptRef.id,
          userId: auth.currentUser.uid,
          doctorId: doctor.id,
          doctorName: doctor.name || '',
          specialty: doctor.specialty || '',
          date,
          time,
          duration,
          price: total,
          status: 'upcoming',
          createdAt: serverTimestamp(),
        });

        // มาร์คเวลานี้ว่าไม่ว่างใน days/{date}.taken
        tx.set(
          dayRef,
          { taken: { ...taken, [time]: apptRef.id } },
          { merge: true }
        );

        return apptRef.id;
      });

      Alert.alert('สำเร็จ', `ชำระเงินและจองเวลาแล้ว (รหัสนัดหมาย: ${apptId})`);
      navigation.navigate('UpcomingAppointments'); // ไปหน้ารายการนัดล่วงหน้า
    } catch (err) {
      console.log('pay error:', err);
      if (err.message === 'SLOT_TAKEN') {
        Alert.alert('เวลาถูกจองไปแล้ว', 'มีผู้อื่นจองเวลานี้ก่อนหน้า กรุณาเลือกเวลาอื่น');
      } else {
        Alert.alert('ผิดพลาด', 'ไม่สามารถบันทึกการนัดหมายได้');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>💸 ชำระเงิน</Text>
      <View style={styles.card}>
        <Row label="แพทย์" value={doctor?.name || '-'} />
        <Row label="ความเชี่ยวชาญ" value={doctor?.specialty || '-'} />
        <Row label="วันที่" value={date || '-'} />
        <Row label="เวลา" value={time || '-'} />
        <Row label="ระยะเวลา" value={`${duration} นาที`} />
        <Row label="ยอดชำระ" value={`${total} บาท`} />
      </View>

      <TouchableOpacity style={[styles.button, loading && { opacity: 0.6 }]} onPress={handlePay} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ดำเนินการชำระเงิน</Text>}
      </TouchableOpacity>
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,alignItems:'center',justifyContent:'center',padding:20,backgroundColor:'#fff'},
  header:{fontSize:24,fontWeight:'bold',marginBottom:20},
  card:{width:'100%',borderWidth:1,borderColor:'#eee',borderRadius:12,padding:16,marginBottom:24},
  row:{flexDirection:'row',justifyContent:'space-between',marginBottom:10},
  label:{color:'#777'},
  value:{fontWeight:'600'},
  button:{backgroundColor:'tomato',padding:15,borderRadius:10,alignItems:'center',width:'100%'},
  buttonText:{color:'#fff',fontWeight:'bold'}
});
