// Firestore 기반 데이터 저장 구현 (사진 파일은 저장하지 않습니다).
//
// localStore.ts와 함수 이름·입출력을 최대한 맞춰서, store.ts(파사드)가 두 구현
// 중 하나를 그대로 골라 쓸 수 있게 했습니다. Firestore 구조:
//
//   users/{uid}                                프로필 (role, displayName, teacherId/classCode 등)
//   users/{studentUid}/petState/current        학생의 펫 상태
//   users/{studentUid}/dailyProgress/{date}    학생의 날짜별 오늘 기록
//   users/{studentUid}/submissions/{id}        학생의 인증 기록 (AI가 사진을 보고 남긴 설명/점수만 저장, 사진 자체는 저장 안 함)
//   users/{teacherUid}/missionSettings/current 그 교사의 미션 규칙
//   users/{teacherUid}/specialMissions/{id}    그 교사의 오늘의 미션 후보 목록
//   classCodes/{code}                          학급 코드 -> 교사 uid 매핑(학생 가입 시 조회)
//
// petState/dailyProgress/submissions 문서에는 teacherId를 함께 저장해 두어서,
// 보안 규칙이 "그 학생을 담당하는 교사인지"를 추가 조회 없이 바로 확인할 수 있게 했습니다.
// (firestore.rules 참고)
//
// 사진 판정: 학생이 올린 사진은 /api/analyze-food(Vercel 서버리스 함수, Google
// Gemini 호출)로 보내 그 자리에서 분석만 하고 결과(음식 설명 + 점수)만 저장합니다.
// Firebase Storage처럼 유료(Blaze) 요금제가 필요한 저장소를 쓰지 않기 위한
// 설계입니다 — 사진 자체는 어디에도 남지 않습니다.

import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, setDoc, where } from "firebase/firestore";
import type {
  DailyProgress,
  DailySpecialMissionState,
  MealSubmission,
  MealType,
  MissionSetting,
  PetState,
  SourceType,
  SpecialMission,
  StudentSummary,
  SubmitResult,
  User,
} from "../types";
import { firestore } from "./firebase";
import { newId, todayStr } from "./id";
import { pickTodaysMission } from "./dailyMission";
import { analyzeFoodPhoto } from "./aiVision";
import { checkHardBonus, judgeDailyMeal, judgeZeroLeftover } from "./judge";
import { growthStageFromLevel, levelFromExp } from "./pet";
import { defaultMissionSetting } from "./seed";

function db() {
  if (!firestore) throw new Error("Firebase가 설정되지 않았어요. .env.local을 확인하세요.");
  return firestore;
}

function emptyMealProgress() {
  return {
    dailyMealSuccess: false,
    dailyMealExpGranted: false,
    zeroLeftoverSuccess: null as boolean | null,
    zeroLeftoverExpGranted: false,
    submissionCount: 0,
  };
}

function emptyDailyProgress(studentId: string, teacherId: string, date: string): DailyProgress {
  return {
    studentId,
    teacherId,
    date,
    meals: {
      breakfast: emptyMealProgress(),
      lunch: emptyMealProgress(),
      dinner: emptyMealProgress(),
    },
    hardBonusApplied: false,
    specialMission: null,
    totalExpToday: 0,
  };
}

function defaultPetState(studentId: string, teacherId: string): PetState {
  return {
    studentId,
    teacherId,
    exp: 0,
    level: 1,
    growthStage: growthStageFromLevel(1),
    updatedAt: new Date().toISOString(),
  };
}

// ---------- 사용자 / 학급 코드 ----------

export async function getUser(id: string): Promise<User | undefined> {
  const snap = await getDoc(doc(db(), "users", id));
  return snap.exists() ? (snap.data() as User) : undefined;
}

