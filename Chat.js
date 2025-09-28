import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from "react-native";
import axios from "axios";
import styles from "./ChatStyles";

// ตั้งค่า URL ให้เหมาะกับอุปกรณ์ที่รัน
const DEV_SERVER_URL = Platform.OS === 'ios' ? 'http://localhost:5000' : ' http://192.168.1.137:5000';
// ⚠️ แทนที่ <YOUR-LAN-IP> เป็น IP เครื่องเซิร์ฟเวอร์เวลารันบนมือถือจริง/โปรดักชัน
const PROD_SERVER_URL = ' http://192.168.1.137:5000';
const SERVER_URL = __DEV__ ? DEV_SERVER_URL : PROD_SERVER_URL;

// axios instance
const api = axios.create({
  baseURL: SERVER_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

export default function App() {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]); // <- ไม่มี generic
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef(null); // <- ไม่มี <ScrollView>

  const handleSend = async () => {
    const text = message.trim();
    if (!text || loading) return;

    const userMsg = { sender: "user", text }; // <- ไม่มี as const
    setChatHistory((prev) => [...prev, userMsg]);
    setMessage("");
    setLoading(true);

    try {
      const res = await api.post("/chat", { message: text });
      const aiMsg = { sender: "ai", text: (res && res.data && res.data.reply) ? res.data.reply : "ไม่สามารถตอบได้" };
      setChatHistory((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("Error sending message:", err?.message || err);
      setChatHistory((prev) => [...prev, { sender: "ai", text: "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์" }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [chatHistory]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.chatContainer}
        ref={scrollViewRef}
        contentContainerStyle={{ paddingVertical: 10 }}
        keyboardShouldPersistTaps="handled"
      >
        {chatHistory.map((chat, index) => (
          <View
            key={index}
            style={[
              styles.messageBubble,
              {
                alignSelf: chat.sender === "user" ? "flex-end" : "flex-start",
                backgroundColor: chat.sender === "user" ? "#DCF8C6" : "#cbcbcbff",
              },
            ]}
          >
            <Text>{chat.text}</Text>
          </View>
        ))}

        {loading && (
          <View style={[styles.messageBubble, { alignSelf: "flex-start", backgroundColor: "#cbcbcbff" }]}>
            <ActivityIndicator size="small" />
          </View>
        )}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="พิมพ์ข้อความ..."
          value={message}
          onChangeText={setMessage}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          editable={!loading}
          blurOnSubmit={false}
        />
        <TouchableOpacity onPress={handleSend} style={styles.button} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "กำลังส่ง..." : "ส่ง"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
