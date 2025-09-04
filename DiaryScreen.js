import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

export default function DiaryScreen() {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [diaryEntries, setDiaryEntries] = useState({});
  const [currentText, setCurrentText] = useState('');
  const navigation = useNavigation();

  function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  useEffect(() => {
    AsyncStorage.getItem('diaryEntries').then(data => {
      if (data) {
        const parsed = JSON.parse(data);
        setDiaryEntries(parsed);
        setCurrentText(parsed[selectedDate] || '');
      }
    });
  }, []);

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
    const text = diaryEntries[day.dateString] || '';
    setCurrentText(text);
  };

  const handleSave = async () => {
    const updated = { ...diaryEntries, [selectedDate]: currentText };
    setDiaryEntries(updated);
    await AsyncStorage.setItem('diaryEntries', JSON.stringify(updated));

    try {
      const response = await axios.post("http://localhost:5000/diary", {
        message: currentText
      });

      const emotion = response.data.emotion;

      Alert.alert(
        '✅ บันทึกสำเร็จ',
        `บันทึกสำหรับวันที่ ${selectedDate}\n\nอารมณ์ของคุณ: ${emotion}`
      );
    } catch (err) {
      console.error("Error analyzing:", err);
      Alert.alert(
        '✅ บันทึกสำเร็จ',
        `บันทึกสำหรับวันที่ ${selectedDate} แล้ว\nอารมณ์ตอนนี้: วิเคราะห์ไม่ได้`
      );
    }
  };

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={onDayPress}
        markedDates={{
          ...Object.keys(diaryEntries).reduce((acc, date) => {
            acc[date] = {
              marked: true,
              dotColor: 'red',
              ...(date === selectedDate && { selected: true, selectedColor: 'dodgerblue' }),
            };
            return acc;
          }, { [selectedDate]: { selected: true, selectedColor: 'dodgerblue' } })
        }}
        style={styles.calendar}
      />

      <Text style={styles.label}>บันทึกของวันที่ {selectedDate}</Text>

      <ScrollView style={styles.textInputContainer}>
        <TextInput
          multiline
          placeholder="เขียนบันทึกของคุณที่นี่..."
          style={styles.textInput}
          value={currentText}
          onChangeText={text => setCurrentText(text)}
        />
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button title="บันทึก" onPress={handleSave} color="dodgerblue" />
        <View style={{ height: 10 }} />
        <Button
          title="คลังไดอารี่"
          onPress={() => navigation.navigate('DiaryLibrary', { diaryEntries, currentText, selectedDate })}
          color="mediumseagreen"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  calendar: { marginBottom: 10 },
  label: { fontSize: 16, fontWeight: '600', marginVertical: 8, textAlign: 'center' },
  textInputContainer: { flex: 1, marginBottom: 10 },
  textInput: { backgroundColor: '#f9f9f9', borderRadius: 10, padding: 15, fontSize: 16, minHeight: 150, textAlignVertical: 'top' },
  buttonContainer: { marginBottom: 20 },
});