export async function listStudents(teacherId: string): Promise<User[]> {
  const q = query(collection(db(), "users"), where("role", "==", "student"), where("teacherId", "==", teacherId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as User);
}

/** 학급 코드로 그 코드를 등록한 교사의 uid를 찾습니다. 학생 가입(온보딩)에서 사용합니다. */
export async function resolveClassCode(code: string): Promise<string | null> {
  const snap = await getDoc(doc(db(), "classCodes", code.toUpperCase()));
  return snap.exists() ? (snap.data().teacherId as string) : null;
}

export async function reserveClassCode(code: string, teacherId: string): Promise<void> {
  await setDoc(doc(db(), "classCodes", code.toUpperCase()), { teacherId, createdAt: new Date().toISOString() });
}

// ---------- 미션 설정 ----------

export async function getMissionSetting(teacherId: string): Promise<MissionSetting> {
  const ref_ = doc(db(), "users", teacherId, "missionSettings", "current");
  const snap = await getDoc(ref_);
  if (snap.exists()) return snap.data() as MissionSetting;
  const initial = defaultMissionSetting(teacherId);
  await setDoc(ref_, initial);
  return initial;
}

export async function saveMissionSetting(teacherId: string, next: MissionSetting): Promise<MissionSetting> {
  const current = await getMissionSetting(teacherId);
  const updated: MissionSetting = {
    ...next,
    teacherId,
    version: current.version + 1,
    active: true,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(doc(db(), "users", teacherId, "missionSettings", "current"), updated);
  return updated;
}

// ---------- 오늘의 미션 ----------

export async function listSpecialMissions(teacherId: string): Promise<SpecialMission[]> {
  const snap = await getDocs(collection(db(), "users", teacherId, "specialMissions"));
  return snap.docs.map((d) => d.data() as SpecialMission);
}

export async function addSpecialMission(
  teacherId: string,
  input: { title: string; description: string; bonusExp: number }
): Promise<SpecialMission> {
  const mission: SpecialMission = {
    id: newId("mission"),
    teacherId,
    title: input.title,
    description: input.description,
    bonusExp: input.bonusExp,
    active: true,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db(), "users", teacherId, "specialMissions", mission.id), mission);
  return mission;
}

export async function updateSpecialMission(
  teacherId: string,
  id: string,
  patch: Partial<Pick<SpecialMission, "title" | "description" | "bonusExp" | "active">>
): Promise<void> {
  const ref_ = doc(db(), "users", teacherId, "specialMissions", id);
  const snap = await getDoc(ref_);
  if (!snap.exists()) return;
  await setDoc(ref_, { ...(snap.data() as SpecialMission), ...patch });
}

export async function deleteSpecialMission(teacherId: string, id: string): Promise<void> {
  await deleteDoc(doc(db(), "users", teacherId, "specialMissions", id));
}

export async function getTodaysSpecialMission(teacherId: string): Promise<SpecialMission | null> {
  const list = await listSpecialMissions(teacherId);
  return pickTodaysMission(list, todayStr());
}

export async function completeSpecialMission(
  studentId: string,
  teacherId: string
): Promise<{
  progress: DailyProgress;
  petState: PetState;
  expDelta: number;
  leveledUp: boolean;
} | null> {
  const today = await getTodaysSpecialMission(teacherId);
  if (!today) return null;

  const date = todayStr();
  const progress = await getDailyProgress(studentId, teacherId, date);

  const already = progress.specialMission?.missionId === today.id && progress.specialMission.completed;
  if (already) {
    const petState = await getPetState(studentId, teacherId);
    return { progress, petState, expDelta: 0, leveledUp: false };
  }

  const state: DailySpecialMissionState = {
    missionId: today.id,
    title: today.title,
    bonusExp: today.bonusExp,
    completed: true,
    expGranted: true,
  };
  progress.specialMission = state;
  const expDelta = today.bonusExp;
  progress.totalExpToday += expDelta;
  await saveDailyProgress(progress);

  const petState = await getPetState(studentId, teacherId);
  const prevLevel = petState.level;
  petState.exp += expDelta;
  petState.level = levelFromExp(petState.exp);
  petState.growthStage = growthStageFromLevel(petState.level);
  petState.updatedAt = new Date().toISOString();
  await savePetState(petState);

  return { progress, petState, expDelta, leveledUp: petState.level > prevLevel };
}

// ---------- 펫 상태 ----------

export async function getPetState(studentId: string, teacherId: string): Promise<PetState> {
  const snap = await getDoc(doc(db(), "users", studentId, "petState", "current"));
  return snap.exists() ? (snap.data() as PetState) : defaultPetState(studentId, teacherId);
}

async function savePetState(state: PetState): Promise<void> {
  await setDoc(doc(db(), "users", state.studentId, "petState", "current"), state);
}

// ---------- 제출 기록 ----------

export async function listSubmissions(studentId: string): Promise<MealSubmission[]> {
  const q = query(collection(db(), "users", studentId, "submissions"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as MealSubmission);
}

async function listSubmissionsForMeal(studentId: string, date: string, mealType: MealType): Promise<MealSubmission[]> {
  const all = await listSubmissions(studentId);
  return all.filter((s) => s.date === date && s.mealType === mealType);
}

// ---------- 오늘 기록 ----------

export async function getDailyProgress(studentId: string, teacherId: string, date: string): Promise<DailyProgress> {
  const snap = await getDoc(doc(db(), "users", studentId, "dailyProgress", date));
  return snap.exists() ? (snap.data() as DailyProgress) : emptyDailyProgress(studentId, teacherId, date);
}

export async function listDailyProgress(studentId: string): Promise<DailyProgress[]> {
  const q = query(collection(db(), "users", studentId, "dailyProgress"), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as DailyProgress);
}

async function saveDailyProgress(progress: DailyProgress): Promise<void> {
  await setDoc(doc(db(), "users", progress.studentId, "dailyProgress", progress.date), progress);
}

// ---------- 핵심: 인증 제출 -> 즉시 판정 ----------

export async function submitMeal(input: {
  studentId: string;
  teacherId: string;
  mealType: MealType;
  phase: "before" | "after";
  imageDataUrl: string;
  sourceType: SourceType;
}): Promise<SubmitResult> {
  const date = todayStr();
  const id = newId("sub");
  const analysis = await analyzeFoodPhoto(input.imageDataUrl);
  const scores = { vegetable: analysis.vegetable, protein: analysis.protein, leftover: analysis.leftover };

  const submission: MealSubmission = {
    id,
    studentId: input.studentId,
    teacherId: input.teacherId,
    date,
    mealType: input.mealType,
    phase: input.phase,
    foodDescription: analysis.foodDescription,
    sourceType: input.sourceType,
    scores,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db(), "users", input.studentId, "submissions", id), submission);

  const setting = await getMissionSetting(input.teacherId);
  const progress = await getDailyProgress(input.studentId, input.teacherId, date);
  const meal = progress.meals[input.mealType];

  meal.submissionCount += 1;

  const prevDailyMealSuccess = meal.dailyMealSuccess;
  const dailyMealSuccessNow = judgeDailyMeal(setting, scores) || prevDailyMealSuccess;
  meal.dailyMealSuccess = dailyMealSuccessNow;

  const sameMealSubs = await listSubmissionsForMeal(input.studentId, date, input.mealType);
  const hasBefore = sameMealSubs.some((s) => s.phase === "before");
  const hasAfter = sameMealSubs.some((s) => s.phase === "after");
  if (hasBefore && hasAfter) {
    const afterSubs = sameMealSubs.filter((s) => s.phase === "after").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const latestAfterScore = (input.phase === "after" ? scores : afterSubs[0]?.scores)?.leftover ?? scores.leftover ?? 0;
    meal.zeroLeftoverSuccess = judgeZeroLeftover(setting, latestAfterScore);
  }

  let expDelta = 0;
  if (dailyMealSuccessNow && !meal.dailyMealExpGranted) {
    expDelta += setting.bonusRules.baseExp;
    meal.dailyMealExpGranted = true;
  }
  if (meal.zeroLeftoverSuccess === true && !meal.zeroLeftoverExpGranted) {
    expDelta += setting.bonusRules.zeroLeftoverBonusExp;
    meal.zeroLeftoverExpGranted = true;
  }

  const successMealCount = Object.values(progress.meals).filter((m) => m.dailyMealSuccess).length;
  const allZeroLeftoverSuccess = Object.values(progress.meals).every((m) => m.zeroLeftoverSuccess === true);
  let hardBonusJustApplied = false;
  if (!progress.hardBonusApplied && checkHardBonus(setting, successMealCount, allZeroLeftoverSuccess)) {
    expDelta += setting.hardRules.bonusExp;
    progress.hardBonusApplied = true;
    hardBonusJustApplied = true;
  }

  progress.totalExpToday += expDelta;
  await saveDailyProgress(progress);

  const petState = await getPetState(input.studentId, input.teacherId);
  const prevLevel = petState.level;
  petState.exp += expDelta;
  petState.level = levelFromExp(petState.exp);
  petState.growthStage = growthStageFromLevel(petState.level);
  petState.updatedAt = new Date().toISOString();
  await savePetState(petState);

  return {
    submission,
    dailyProgress: progress,
    petState,
    expDelta,
    dailyMealSuccess: dailyMealSuccessNow,
    zeroLeftoverSuccess: meal.zeroLeftoverSuccess,
    hardBonusJustApplied,
    leveledUp: petState.level > prevLevel,
  };
}

// ---------- 교사 대시보드 집계 ----------

export async function listAllStudentsSummary(teacherId: string): Promise<StudentSummary[]> {
  const students = await listStudents(teacherId);
  const today = todayStr();
  const results: StudentSummary[] = [];
  for (const user of students) {
    const petState = await getPetState(user.id, teacherId);
    const todayProgress = await getDailyProgress(user.id, teacherId, today);
    const history = await listDailyProgress(user.id);
    let attempted = 0;
    let succeeded = 0;
    for (const day of history) {
      for (const meal of Object.values(day.meals)) {
        if (meal.submissionCount > 0) {
          attempted += 1;
          if (meal.dailyMealSuccess) succeeded += 1;
        }
      }
    }
    const submissions = await listSubmissions(user.id);
    results.push({
      user,
      petState,
      today: todayProgress,
      successRate: attempted > 0 ? succeeded / attempted : 0,
      totalSubmissions: submissions.length,
    });
  }
  return results;
}

/** 데모 시드 데이터는 로컬 모드 전용입니다. Firebase 모드에서는 교사가 직접 등록합니다. */
export async function ensureSeedData(): Promise<void> {
  return;
}
