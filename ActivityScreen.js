import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function ActivityScreen() {
  const navigation = useNavigation();

  const menuItems = [
    {
      icon: 'game-controller-outline',
      title: 'มินิเกมจับคู่',
      subtitle: 'เล่นเกมฝึกความจำ ผ่อนคลายสมอง',
      onPress: () => navigation.navigate('MiniGame'),
    },
    {
      icon: 'help-circle-outline',
      title: 'แบบสอบถามผ่อนคลายอารมณ์',
      subtitle: 'ประเมินระดับความเครียดของคุณ',
      onPress: () => navigation.navigate('MentalSurvey'),
    },
    {
      icon: 'book-outline',
      title: 'ไดอารี่',
      subtitle: 'เขียนบันทึกความรู้สึกประจำวัน',
      onPress: () => navigation.navigate('ไดอารี่'),
    },
    {
      icon: 'people-outline',
      title: 'Community',
      subtitle: 'พูดคุย แลกเปลี่ยน แชร์ความรู้สึก',
      onPress: () => navigation.navigate('Community'),
    }
  ];

  return (
    <ScrollView style={styles.container}>
      {menuItems.map((item, index) => (
        <TouchableOpacity key={index} style={styles.item} onPress={item.onPress}>
          <Ionicons name={item.icon} size={26} color="#3e3e3e" style={styles.icon} />
          <View style={styles.textContainer}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  icon: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    color: '#111',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    color: '#777',
  },
});
