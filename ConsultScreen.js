// screens/ConsultScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';

export default function ConsultScreen() {
  const [messages, setMessages] = useState([
    { id: '1', sender: 'ai', text: 'สวัสดี! ฉันสามารถช่วยอะไรเกี่ยวกับสุขภาพจิตคุณได้บ้าง?' }
  ]);
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMessage = { id: Date.now().toString(), sender: 'user', text: inputText };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // จำลองการตอบกลับจาก AI
    setTimeout(() => {
      const aiReply = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: generateAIResponse(inputText),
      };
      setMessages(prev => [...prev, aiReply]);
    }, 1000);
  };

  const generateAIResponse = (input) => {
    // ตอบจำลองเบื้องต้น
    if (input.includes('เครียด')) return 'คุณกำลังเผชิญความเครียดเรื่องอะไรอยู่? ฉันพร้อมรับฟังนะ';
    if (input.includes('เหนื่อย')) return 'ลองพักผ่อนดูบ้างนะ บางครั้งการหยุดพักช่วยให้ใจเบาลงได้เยอะเลย';
    return 'ขอบคุณที่แชร์ความรู้สึก ฉันอยู่ตรงนี้เพื่อคุณเสมอ';
  };

  const renderItem = ({ item }) => (
    <View style={[styles.messageBubble, item.sender === 'user' ? styles.userBubble : styles.aiBubble]}>
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={80}
    >
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.chatContainer}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="พิมพ์ข้อความของคุณ..."
        />
        <Button title="ส่ง" onPress={handleSend} color="dodgerblue" />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  chatContainer: {
    padding: 10,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageBubble: {
    padding: 10,
    borderRadius: 10,
    marginVertical: 4,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: '#DCF8C6',
    alignSelf: 'flex-end',
  },
  aiBubble: {
    backgroundColor: '#E2E2E2',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fafafa',
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f1f1f1',
    borderRadius: 20,
    marginRight: 10,
  },
});
