// firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';


const firebaseConfig = {
  apiKey: "AIzaSyByrcAEkiXvFD5POwK-gh5vmRowTiCpYRI",
  authDomain: "mental-health-project-39da8.firebaseapp.com",
  projectId: "mental-health-project-39da8",
  storageBucket: "mental-health-project-39da8.appspot.com",
  messagingSenderId: "141911957949",
  appId: "1:141911957949:web:becb3990f2ba553e16b2d4",
  measurementId: "G-Z8352Q2PHF"
};

// ตรวจสอบก่อนว่าเคย initialize แล้วหรือยัง

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app); // <-- export db ออกมา