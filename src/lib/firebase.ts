// Firebase 연결 지점. .env.local에 VITE_FIREBASE_* 값이 채워져 있어야 동작합니다.
// 값이 없으면(아직 설정 전) isFirebaseConfigured가 false가 되고, 앱은 자동으로
// localStorage 데모 모드로 동작합니다 — README의 "실제 서비스로 넘어가기" 참고.

import { initializeApp, type FirebaseOptions } from "firebase/app";
import { GoogleAuthProvider, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey);

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;

export const firebaseAuth = app ? getAuth(app) : null;
export const firestore = app ? getFirestore(app) : null;
export const firebaseStorage = app ? getStorage(app) : null;
export const googleProvider = new GoogleAuthProvider();
