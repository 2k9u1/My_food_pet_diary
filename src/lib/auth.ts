// 로그인 파사드 — .env.local에 Firebase 설정이 있으면 Firebase 익명 로그인을,
// 없으면 이름/학번만 입력하는 데모 로그인을 씁니다.
//
// "익명 로그인"은 구글 계정 동의 화면 없이 조용히 로그인 처리를 하는 Firebase
// 기능입니다 — 학생/교사가 보는 화면은 이름/학번(또는 이름)만 입력하는 아주
// 간단한 폼 하나뿐이고, 뒤에서는 실제로 Firestore(공유 저장소)에 연결됩니다.
//
// 역할(학생/교사)은 이제 화면에서 본인이 직접 고릅니다(이메일로 자동 판별하지
// 않음). 학급 코드 구조 덕분에, 교사를 사칭해도 자기만의 새 빈 학급이 생길
// 뿐 다른 학생 데이터에는 접근할 수 없습니다 — README의 보안 설명 참고.

import { onAuthStateChanged, signInAnonymously, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { User } from "../types";
import { firebaseAuth, firestore, isFirebaseConfigured } from "./firebase";
import { generateClassCode } from "./id";
import { getMissionSetting, reserveClassCode, resolveClassCode } from "./firebaseStore";
import * as local from "./localStore";

export class ClassCodeError extends Error {}

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

// ---------- Firebase 익명 로그인 + 프로필 생성 (한 번에) ----------

export async function signUpFirebaseTeacher(input: { displayName: string }): Promise<User> {
  const auth = requireAuth();
  const uid = auth.currentUser?.uid ?? (await signInAnonymously(auth)).user.uid;

  // 보안 규칙이 "먼저 만들어진 프로필의 role"로 교사 여부를 확인하므로,
  // 학급 코드를 등록하기 전에 프로필부터 만들어야 합니다.
  const code = generateClassCode();
  const user: User = {
    id: uid,
    role: "teacher",
    displayName: input.displayName,
    useAlias: false,
    createdAt: new Date().toISOString(),
    classCode: code,
  };
  await setDoc(doc(requireFirestore(), "users", uid), user);
  await reserveClassCode(code, uid);
  // 학생이 첫 인증보다 먼저 규칙을 읽을 수 있도록, 교사 본인 권한으로 기본
  // 미션 규칙을 미리 만들어 둡니다(학생은 자기 교사의 규칙 문서를 새로 만들
  // 권한이 없습니다).
  await getMissionSetting(uid);
  return user;
}

export async function signUpFirebaseStudent(input: {
  displayName: string;
  studentNumber: string;
  useAlias: boolean;
  classCode: string;
}): Promise<User> {
  const code = input.classCode.trim();
  if (!code) throw new ClassCodeError("학급 코드를 입력해 주세요.");

  // classCodes 컬렉션은 로그인한 사람만 읽을 수 있어서, 조회 전에 먼저 로그인합니다.
  const auth = requireAuth();
  const uid = auth.currentUser?.uid ?? (await signInAnonymously(auth)).user.uid;

  const teacherId = await resolveClassCode(code);
  if (!teacherId) throw new ClassCodeError("학급 코드를 다시 확인해 주세요.");

  const user: User = {
    id: uid,
    role: "student",
    displayName: input.displayName,
    studentNumber: input.studentNumber,
    useAlias: input.useAlias,
    createdAt: new Date().toISOString(),
    teacherId,
  };
  await setDoc(doc(requireFirestore(), "users", uid), user);
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
  // 문서가 없으면(가입 도중 끊긴 경우 등) 로그인 화면을 다시 보여줍니다.
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
