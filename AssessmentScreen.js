import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from "react-native";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";

export default function AssessmentScreen({ navigation }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const auth = getAuth();

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigation.replace("Login");
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && userSnap.data().lastAssessment) {
        navigation.replace("MainTabs");
        return;
      }

      const questionSnapshot = await getDocs(collection(db, "questions"));
      const qList = [];
      questionSnapshot.forEach((doc) => {
        qList.push({ id: doc.id, ...doc.data() });
      });
      setQuestions(qList);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSelect = (optionIndex) => {
    const qId = questions[currentIndex].id;
    setAnswers({ ...answers, [qId]: optionIndex });
  };

  const handleNext = () => {
    if (answers[questions[currentIndex].id] === undefined) return; // ต้องเลือกก่อน
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length !== questions.length) {
      alert("กรุณาตอบทุกข้อก่อนส่งแบบประเมิน");
      return;
    }

    const answersWithScore = Object.entries(answers).map(([qId, selectedOption]) => ({
      questionId: qId,
      selectedOption,
      score: selectedOption
    }));

    const totalScore = answersWithScore.reduce((sum, a) => sum + a.score, 0);

    let riskLevel = "";
    if (totalScore <= 4) riskLevel = "ปกติ";
    else if (totalScore <= 9) riskLevel = "เล็กน้อย";
    else if (totalScore <= 14) riskLevel = "ปานกลาง";
    else riskLevel = "รุนแรง";

    try {
      const user = auth.currentUser;
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        lastAssessment: { totalScore, riskLevel, date: new Date().toISOString(), answers: answersWithScore }
      }, { merge: true });

      const userSnapAfter = await getDoc(userRef);
      const userData = userSnapAfter.data();

      if (!userData.selectedInterests || userData.selectedInterests.length === 0) {
        navigation.replace("Interests");
      } else {
        navigation.replace("MainTabs");
      }
    } catch (error) {
      console.error("Error saving assessment:", error);
      alert("ผิดพลาด ไม่สามารถบันทึกผลได้");
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0077b6" />
        <Text style={{ marginTop: 10 }}>กำลังโหลดคำถาม...</Text>
      </View>
    );
  }

  const question = questions[currentIndex];

  return (
    <View style={styles.container}>
      <Text style={styles.progressText}>ข้อ {currentIndex + 1} / {questions.length}</Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { flex: currentIndex + 1 }]} />
        <View style={{ flex: questions.length - (currentIndex + 1) }} />
      </View>

      <View style={styles.questionContainer}>
        <Text style={styles.question}>{question.question}</Text>
        {question.options.map((opt, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.option, answers[question.id] === idx && styles.selectedOption]}
            onPress={() => handleSelect(idx)}
          >
            <Text style={answers[question.id] === idx ? styles.selectedText : styles.optionText}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonRow}>
        {currentIndex > 0 && (
          <TouchableOpacity style={styles.navButton} onPress={handlePrev}>
            <Text style={styles.navButtonText}>ย้อนกลับ</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.navButton} onPress={handleNext}>
          <Text style={styles.navButtonText}>{currentIndex === questions.length - 1 ? "ส่ง" : "ถัดไป"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f5f7fa" },
  progressText: { textAlign: "center", marginBottom: 5, fontSize: 14, color: "#333" },
  progressBar: { flexDirection: "row", height: 6, backgroundColor: "#ddd", borderRadius: 3, marginBottom: 20, overflow: "hidden" },
  progressFill: { backgroundColor: "#0077b6" },
  questionContainer: { backgroundColor: "#fff", padding: 20, borderRadius: 15, shadowColor: "#000", shadowOpacity: 0.1, shadowOffset: { width:0, height:2 }, shadowRadius:5, elevation:3 },
  question: { fontSize: 18, fontWeight: "bold", marginBottom: 15, color: "#333" },
  option: { padding: 15, borderWidth: 1, borderColor: "#ccc", borderRadius: 10, marginVertical: 6, backgroundColor: "#fff" },
  selectedOption: { backgroundColor: "#0077b6", borderColor: "#0077b6" },
  optionText: { color: "#333" },
  selectedText: { color: "#fff", fontWeight: "bold" },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  navButton: { backgroundColor: "#0077b6", paddingVertical: 12, paddingHorizontal: 25, borderRadius: 10 },
  navButtonText: { color: "#fff", fontWeight: "bold" }
});
