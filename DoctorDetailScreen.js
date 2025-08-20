import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function DoctorDetailScreen({ route }) {
  const navigation = useNavigation();
  const { doctor } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{doctor.name}</Text>
      <Text style={styles.info}>ความเชี่ยวชาญ: {doctor.specialty}</Text>
      <Text style={styles.info}>เบอร์ติดต่อ: {doctor.contact}</Text>
      
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('BookAppointment', { doctor })}
      >
        <Text style={styles.buttonText}>📅 นัดหมายออนไลน์</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,padding:20,backgroundColor:'#fff'},
  name:{fontSize:24,fontWeight:"bold",marginBottom:10},
  info:{fontSize:18,marginBottom:8},
  button:{backgroundColor:'tomato',padding:15,borderRadius:10,marginTop:20,alignItems:'center'},
  buttonText:{color:'#fff',fontWeight:'bold'}
});
