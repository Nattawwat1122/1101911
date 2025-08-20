//PaymentScreen
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function PaymentScreen({ route }) {
  const navigation = useNavigation();
  const { doctor, date, time, duration, total } = route.params;

  const handlePay = async () => {
    try {
      await addDoc(collection(db, 'appointments'), {
        doctorName: doctor.name,
        specialty: doctor.specialty,
        date,
        time,
        duration,
        userId: auth.currentUser.uid,
        status: 'upcoming',
        createdAt: serverTimestamp(),
      });

      Alert.alert('สำเร็จ', 'บันทึกการนัดหมายแล้ว');
      navigation.navigate('UpcomingAppointments');
    } catch (err) {
      console.log(err);
      Alert.alert('ผิดพลาด', 'ไม่สามารถบันทึกได้');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>💸 ชำระเงิน</Text>
      <Text style={styles.amount}>ยอดที่ต้องชำระ: {total} บาท</Text>
      <TouchableOpacity style={styles.button} onPress={handlePay}>
        <Text style={styles.buttonText}>ดำเนินการชำระเงิน</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,alignItems:'center',justifyContent:'center'},
  header:{fontSize:24,fontWeight:'bold',marginBottom:30},
  amount:{fontSize:22,marginBottom:50},
  button:{backgroundColor:'tomato',padding:15,borderRadius:10},
  buttonText:{color:'#fff',fontWeight:'bold'}
});
