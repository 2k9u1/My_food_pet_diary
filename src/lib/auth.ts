// 로그인 파사드 — .env.local에 Firebase 설정이 있으면 실제 구글 로그인을,
// 없으면 이름/학번만 입력하는 데모 로그인을 씁니다.
//
// 구글 로그인 모드에서는 역할(학생/교사)을 화면에서 직접 고르지 않습니다.
// 처음 로그인한 사람이 teacherEmails.ts 목록에 있는 이메일이면 교사, 아니면
// 학생으로 자동 등록되고(실제 검사는 firestore.rules가 서버에서 한 번 더 함),
// 학생은 처음 한 번만 학번을 입력하는 간단한 화면을 거칩니다.

import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { Role, User } from "../types";
import { firebaseAuth, firestore, googleProvider, isFirebaseConfigured } from "./firebase";
import { isTeacherEmail } from "./teacherEmails";
import { generateClassCode } from "./id";
import { reserveClassCode, resolveClassCode } from "./firebaseStore";
import * as local from "./localStore";

export class ClassCodeError extends Error {}

export const usingFirebase = isFirebaseConfigured;

export type SessionState =
  | { status: "signedOut" }
  | { status: "needsOnboarding"; uid: string; email: string; googleName: string; suggestedRole: Role }
  | { status: "ready"; user: User };

function requireAuth() {
  if (!firebaseAuth) throw new Error("Firebase가 설정되지 않았어요. .env.local을 확인하세요.");
  return firebaseAuth;
}

function requireFirestore() {
  if (!firestore) throw new Error("Firebase가 설정되지 않았어요. .env.local을 확인하세요.");
  return firestore;
}

// ---------- 데모(로컬) 로그인 ----------

export async function signInLocalStudent(input: {
  displayName: string;
  studentNumber: string;
  useAlias: boolean;
}): Promise<User> {
  return local.loginStudent(input);
}

export async function signInLocalTeacher(input: { displayName: string }): Promise<User> {
  return local.loginTeacher(input);
}

// ---------- 구글 로그인 ----------

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(requireAuth(), googleProvider);
}

export async function completeGoogleOnboarding(input: {
  uid: string;
  displayName: string;
  role: Role;
  studentNumber?: string;
  useAlias?: boolean;
  classCode?: string; // role이 "student"일 때 필수 — 어느 교사 학급에 들어갈지
}): Promise<User> {
  if (input.role === "teacher") {
    const code = generateClassCode();
    await reserveClassCode(code, input.uid);
    const user: User = {
      id: input.uid,
      role: "teacher",
      displayName: input.displayName,
      useAlias: false,
      createdAt: new Date().toISOString(),
      classCode: code,
    };
    await setDoc(doc(requireFirestore(), "users", input.uid), user);
    return user;
  }

  const code = (input.classCode ?? "").trim();
  if (!code) throw new ClassCodeError("학급 코드를 입력해 주세요.");
  const teacherId = await resolveClassCode(code);
  if (!teacherId) throw new ClassCodeError("학급 코드를 다시 확인해 주세요.");

  const user: User = {
    id: input.uid,
    role: "student",
    displayName: input.displayName,
    studentNumber: input.studentNumber,
    useAlias: input.useAlias ?? false,
    createdAt: new Date().toISOString(),
    teacherId,
  };
  await setDoc(doc(requireFirestore(), "users", input.uid), user);
  return user;
}

// ---------- 공용 ----------

export async function getSessionState(): Promise<SessionState> {
  if (!usingFirebase) {
    const user = await local.getCurrentUser();
    return user ? { status: "ready", user } : { status: "signedOut" };
  }

  const fbUser = requireAuth().currentUser;
  if (!fbUser) return { status: "signedOut" };

  const snap = await getDoc(doc(requireFirestore(), "users", fbUser.uid));
  if (snap.exists()) {
    return { status: "ready", user: snap.data() as User };
  }
  return {
    status: "needsOnboarding",
    uid: fbUser.uid,
    email: fbUser.email ?? "",
    googleName: fbUser.displayName ?? "",
    suggestedRole: isTeacherEmail(fbUser.email) ? "teacher" : "student",
  };
}

export async function logout(): Promise<void> {
  if (!usingFirebase) {
    await local.logout();
    return;
  }
  await signOut(requireAuth());
}

/** 구글 로그인 상태가 바뀔 때(팝업 로그인 완료 등) 알려줍니다. 데모 모드에서는 아무 것도 하지 않습니다. */
export function subscribeAuthChanges(callback: () => void): () => void {
  if (!usingFirebase || !firebaseAuth) return () => {};
  return onAuthStateChanged(firebaseAuth, () => callback());
}
