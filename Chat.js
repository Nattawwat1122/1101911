import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from "react-native";
import axios from "axios";
import styles from "./ChatStyles"; // ตรวจสอบว่ามีไฟล์นี้อยู่

// Firebase imports
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase"; // ตรวจสอบ path ให้ถูกต้อง

// ⚠️ ตั้งค่า IP Address ของเครื่องที่รันเซิร์ฟเวอร์ Flask ของคุณ
const SERVER_URL = Platform.OS === 'ios' ? 'http://localhost:5000' : 'http://192.168.1.56:5000';

const api = axios.create({
  baseURL: SERVER_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// 1. เปลี่ยนจาก App() เป็น Chat และรับ props จาก ChatScreen
export default function Chat({ chatId, userId, onSendMessage }) {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef(null);

  // 2. ใช้ useEffect เพื่อดึงข้อความจาก Firestore แบบ Real-time ตาม chatId ที่ได้รับมา
  useEffect(() => {
    if (!chatId || !userId) return;

    const messagesRef = collection(db, "ChatHistory", userId, "Chats", chatId, "Messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    // onSnapshot จะคอย "ฟัง" การเปลี่ยนแปลงข้อมูลใน Firestore
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setChatHistory(messages);
    });

    // ยกเลิกการ "ฟัง" เมื่อ Component ถูกปิดหรือเปลี่ยนแชท
    return () => unsubscribe();
  }, [chatId, userId]); // <-- ให้โค้ดส่วนนี้ทำงานใหม่ทุกครั้งที่ chatId หรือ userId เปลี่ยน

  const handleSend = async () => {
    const text = message.trim();
    if (!text || loading) return;

    setMessage("");

    const userMsg = { sender: "user", text };

    // 3. เรียกใช้ onSendMessage ที่ได้รับจาก ChatScreen เพื่อบันทึกข้อความ user
    await onSendMessage(chatId, userMsg);

    setLoading(true);
    try {
      const res = await api.post("/chat", { message: text });
      const aiReply = res?.data?.reply || "ไม่สามารถตอบได้";
      const aiMsg = { sender: "ai", text: aiReply };

      // บันทึกข้อความของ AI ผ่าน onSendMessage เช่นกัน
      await onSendMessage(chatId, aiMsg);

    } catch (err) {
      console.error("Error calling API:", err?.message || err);
      const errorMsg = { sender: "ai", text: "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์" };
      await onSendMessage(chatId, errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [chatHistory]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.chatContainer}
        ref={scrollViewRef}
        contentContainerStyle={{ paddingVertical: 10 }}
      >
        {chatHistory.map((chat) => (
          <View
            key={chat.id}
            style={[
              styles.messageBubble,
              {
                alignSelf: chat.sender === "user" ? "flex-end" : "flex-start",
                backgroundColor: chat.sender === "user" ? "#f4c5e9ff" : "#f5edf8ff",
              },
            ]}
          >
            <Text>{chat.text}</Text>
          </View>
        ))}
        {loading && <ActivityIndicator style={{ alignSelf: 'flex-start', margin: 10 }} size="small" />}
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
        />
        <TouchableOpacity onPress={handleSend} style={styles.button} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "..." : "ส่ง"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
