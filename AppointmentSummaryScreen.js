//AppointmentSummaryScreen
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function AppointmentSummaryScreen({ route }) {
  const navigation = useNavigation();
  const { doctor, date, time, duration } = route.params;
  const fee = 800;
  const platform = 50;
  const total = fee + platform;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>สรุปการนัดหมาย</Text>
      <Text>แพทย์: {doctor.name}</Text>
      <Text>ความเชี่ยวชาญ: {doctor.specialty}</Text>
      <Text>วันที่: {date}</Text>
      <Text>เวลา: {time}</Text>
      <Text>ระยะเวลา: {duration} นาที</Text>
      <Text>ค่าพบแพทย์: {fee} บาท</Text>
      <Text>ค่าธรรมเนียมระบบ: {platform} บาท</Text>
      <Text style={{ fontWeight: 'bold', marginTop:6 }}>ยอดรวม: {total} บาท</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          navigation.navigate('Payment', {
            doctor,       // ✅ ส่ง object
            date,
            time,
            duration,
            total
          })
        }
      >
        <Text style={styles.buttonText}>ไปชำระเงิน</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,padding:20},
  header:{fontSize:22,fontWeight:'bold',marginBottom:10},
  button:{backgroundColor:'tomato',marginTop:40,padding:15,borderRadius:10,alignItems:'center'},
  buttonText:{color:'#fff',fontWeight:'bold'}
});
