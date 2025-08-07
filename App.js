import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import HomeScreen from './screens/HomeScreen';
import DiaryScreen from './screens/DiaryScreen';
import ConsultScreen from './screens/Chat';
import ProfileScreen from './screens/ProfileScreen';
import ActivityScreen from './screens/ActivityScreen';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import DiaryLibraryScreen from './screens/DiaryLibraryScreen';
import MiniGameScreen from './screens/MiniGameScreen'; 


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
        {/* หน้าแอปหลักแบบ Tab */}
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="DiaryLibrary" component={DiaryLibraryScreen} />
        <Stack.Screen name="MiniGame" component={MiniGameScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
