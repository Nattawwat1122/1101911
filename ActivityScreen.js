// screens/ActivityScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const radius = 14;

export default function ActivityScreen() {
  const navigation = useNavigation();

  const menuItems = [
    {
      icon: 'game-controller-outline',
      color: '#f59e0b',
      title: 'มินิเกมจับคู่',
      subtitle: 'เล่นเกมฝึกความจำ ผ่อนคลายสมอง',
      onPress: () => navigation.navigate('MiniGame'),
    },
    {
      icon: 'help-circle-outline',
      color: '#3b82f6',
      title: 'แบบสอบถามผ่อนคลายอารมณ์',
      subtitle: 'ประเมินระดับความเครียดของคุณ',
      onPress: () => navigation.navigate('MentalSurvey'),
    },
    {
      icon: 'book-outline',
      color: '#10b981',
      title: 'ไดอารี่',
      subtitle: 'เขียนบันทึกความรู้สึกประจำวัน',
      onPress: () => navigation.navigate('ไดอารี่'),
    },
    {
      icon: 'medkit-outline',
      color: '#ef4444',
      title: 'แนะนำจิตแพทย์',
      subtitle: 'ติดต่อผู้เชี่ยวชาญเฉพาะด้าน',
      onPress: () => navigation.navigate('DoctorRecommend'),
    },
    {
      icon: 'add-circle-outline',
      color: '#8b5cf6',
      title: 'เพิ่มแพทย์',
      subtitle: 'เพิ่มข้อมูลแพทย์เข้าสู่ระบบ (เฉพาะผู้ดูแล)',
      onPress: () => navigation.navigate('AddDoctors'),
    },
    {
      icon: 'people-outline',
      color: '#06b6d4',
      title: 'Community',
      subtitle: 'พูดคุย แลกเปลี่ยน แชร์ความรู้สึก',
      onPress: () => navigation.navigate('Community'),
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      
      {menuItems.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.card}
          activeOpacity={0.9}
          onPress={item.onPress}
        >
          <View style={[styles.iconBox, { backgroundColor: item.color + '20' }]}>
            <Ionicons name={item.icon} size={26} color={item.color} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: radius,
    backgroundColor: '#fff',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
});
