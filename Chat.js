// Chat.js
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import axios from "axios";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";

export default function Chat({ chatId, userId, onSendMessage }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const scrollViewRef = useRef();

  // ✅ โหลด history ของแชทจาก Firestore แบบ realtime
  useEffect(() => {
    if (!chatId || !userId) return;

    const messagesRef = collection(
      db,
      "ChatHistory",
      userId,
      "Chats",
      chatId,
      "Messages"
    );

    const q = query(messagesRef, orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(loadedMessages);
    });

    return () => unsubscribe();
  }, [chatId, userId]);

  // ✅ ส่งข้อความ
  const handleSend = async () => {
    if (!message.trim() || !chatId || !userId) return;

    const userMsg = { sender: "user", text: message };
    onSendMessage(chatId, userMsg); // ส่งไป Firestore

    try {
      const res = await axios.post("http://10.0.2.2:5000/chat", { message });
      const aiMsg = { sender: "ai", text: res.data.reply };
      onSendMessage(chatId, aiMsg); // ส่งกลับเข้า Firestore
    } catch (err) {
      console.error("Chat error:", err);
      const errorMsg = { sender: "ai", text: "เกิดข้อผิดพลาดในการตอบกลับ" };
      onSendMessage(chatId, errorMsg);
    }

    setMessage("");
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  if (!chatId) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>กรุณาเลือกหรือสร้างแชทใหม่</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.sender === "user"
                ? styles.userBubble
                : styles.aiBubble,
            ]}
          >
            <Text>{msg.text}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="พิมพ์ข้อความ..."
          value={message}
          onChangeText={setMessage}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Text style={styles.sendText}>ส่ง</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    paddingVertical: 10,
  },
  messageBubble: {
    marginVertical: 6,
    padding: 10,
    borderRadius: 10,
    maxWidth: "80%",
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#DCF8C6",
  },
  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#E8E8E8",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "#ccc",
  },
  input: {
    flex: 1,
    padding: 10,
    borderColor: "#aaa",
    borderWidth: 1,
    borderRadius: 6,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  sendText: {
    color: "#fff",
    fontWeight: "bold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#777",
  },
});
