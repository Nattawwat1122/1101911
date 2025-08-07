import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Button } from 'react-native';
import { RadioButton } from 'react-native-paper';
import { auth, db } from '../firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';

const questions = [
  'ในช่วง 2 สัปดาห์ที่ผ่านมา คุณรู้สึกเบื่อหรือหมดกำลังใจบ่อยแค่ไหน?',
  'คุณมีปัญหาในการนอนหลับหรือนอนมากเกินไปหรือไม่?',
  'คุณรู้สึกเหนื่อยหรือไม่มีพลังงานตลอดเวลาหรือไม่?',
  'คุณรู้สึกว่าตัวเองล้มเหลวหรือทำให้ครอบครัวผิดหวังหรือไม่?',
  'คุณมีสมาธิลำบากเมื่อต้องทำสิ่งต่าง ๆ หรือไม่?',
];

const choices = [
  { label: 'ไม่เลย', value: 0 },
  { label: 'บางวัน', value: 1 },
  { label: 'บ่อยครั้ง', value: 2 },
  { label: 'เกือบทุกวัน', value: 3 },
];

// ✅ ฟังก์ชันแปลงระดับเป็นข้อความ
const getLevelDescription = (level) => {
  switch (level) {
    case 0:
      return 'สุขภาพจิตดีมาก';
    case 1:
      return 'มีอาการซึมเศร้าน้อย';
    case 2:
      return 'มีอาการซึมเศร้าปานกลาง';
    case 3:
      return 'มีอาการซึมเศร้ารุนแรง';
    default:
      return 'ไม่ทราบระดับ';
  }
};

export default function MentalHealthSurveyScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(Array(questions.length).fill(null));
  const [userData, setUserData] = useState({
    birthdate: '',
    province: '',
    email: '',
    userID: '',
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData({
            birthdate: data.birthdate || '',
            province: data.province || '',
            email: user.email,
            userID: user.uid,
          });
        } else {
          console.log('ไม่พบข้อมูลผู้ใช้');
        }
      } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้:', error);
      }
    };

    fetchUserData();
  }, []);

  const handleAnswer = (value) => {
    const updated = [...answers];
    updated[currentIndex] = value;
    setAnswers(updated);
  };

  const handleNext = () => {
    if (answers[currentIndex] === null) {
      Alert.alert('กรุณาเลือกคำตอบก่อนกดถัดไป');
      return;
    }
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    try {
      const totalScore = answers.reduce((sum, val) => sum + val, 0);

      let level = 0;
      if (totalScore <= 4) level = 0;
      else if (totalScore <= 9) level = 1;
      else if (totalScore <= 14) level = 2;
      else level = 3;

      const levelDescription = getLevelDescription(level);

      const payload = {
        ...userData,
        totalScore: totalScore.toString(),
        level,
        levelDescription,
        answers,
        createdAt: new Date().toISOString(), // ถ้าไม่ต้องการ timestamp ให้ลบออก
      };

      await addDoc(collection(db, 'mental_surveys'), payload);

      Alert.alert('ส่งแบบสอบถามสำเร็จ');
      navigation.replace('MainTabs');
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการส่งข้อมูล:', error);
      Alert.alert('เกิดข้อผิดพลาด', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        คำถาม {currentIndex + 1} / {questions.length}
      </Text>
      <Text style={styles.question}>{questions[currentIndex]}</Text>

      {choices.map(choice => (
        <View key={choice.value} style={styles.choiceContainer}>
          <RadioButton
            value={choice.value}
            status={answers[currentIndex] === choice.value ? 'checked' : 'unchecked'}
            onPress={() => handleAnswer(choice.value)}
          />
          <Text>{choice.label}</Text>
        </View>
      ))}

      <View style={{ marginTop: 30 }}>
        <Button
          title={currentIndex < questions.length - 1 ? 'ถัดไป' : 'ส่งแบบสอบถาม'}
          onPress={handleNext}
          color="#6c5ce7"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  question: { fontSize: 18, marginBottom: 20 },
  choiceContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
});