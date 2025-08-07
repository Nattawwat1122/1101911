// App.js
import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import axios from "axios";
import styles from "./ChatStyles";

export default function App() {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const scrollViewRef = useRef();

  const handleSend = async () => {
    if (!message.trim()) return;

    const userMsg = { sender: "user", text: message };
    setChatHistory((prev) => [...prev, userMsg]);

    try {
      console.log('444')
      const res = await axios.post("http://192.168.0.182:5000/chat", { message });
      console.log('ppp')
      const aiMsg = { sender: "ai", text: res.data.reply };
      setChatHistory((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.log(err);
      setChatHistory((prev) => [...prev, { sender: "ai", text: "เกิดข้อผิดพลาด" }]);
    }

    setMessage("");
  };

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
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="พิมพ์ข้อความ..."
          value={message}
          onChangeText={setMessage}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity onPress={handleSend} style={styles.button}>
          <Text style={styles.buttonText}>ส่ง</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
