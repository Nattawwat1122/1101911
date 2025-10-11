import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Chat from "./chat";

import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase";

export default function ChatScreen() {
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const chatsRef = collection(db, "ChatHistory", currentUser.uid, "Chats");
      const snapshot = await getDocs(query(chatsRef, orderBy("created_at", "asc")));
      const loadedChats = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setChats(loadedChats);
      if (loadedChats.length > 0) {
        setSelectedChatId(loadedChats[0].id);
      }
    } catch (error) {
      console.error("Error loading chats:", error);
    }
  };

  const createNewChat = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const chatsRef = collection(db, "ChatHistory", currentUser.uid, "Chats");
      const newChatRef = await addDoc(chatsRef, {
        title: `แชท ${chats.length + 1}`,
        created_at: serverTimestamp(),
        last_updated: serverTimestamp(),
      });

      const newChat = {
        id: newChatRef.id,
        title: `แชท ${chats.length + 1}`,
        history: [],
      };

      setChats((prev) => [...prev, newChat]);
      setSelectedChatId(newChatRef.id);
    } catch (error) {
      console.error("Error creating new chat:", error);
    }
  };

  const deleteChat = async (chatId) => {
    Alert.alert(
      "ลบแชท",
      "คุณต้องการลบแชทนี้หรือไม่?",
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ลบ",
          style: "destructive",
          onPress: async () => {
            try {
              const currentUser = auth.currentUser;
              if (!currentUser) return;

              await deleteDoc(doc(db, "ChatHistory", currentUser.uid, "Chats", chatId));
              setChats((prev) => prev.filter((chat) => chat.id !== chatId));
              if (selectedChatId === chatId) setSelectedChatId(null);
            } catch (error) {
              console.error("Error deleting chat:", error);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const onSendMessage = async (chatId, message) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const messagesRef = collection(
        db,
        "ChatHistory",
        currentUser.uid,
        "Chats",
        chatId,
        "Messages"
      );
      await addDoc(messagesRef, {
        sender: message.sender,
        userId: currentUser.uid,
        text: message.text,
        timestamp: serverTimestamp(),
      });

      await setDoc(
        doc(db, "ChatHistory", currentUser.uid, "Chats", chatId),
        { last_updated: serverTimestamp() },
        { merge: true }
      );
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const renderChatItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.chatItem,
        selectedChatId === item.id && styles.chatItemSelected,
      ]}
      onPress={() => {
        setSelectedChatId(item.id);
        if (!sidebarVisible) setSidebarVisible(true);
      }}
      onLongPress={() => deleteChat(item.id)}
    >
      <Text style={styles.chatTitle}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        {sidebarVisible && (
          <View style={styles.sidebar}>
            <TouchableOpacity onPress={createNewChat} style={styles.newChatButton}>
              <Text style={styles.newChatText}>+ สร้างแชทใหม่</Text>
            </TouchableOpacity>
            <FlatList
              data={chats}
              renderItem={renderChatItem}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <Text style={styles.emptyText}>ยังไม่มีแชท กดสร้างใหม่ได้เลย</Text>
              }
            />
          </View>
        )}

        <View style={[styles.chatArea, sidebarVisible ? {} : styles.chatAreaFull]}>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setSidebarVisible((prev) => !prev)}
          >
            <Text style={styles.toggleButtonText}>
              {sidebarVisible ? "←" : "→"}
            </Text>
          </TouchableOpacity>

          {selectedChatId ? (
            <Chat
              chatId={selectedChatId}
              userId={auth.currentUser?.uid}
              onSendMessage={onSendMessage}
            />
          ) : (
            <Text style={styles.emptyText}>เลือกแชทหรือสร้างใหม่</Text>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const { width } = Dimensions.get("window");
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#fafafa",
  },
  sidebar: {
    width: width * 0.32,
    backgroundColor: "#f9f9f9",
    borderRightWidth: 1,
    borderRightColor: "#ddd",
    padding: 10,
  },
  newChatButton: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ffffffff",
    alignItems: "center",
  },
  newChatText: {
    color: "#de04a0ff",
    fontWeight: "bold",
    fontSize: 16,
  },
  chatItem: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#eee",
    marginBottom: 8,
  },
  chatItemSelected: {
    backgroundColor: "#ffcff4ff",
  },
  chatTitle: {
    fontSize: 16,
    color: "#333",
  },
  chatArea: {
    flex: 1,
    padding: 10,
  },
  chatAreaFull: {
    width: "100%",
  },
  emptyText: {
    color: "#888",
    fontStyle: "italic",
    marginTop: 20,
    textAlign: "center",
  },
  toggleButton: {
    alignSelf: "flex-start",
    marginBottom: 8,
    backgroundColor: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  toggleButtonText: {
    color: "#333",
    fontWeight: "bold",
    fontSize: 18,
  },
});
