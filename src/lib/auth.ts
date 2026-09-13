// 로그인 파사드 — .env.local에 Firebase 설정이 있으면 실제 Firebase 로그인을,
// 없으면 이름/학번만 입력하는 데모 로그인을 씁니다.
//
// 학생·교사 모두 "비밀번호로 계속 같은 계정 쓰기"가 가능하도록 Firebase의
// 이메일+비밀번호 로그인을 씁니다(구글 로그인 팝업이 아니라 평범한 폼입니다).
// 교사는 실제 이메일을 입력하지만, 학생은 이메일을 몰라도 됩니다 — 화면에는
// "학번 + 비밀번호"만 보이고, 안에서 학번+학급코드로 만든 내부용 가짜 이메일
// (실제로 존재하지 않아도 되는 주소)을 자동으로 만들어 씁니다.
//
// 로그인 버튼 하나로 "처음이면 계정 생성, 이미 있으면 로그인"을 자동으로
// 판단합니다(먼저 로그인 시도 → 실패하면 새 계정 생성 시도).
//
// 역할(학생/교사)은 화면에서 본인이 직접 고릅니다. 학급 코드 구조 덕분에,
// 교사를 사칭해도 자기만의 새 빈 학급이 생길 뿐 다른 학생 데이터에는 접근할
// 수 없습니다 — README의 보안 설명 참고.

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { User } from "../types";
import { firebaseAuth, firestore, isFirebaseConfigured } from "./firebase";
import { generateClassCode } from "./id";
import { getMissionSetting, reserveClassCode, resolveClassCode } from "./firebaseStore";
import * as local from "./localStore";

export class ClassCodeError extends Error {}
export class AuthFormError extends Error {}

function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/weak-password":
      return "비밀번호는 6자 이상으로 만들어 주세요.";
    case "auth/invalid-email":
      return "학번 형식을 확인해 주세요.";
    case "auth/too-many-requests":
      return "잠시 후 다시 시도해 주세요.";
    default:
      return "로그인에 실패했어요. 다시 시도해 주세요.";
  }
}

export const usingFirebase = isFirebaseConfigured;

export type SessionState = { status: "signedOut" } | { status: "ready"; user: User };

function requireAuth() {
  if (!firebaseAuth) throw new Error("Firebase가 설정되지 않았어요. .env.local을 확인하세요.");
  return firebaseAuth;
}

function requireFirestore() {
  if (!firestore) throw new Error("Firebase가 설정되지 않았어요. .env.local을 확인하세요.");
  return firestore;
}

/** 학번 + 학급 코드로 학생 전용 내부 이메일을 만듭니다. 실제로 존재할 필요는 없습니다. */
function studentInternalEmail(studentNumber: string, classCode: string): string {
  const num = studentNumber.trim().toLowerCase().replace(/[^a-z0-9]/g, "") || "no-number";
  const code = classCode.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${num}.${code}@student.bapchingu.local`;
}

/** 먼저 로그인을 시도하고, 계정이 없으면 새로 만듭니다. */
async function signInOrCreate(auth: Auth, email: string, password: string): Promise<{ uid: string; isNew: boolean }> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { uid: cred.user.uid, isNew: false };
  } catch {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      return { uid: cred.user.uid, isNew: true };
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/email-already-in-use") {
        throw new AuthFormError("비밀번호가 올바르지 않아요. 다시 확인해 주세요.");
      }
      throw new AuthFormError(friendlyAuthError(err));
    }
  }
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

// ---------- Firebase 로그인(처음이면 가입, 있으면 로그인) ----------

export async function signInOrUpTeacher(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<User> {
  const auth = requireAuth();
  const { uid, isNew } = await signInOrCreate(auth, input.email.trim(), input.password);

  if (isNew) {
    // 보안 규칙이 "먼저 만들어진 프로필의 role"로 교사 여부를 확인하므로,
    // 학급 코드를 등록하기 전에 프로필부터 만들어야 합니다.
    const code = generateClassCode();
    const user: User = {
      id: uid,
      role: "teacher",
      displayName: input.displayName.trim() || "교사",
      useAlias: false,
      createdAt: new Date().toISOString(),
      classCode: code,
    };
    await setDoc(doc(requireFirestore(), "users", uid), user);
    await reserveClassCode(code, uid);
    // 학생이 첫 인증보다 먼저 규칙을 읽을 수 있도록, 기본 미션 규칙을 미리 만들어 둡니다.
    await getMissionSetting(uid);
    return user;
  }

  const ref = doc(requireFirestore(), "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new AuthFormError("계정 정보를 찾을 수 없어요. 다시 시도해 주세요.");
  const updated: User = { ...(snap.data() as User), displayName: input.displayName.trim() || (snap.data() as User).displayName };
  await setDoc(ref, updated);
  return updated;
}

export async function signInOrUpStudent(input: {
  displayName: string;
  studentNumber: string;
  useAlias: boolean;
  classCode: string;
  password: string;
}): Promise<User> {
  const code = input.classCode.trim();
  if (!code) throw new ClassCodeError("학급 코드를 입력해 주세요.");

  const auth = requireAuth();
  const email = studentInternalEmail(input.studentNumber, code);
  const { uid, isNew } = await signInOrCreate(auth, email, input.password);

  if (isNew) {
    const teacherId = await resolveClassCode(code);
    if (!teacherId) {
      await auth.currentUser?.delete().catch(() => {}); // 잘못된 코드로 만든 빈 계정 정리
      throw new ClassCodeError("학급 코드를 다시 확인해 주세요.");
    }
    const user: User = {
      id: uid,
      role: "student",
      displayName: input.displayName.trim() || "학생",
      studentNumber: input.studentNumber.trim(),
      useAlias: input.useAlias,
      createdAt: new Date().toISOString(),
      teacherId,
    };
    await setDoc(doc(requireFirestore(), "users", uid), user);
    return user;
  }

  const ref = doc(requireFirestore(), "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new AuthFormError("계정 정보를 찾을 수 없어요. 다시 시도해 주세요.");
  const existing = snap.data() as User;
  const updated: User = { ...existing, displayName: input.displayName.trim() || existing.displayName, useAlias: input.useAlias };
  await setDoc(ref, updated);
  return updated;
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
  return snap.exists() ? { status: "ready", user: snap.data() as User } : { status: "signedOut" };
}

export async function logout(): Promise<void> {
  if (!usingFirebase) {
    await local.logout();
    return;
  }
  await signOut(requireAuth());
}

/** Firebase 로그인 상태가 바뀔 때 알려줍니다. 데모 모드에서는 아무 것도 하지 않습니다. */
export function subscribeAuthChanges(callback: () => void): () => void {
  if (!usingFirebase || !firebaseAuth) return () => {};
  return onAuthStateChanged(firebaseAuth, () => callback());
}
