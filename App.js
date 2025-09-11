import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { rtdb, auth } from './firebase';
import { ref, set, onDisconnect, serverTimestamp } from 'firebase/database';

import HomeScreen from './screens/HomeScreen';
import DiaryScreen from './screens/DiaryScreen';
import ProfileScreen from './screens/ProfileScreen';
import ActivityScreen from './screens/ActivityScreen';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import DiaryLibraryScreen from './screens/DiaryLibraryScreen';
import MiniGameScreen from './screens/MiniGameScreen';
import ChatLibrary from './screens/ChatLibrary';
import MentalHealthSurveyScreen from './screens/MentalHealthSurveyScreen';
import CommunityScreen from './screens/Community';
import AssessmentScreen from './screens/AssessmentScreen';
import InterestScreen from './screens/InterestScreen';

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
          else if (route.name === 'แชทช่วยเหลือ') iconName = 'chatbubbles-outline';
          else if (route.name === 'โปรไฟล์') iconName = 'person-outline';
          else if (route.name === 'กิจกรรม') iconName = 'fitness-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: 'dodgerblue',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen
        name="หน้าแรก"
        component={HomeScreen}
        options={{
          headerShown: true,
          title: 'หน้าแรก',
          headerStyle: { backgroundColor: 'pink' },
          headerTintColor: '#fff',
          headerTitleAlign: 'center',
        }}
      />
      <Tab.Screen
        name="ไดอารี่"
        component={DiaryScreen}
        options={{
          headerShown: true,
          title: 'ไดอารี่',
          headerStyle: { backgroundColor: 'pink' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerTitleAlign: 'center',
        }}
      />
      <Tab.Screen
        name="กิจกรรม"
        component={ActivityScreen}
        options={{
          headerShown: true,
          title: 'กิจกรรม',
          headerStyle: { backgroundColor: 'pink' },
          headerTintColor: '#fff',
          headerTitleAlign: 'center',
        }}
      />
      <Tab.Screen
        name="แชทช่วยเหลือ"
        component={ChatLibrary}
        options={{
          headerShown: true,
          title: 'แชทช่วยเหลือ',
          headerStyle: { backgroundColor: 'pink' },
          headerTintColor: '#fff',
          headerTitleAlign: 'center',
          headerTitleStyle: { fontWeight: 'bold', fontSize: 20 },
        }}
      />
      <Tab.Screen name="โปรไฟล์" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    let appStateSubscription;

    const setupUserStatus = (user) => {
      if (!user || !rtdb) return;

      const userStatusRef = ref(rtdb, 'status/' + user.uid);

      // ตั้งค่า online ทันที
      set(userStatusRef, { status: 'online', lastActive: serverTimestamp() }).catch(console.error);

      // ตั้ง onDisconnect → offline ถ้าแอปถูก kill / เน็ตหลุด
      onDisconnect(userStatusRef).set({ status: 'offline', lastActive: serverTimestamp() });

      // Track foreground/background
      appStateSubscription = AppState.addEventListener('change', nextAppState => {
        set(userStatusRef, {
          status: nextAppState === 'active' ? 'online' : 'offline',
          lastActive: serverTimestamp()
        }).catch(console.error);
        appState.current = nextAppState;
      });
    };

    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      setupUserStatus(user);
    });

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (appStateSubscription) appStateSubscription.remove();
    };
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="MentalSurvey" component={MentalHealthSurveyScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="DiaryLibrary" component={DiaryLibraryScreen} />
        <Stack.Screen name="MiniGame" component={MiniGameScreen} />
        <Stack.Screen name="Community" component={CommunityScreen} />
        <Stack.Screen name="Assessment" component={AssessmentScreen} />
        <Stack.Screen name="Interests" component={InterestScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
