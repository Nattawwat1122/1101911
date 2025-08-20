//BookAppointmentScreen
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';

export default function BookAppointmentScreen({ route }) {
  const navigation = useNavigation();
  const { doctor } = route.params;

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [duration, setDuration] = useState(30);

  const times = ['10:00', '11:00', '13:00'];

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime) {
      alert('กรุณาเลือกวันและเวลา');
      return;
    }
    navigation.navigate('AppointmentSummary', {
      doctor,
      date: selectedDate,
      time: selectedTime,
      duration,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>เลือกวันนัดหมาย</Text>

      <Calendar
        onDayPress={(d) => setSelectedDate(d.dateString)}
        markedDates={{
          [selectedDate]: { selected: true, selectedColor: 'tomato' },
        }}
      />

      <Text style={styles.title}>เลือกเวลา</Text>
      <View style={styles.timeBox}>
        {times.map((t) => (
          <TouchableOpacity
            key={t}
            style={[
              styles.timeButton,
              selectedTime === t && { backgroundColor: 'tomato' },
            ]}
            onPress={() => setSelectedTime(t)}>
            <Text
              style={{
                color: selectedTime === t ? 'white' : 'black',
              }}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.title}>ระยะเวลา</Text>
      <View style={styles.timeBox}>
        {[30, 60].map((m) => (
          <TouchableOpacity
            key={m}
            style={[
              styles.timeButton,
              duration === m && { backgroundColor: 'tomato' },
            ]}
            onPress={() => setDuration(m)}>
            <Text style={{ color: duration === m ? 'white' : 'black' }}>
              {m} นาที
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
        <Text style={styles.confirmText}>ยืนยันนัดหมาย</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  timeBox: { flexDirection: 'row', flexWrap: 'wrap' },
  timeButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10,
  },
  confirmButton: {
    backgroundColor: 'tomato',
    padding: 15,
    borderRadius: 10,
    marginTop: 30,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontWeight: 'bold' },
});
