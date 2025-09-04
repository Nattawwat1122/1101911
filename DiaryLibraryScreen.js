import React, { useState } from "react";
import { View, Text, ActivityIndicator, ScrollView, Alert, Button } from "react-native";
import axios from "axios";

export default function DiaryLibraryScreen({ route }) {
  const { diaryEntries } = route.params || {};
  const [analysisResults, setAnalysisResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  // ฟังก์ชันวิเคราะห์ทุกบันทึก
  const analyzeAllEntries = async () => {
    if (!diaryEntries || Object.keys(diaryEntries).length === 0) {
      Alert.alert("ไม่มีบันทึก", "คุณยังไม่ได้บันทึกไดอารี่เลย");
      return;
    }

    setLoading(true);
    let results = {};
    let count = { pos: 0, neg: 0, neu: 0 };

    for (const [date, text] of Object.entries(diaryEntries)) {
      try {
        const res = await axios.post("http://10.1.105.202:5000/diary", { message: text });
        const sentiment = res.data.emotion; // 👈 ได้ผลลัพธ์จาก Flask + Gemini

        results[date] = { text, sentiment };

        // ✅ นับภาพรวม
        if (sentiment.includes("ดีใจ") || sentiment.includes("บวก")) count.pos++;
        else if (sentiment.includes("เศร้า") || sentiment.includes("กังวล") || sentiment.includes("ลบ")) count.neg++;
        else count.neu++;
      } catch (err) {
        console.error("Error analyzing:", err);
        results[date] = { text, sentiment: "วิเคราะห์ไม่ได้" };
      }
    }

    setAnalysisResults(results);
    setLoading(false);
    setSummary(count);
    Alert.alert("เสร็จสิ้น", "วิเคราะห์อารมณ์ของทุกบันทึกเรียบร้อยแล้ว ✅");
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Button
        title="วิเคราะห์อารมณ์ทั้งหมด"
        onPress={analyzeAllEntries}
        color="dodgerblue"
      />

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text>กำลังวิเคราะห์อารมณ์ทั้งหมด...</Text>
        </View>
      ) : (
        <ScrollView style={{ marginTop: 20 }}>
          {/* ✅ แสดงภาพรวม */}
          {summary && (
            <View style={{ marginBottom: 20, padding: 15, backgroundColor: "#f0f8ff", borderRadius: 10 }}>
              <Text style={{ fontWeight: "bold", fontSize: 16 }}>📊 ภาพรวมอารมณ์</Text>
              <Text>😊 บวก: {summary.pos} วัน</Text>
              <Text>😐 เฉยๆ: {summary.neu} วัน</Text>
              <Text>😢 ลบ: {summary.neg} วัน</Text>
            </View>
          )}

          {Object.entries(analysisResults).map(([date, { text, sentiment }]) => (
            <View
              key={date}
              style={{
                padding: 10,
                borderBottomWidth: 1,
                borderBottomColor: "#ccc",
              }}
            >
              <Text style={{ fontWeight: "bold" }}>📅 {date}</Text>
              <Text>✏ {text}</Text>
              <Text>😊 อารมณ์: {sentiment}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
