// Firebase 연결 지점. .env.local에 VITE_FIREBASE_* 값이 채워져 있어야 동작합니다.
// 값이 없으면(아직 설정 전) isFirebaseConfigured가 false가 되고, 앱은 자동으로
// localStorage 데모 모드로 동작합니다 — README의 "실제 서비스로 넘어가기" 참고.
//
// Firebase Storage는 쓰지 않습니다(사진을 저장하지 않는 설계 — README 참고).
// 로그인은 Firebase Auth, 저장은 Firestore만 사용합니다.

import { initializeApp, type FirebaseOptions } from "firebase/app";
import { GoogleAuthProvider, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey);

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;

export const firebaseAuth = app ? getAuth(app) : null;
export const firestore = app ? getFirestore(app) : null;
export const googleProvider = new GoogleAuthProvider();
