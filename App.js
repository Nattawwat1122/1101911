// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity } from 'react-native'; 
import Ionicons from 'react-native-vector-icons/Ionicons';

import HomeScreen from './screens/HomeScreen'; //หน้าแรก
import DiaryScreen from './screens/DiaryScreen';//ไดอารี่
import ConsultScreen from './screens/App';//แชทบอทให้คำปรึกษา
import ProfileScreen from './screens/ProfileScreen';//โปรไฟล์ผู้ใช้
import ActivityScreen from './screens/ActivityScreen';//กิจกรรมต่างๆ
import LoginScreen from './screens/LoginScreen';//หน้าล็อกอิน
import SignUpScreen from './screens/SignUpScreen';//หน้าสมัครสมาชิค
import MentalHealthSurveyScreen from './screens/MentalHealthSurveyScreen';//แบบสอบถามสุขภาพ
import MiniGameScreen from './screens/MiniGameScreen'; // 🔥 นำเข้า MiniGame
import DiaryLibraryScreen from'./screens/DiaryLibraryScreen';//คลังไดอารี่
import DoctorRecommendScreen from './screens/DoctorRecommendScreen';//รายชื่อจิตแพทย์ที่แนะนำ
import DoctorDetailScreen from './screens/DoctorDetailScreen';//รายละเอียดแพทย์ + ปุ่มนัดหมาย
import BookAppointmentScreen from './screens/BookAppointmentScreen';//หน้าจอสำหรับนัดหมายจิตแพทย์/หมอ
import AppointmentSummaryScreen from './screens/AppointmentSummaryScreen';//หน้าสรุปรายละเอียดการนัดหมายก่อนยืนยัน
import PaymentScreen from './screens/PaymentScreen';//หน้าชำระเงิน
import UpcomingAppointmentsScreen from './screens/UpcomingAppointmentsScreen';//แสดงการนัดหมายที่กำลังจะถึง
import PastAppointmentsScreen from './screens/PastAppointmentsScreen';//แสดงการนัดหมายที่ผ่านมาแล้ว
import CommunityScreen from './screens/Community';
import AppointmentDetailScreen from './screens/AppointmentDetailScreen';





const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'หน้าแรก') iconName = 'home-outline';
          else if (route.name === 'ไดอารี่') iconName = 'book-outline';
          else if (route.name === 'ปรึกษา') iconName = 'chatbubbles-outline';
          else if (route.name === 'โปรไฟล์') iconName = 'person-outline';
          else if (route.name === 'กิจกรรม') iconName = 'fitness-outline';
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: 'dodgerblue',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="หน้าแรก" component={HomeScreen} options={{
        headerShown: true,
        title: 'หน้าแรก',
        headerStyle: { backgroundColor: 'pink' },
        headerTintColor: '#fff',
        headerTitleAlign: 'center',
      }} />
      <Tab.Screen name="ไดอารี่" component={DiaryScreen} options={{
        headerShown: true,
        title: 'ไดอารี่',
        headerStyle: { backgroundColor: 'pink' },
        headerTintColor: 'white',
        headerTitleStyle: { fontWeight: 'bold' },
      }} />
      
      <Tab.Screen name="กิจกรรม" component={ActivityScreen} options={{
        headerShown: true,
        title: 'กิจกรรม',
        headerStyle: { backgroundColor: 'pink' },
        headerTintColor: '#fff',
        headerTitleAlign: 'center',
      }} />
      <Tab.Screen name="ปรึกษา" component={ConsultScreen} />
       
      <Tab.Screen name="โปรไฟล์" component={ProfileScreen} />
      
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* หน้า Login */}
        <Stack.Screen name="Login" component={LoginScreen} />
        {/* หน้า Signup */}
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        {/* แบบสอบถามสุขภาพจิตก่อนเข้าหน้าแรก */}
        <Stack.Screen name="MentalSurvey" component={MentalHealthSurveyScreen} />
        {/* หน้าแอปหลักแบบ Tab */}
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="DiaryLibrary" component={DiaryLibraryScreen} />
       <Stack.Screen
          name="UpcomingAppointments"
          component={UpcomingAppointmentsScreen}
          options={({ navigation }) => ({
            headerShown: true,
            title: 'นัดหมายในอนาคต',
            headerStyle: { backgroundColor: 'pink' },
            headerTintColor: '#fff',

            // ✅ ปุ่มไอคอน Home
            headerRight: () => (
              <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'หน้าแรก' })}>
                <Ionicons name="home-outline" size={26} color="#fff" />
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="PastAppointments"
          component={PastAppointmentsScreen}
          options={{
            headerShown: true,
            title: 'นัดหมายที่ผ่านมา',
            headerStyle: { backgroundColor: 'pink' },
            headerTintColor: '#fff',
            headerTitleAlign: 'center',
          }}
        /> 
        <Stack.Screen
          name="AppointmentDetail"
          component={AppointmentDetailScreen}
          options={{
            headerShown: true,
            title: 'รายละเอียดนัดหมาย',
            headerStyle: { backgroundColor: 'pink' },
            headerTintColor: '#fff',
            headerTitleAlign: 'center',
          }}
        />
        <Stack.Screen
        name="AppointmentSummary"
        component={AppointmentSummaryScreen}
        options={{
          headerShown: true,                   // ✅ เปิด header
          title: 'สรุปการนัดหมาย',
          headerStyle: { backgroundColor: 'pink' },
          headerTintColor: '#fff',
          headerTitleAlign: 'center',
        }}
      />
        <Stack.Screen
        name="BookAppointment"
        component={BookAppointmentScreen}
        options={{
          headerShown: true,
          title: 'เลือกวันเวลา',
          headerStyle: { backgroundColor: 'pink' },
          headerTintColor: '#fff',
          headerTitleAlign: 'center',
        }}
      />
        <Stack.Screen
          name="Payment"
          component={PaymentScreen}
          options={{
            headerShown: true,
            title: 'ชำระเงิน',
            headerStyle: { backgroundColor: 'pink' },
            headerTintColor: '#fff',
            headerTitleAlign: 'center',
          }}
        />

        <Stack.Screen
          name="MiniGame"component={MiniGameScreen}
          options={{
            headerShown: true,
            title: 'มินิเกมเลี้ยงสัตว์',
            headerStyle: { backgroundColor: 'pink' },
            headerTintColor: '#fff',
            headerTitleAlign: 'center',
            
          }}
        />
        <Stack.Screen
          name="DoctorDetail"
          component={DoctorDetailScreen}
          options={{
            headerShown: true,
            title: 'รายละเอียดแพทย์',
            headerStyle: { backgroundColor: 'pink' },
            headerTintColor: '#fff',
          }}
          
        />
        {/* ✅ หน้าที่เพิ่มเข้ามา */}
        <Stack.Screen
          name="DoctorRecommend"
          component={DoctorRecommendScreen}
          options={{
            headerShown: true,
            title: 'แนะนำจิตแพทย์',
            headerStyle: { backgroundColor: 'pink' },
            headerTintColor: '#fff',
            headerTitleAlign: 'center',
          }}
        />
        
        
            
            
          
          <Stack.Screen name="Community" component={CommunityScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
