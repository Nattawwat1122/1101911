import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { db } from '../firebase';
import { getAuth } from 'firebase/auth';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  increment,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import moment from 'moment';

export default function CommunityScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('user');
  const [userPosts, setUserPosts] = useState([]);
  const [newUserPost, setNewUserPost] = useState('');
  const [username, setUsername] = useState('');

  const [adminPosts, setAdminPosts] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [selectedPostType, setSelectedPostType] = useState('user'); // 'user' หรือ 'admin'
  const [comments, setComments] = useState([]);

  const auth = getAuth();
  const currentUserUID = auth.currentUser?.uid;

  // ดึง username จริงจาก Firestore
  useEffect(() => {
    if (!currentUserUID) return;

    const fetchUsername = async () => {
      const userDocRef = doc(db, 'users', currentUserUID);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        setUsername(userSnap.data().username);
      }
    };

    fetchUsername();
  }, [currentUserUID]);

  // โหลด userPosts
  useEffect(() => {
    const q = query(collection(db, 'userPosts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUserPosts(posts);
    });
    return () => unsubscribe();
  }, []);

  // โหลด adminPosts
  useEffect(() => {
    const q = query(collection(db, 'adminPosts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAdminPosts(posts);
    });
    return () => unsubscribe();
  }, []);

  // โหลดคอมเมนต์ real-time สำหรับทั้ง userPosts และ adminPosts
  useEffect(() => {
    if (!selectedPostId) {
      setComments([]);
      return;
    }

    const collectionName = selectedPostType === 'user' ? 'userPosts' : 'adminPosts';
    const commentsRef = collection(db, collectionName, selectedPostId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedComments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setComments(loadedComments);
    });

    return () => unsubscribe();
  }, [selectedPostId, selectedPostType]);

  // เพิ่มโพสต์ user
  const addUserPost = async () => {
    if (!newUserPost.trim() || !username) return;
    await addDoc(collection(db, 'userPosts'), {
      user: username,
      content: newUserPost,
      likes: 0,
      likedBy: [],
      createdAt: serverTimestamp(),
    });
    setNewUserPost('');
  };

  // ไลค์โพสต์
  const likePost = async (id, type) => {
    if (!username) return;
    const postRef = doc(db, type === 'user' ? 'userPosts' : 'adminPosts', id);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) return;

    const postData = postSnap.data();
    const likedBy = postData.likedBy || [];

    if (likedBy.includes(username)) {
      await updateDoc(postRef, {
        likes: increment(-1),
        likedBy: likedBy.filter((u) => u !== username),
      });
    } else {
      await updateDoc(postRef, {
        likes: increment(1),
        likedBy: [...likedBy, username],
      });
    }
  };

  // เพิ่มคอมเมนต์
  const addComment = async () => {
    if (!commentText.trim() || !selectedPostId || !username) return;

    const collectionName = selectedPostType === 'user' ? 'userPosts' : 'adminPosts';
    const postRef = doc(db, collectionName, selectedPostId);
    const commentsRef = collection(postRef, 'comments');

    await addDoc(commentsRef, {
      user: username,
      text: commentText,
      createdAt: serverTimestamp(),
    });

    setCommentText('');
    setSelectedPostId(null);
  };

  const postsToShow = activeTab === 'user' ? userPosts : adminPosts;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'user' && styles.activeTab]}
          onPress={() => setActiveTab('user')}
        >
          <Text style={styles.tabText}>โพสต์ User</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'admin' && styles.activeTab]}
          onPress={() => setActiveTab('admin')}
        >
          <Text style={styles.tabText}>โพสต์ แพทย์/Admin</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'user' && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="เล่าอะไรสั้น ๆ ให้ชุมชนฟัง…"
            placeholderTextColor="#aaa"
            value={newUserPost}
            onChangeText={setNewUserPost}
            multiline
          />
          <TouchableOpacity style={styles.button} onPress={addUserPost}>
            <Text style={styles.buttonText}>โพสต์</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={postsToShow}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={styles.post}>
            {activeTab === 'user' ? (
              <>
                <View style={styles.postHeader}>
                  <View style={styles.avatar}></View>
                  <Text style={styles.user}>{item.user}</Text>
                </View>
                <Text style={styles.content}>{item.content}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[
                      styles.chip,
                      item.likedBy?.includes(username) && { backgroundColor: '#ffc0cb' },
                    ]}
                    onPress={() => likePost(item.id, 'user')}
                  >
                    <Text style={styles.chipText}>❤ ชอบ {item.likes || 0}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.chip}
                    onPress={() => {
                      setSelectedPostId(selectedPostId === item.id ? null : item.id);
                      setSelectedPostType('user');
                    }}
                  >
                    <Text style={styles.chipText}>💬 ความคิดเห็น</Text>
                  </TouchableOpacity>
                </View>

                {selectedPostId === item.id && comments.length > 0 && (
                  <View style={styles.commentsContainer}>
                    {comments.map((c) => (
                      <View
                        key={c.id}
                        style={[
                          styles.comment,
                          c.user === username
                            ? { backgroundColor: '#ffe6f0' }
                            : { backgroundColor: '#fff' },
                        ]}
                      >
                        <Text style={styles.commentUser}>{c.user}:</Text>
                        <Text style={styles.commentText}>{c.text}</Text>
                        {c.createdAt?.toDate && (
                          <Text style={styles.commentTime}>
                            {moment(c.createdAt.toDate()).format('D MMM HH:mm')}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={styles.adminAuthor}>
                  {item.user} ({item.role})
                </Text>
                <Text style={styles.content}>{item.content}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[
                      styles.chip,
                      item.likedBy?.includes(username) && { backgroundColor: '#ffc0cb' },
                    ]}
                    onPress={() => likePost(item.id, 'admin')}
                  >
                    <Text style={styles.chipText}>❤ ชอบ {item.likes || 0}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.chip}
                    onPress={() => {
                      setSelectedPostId(selectedPostId === item.id ? null : item.id);
                      setSelectedPostType('admin');
                    }}
                  >
                    <Text style={styles.chipText}>💬 ความคิดเห็น</Text>
                  </TouchableOpacity>
                </View>

                {selectedPostId === item.id && comments.length > 0 && (
                  <View style={styles.commentsContainer}>
                    {comments.map((c) => (
                      <View
                        key={c.id}
                        style={[
                          styles.comment,
                          c.user === username
                            ? { backgroundColor: '#ffe6f0' }
                            : { backgroundColor: '#fff' },
                        ]}
                      >
                        <Text style={styles.commentUser}>{c.user}:</Text>
                        <Text style={styles.commentText}>{c.text}</Text>
                        {c.createdAt?.toDate && (
                          <Text style={styles.commentTime}>
                            {moment(c.createdAt.toDate()).format('D MMM HH:mm')}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}
      />

      {selectedPostId && (
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="พิมพ์ความคิดเห็น..."
            value={commentText}
            onChangeText={setCommentText}
          />
          <TouchableOpacity style={styles.sendButton} onPress={addComment}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>ส่ง</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButtonFloating}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffe6f0',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#ff69b4',
    fontSize: 20,
    fontWeight: '700',
  },
  tabContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 8 },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#eee',
    alignItems: 'center',
  },
  activeTab: { backgroundColor: '#ff69b4' },
  tabText: { fontWeight: '700', color: '#333' },
  inputContainer: { flexDirection: 'row', margin: 12, alignItems: 'flex-end' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ffb6c1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    color: '#333',
    maxHeight: 120,
  },
  button: {
    backgroundColor: '#ff69b4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 12,
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  post: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ffb6c1',
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ffc0cb',
    marginRight: 12,
  },
  user: { fontWeight: '700', fontSize: 15, color: '#333' },
  adminAuthor: { fontWeight: '700', fontSize: 15, color: '#ff69b4', marginBottom: 8 },
  content: { fontSize: 14, color: '#555', marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: { color: '#333', fontWeight: '600' },
  commentInputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: '#ff69b4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginLeft: 8,
    borderRadius: 12,
    justifyContent: 'center',
  },
  backButtonFloating: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff69b4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentsContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ffe6f0',
    paddingTop: 8,
  },
  comment: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
    backgroundColor: '#fff0f5',
    padding: 8,
    borderRadius: 12,
  },
  commentUser: {
    fontWeight: '700',
    color: '#ff69b4',
    marginRight: 4,
  },
  commentText: {
    color: '#555',
  },
  commentTime: {
    width: '100%',
    fontSize: 10,
    color: '#aaa',
    marginTop: 2,
  },
});
