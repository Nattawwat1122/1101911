import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';

export default function DiaryScreen() {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [diaryEntries, setDiaryEntries] = useState({});
  const [currentText, setCurrentText] = useState('');
  const [moodAnalysis, setMoodAnalysis] = useState('');
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
        analyzeMood(parsed[selectedDate] || '');
      }
    });
  }, []);

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
    const text = diaryEntries[day.dateString] || '';
    setCurrentText(text);
    analyzeMood(text);
  };

  const forbiddenWords = [
    'อยากตาย', 'ฆ่า', 'ไม่ไหว', 'หายไป', 's',
    'เศร้า', 'เสียใจ', 'ไม่อยากอยู่', 'หมดหวัง', 'เจ็บปวด'
  ];

  const handleSave = async () => {
    const cleanedText = currentText.toLowerCase().replace(/[^\w\sก-๙]/gi, '');
    const found = forbiddenWords.find(word => cleanedText.includes(word));

    if (found) {
      Alert.alert(
        'เราห่วงใยคุณ ❤️',
        `บางครั้งการหยุดพักก็สำคัญไม่แพ้การพยายาม ลองพักก่อนสักนิดนะ 🌱`,
        [
          {
            text: 'โอเค ฉันเข้าใจแล้ว',
            onPress: () => saveDiary()
          }
        ]
      );
    } else {
      saveDiary();
    }
  };

  const saveDiary = async () => {
    const updated = {
      ...diaryEntries,
      [selectedDate]: currentText,
    };
    setDiaryEntries(updated);
    await AsyncStorage.setItem('diaryEntries', JSON.stringify(updated));
    analyzeMood(currentText);
    Alert.alert('✅ บันทึกสำเร็จ', `บันทึกสำหรับวันที่ ${selectedDate} แล้ว`);
  };

  const analyzeMood = (text) => {
    if (!text || text.trim().length === 0) {
      setMoodAnalysis('ยังไม่มีบันทึกสำหรับวันที่นี้');
      return;
    }

    const positiveWords = ['ดี', 'มีความสุข', 'สดใส', 'ชอบ', 'รัก', 'สนุก', 'สุข'];
    const negativeWords = ['เครียด', 'เสียใจ', 'เหนื่อย', 'เบื่อ', 'ทุกข์', 'เศร้า', 'กลัว'];

    const textLower = text.toLowerCase();

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
      if (textLower.includes(word)) positiveCount++;
    });
    negativeWords.forEach(word => {
      if (textLower.includes(word)) negativeCount++;
    });

    let result = '';
    if (positiveCount > negativeCount) {
      result = 'อารมณ์โดยรวม: ค่อนข้างดี 😊';
    } else if (negativeCount > positiveCount) {
      result = 'อารมณ์โดยรวม: ค่อนข้างเครียด 😞';
    } else if (positiveCount === 0 && negativeCount === 0) {
      result = 'อารมณ์โดยรวม: กลาง ๆ 😐';
    } else {
      result = 'อารมณ์โดยรวม: ผสมผสาน 🤔';
    }

    setMoodAnalysis(result);
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
          }, {
            [selectedDate]: { selected: true, selectedColor: 'dodgerblue' },
          })
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
          onChangeText={text => {
            setCurrentText(text);
            analyzeMood(text);
          }}
        />
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button title="บันทึก" onPress={handleSave} color="dodgerblue" />
        <View style={{ height: 10 }} />
        <Button
          title="คลังไดอารี่"
          onPress={() => navigation.navigate('DiaryLibrary', { diaryEntries })}
          color="mediumseagreen"
        />
      </View>

      <View style={styles.analysisContainer}>
        <Text style={styles.analysisText}>{moodAnalysis}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  calendar: {
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 8,
    textAlign: 'center',
  },
  textInputContainer: {
    flex: 1,
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  analysisContainer: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#e1f5fe',
    marginTop: 10,
  },
  analysisText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0277bd',
    textAlign: 'center',
  },
});
