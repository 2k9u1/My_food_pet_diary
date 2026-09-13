// 데이터 저장 모듈 — 지금은 브라우저 localStorage를 임시 "공용 DB" 자리로 씁니다.
//
// 실제 서비스로 넘어갈 때는 이 파일 안의 함수 시그니처(입출력)는 그대로 두고,
// 내부 구현만 Firebase(Firestore/Auth/Storage) 호출로 교체하면 됩니다.
// 화면 컴포넌트는 store.ts의 함수만 호출하므로 교체 영향이 이 파일 안에서 끝납니다.
//
// 주의: localStorage는 "이 브라우저"에만 저장되어 여러 사람이 공유하지 않습니다.
// 여러 학생·교사가 같은 데이터를 보려면 Firebase 연동이 꼭 필요합니다(README 참고).
//
// 이 데모 모드는 브라우저 하나당 교사 계정이 하나뿐이라고 가정합니다(DEFAULT_TEACHER_ID
// 고정). 여러 교사가 각자의 학급을 따로 운영하는 실제 다중 교사 구조는 firebaseStore.ts
// (Firestore 보안 규칙 포함)에서 온전히 동작합니다.

import type {
  DailyProgress,
  DailySpecialMissionState,
  MealProgress,
  MealSubmission,
  MealType,
  MissionSetting,
  PetState,
  Role,
  SourceType,
  SpecialMission,
  StudentSummary,
  SubmitResult,
  User,
} from "../types";
import { newId, todayStr } from "./id";
import { pickTodaysMission } from "./dailyMission";
import { checkHardBonus, judgeDailyMeal, judgeZeroLeftover, scoreImage } from "./judge";
import { expIntoCurrentLevel, growthStageFromLevel, levelFromExp } from "./pet";
import { DEFAULT_TEACHER_ID, defaultMissionSetting, defaultSpecialMissions } from "./seed";

const KEYS = {
  users: "mypet_users_v1",
  currentUserId: "mypet_current_user_v1",
  settings: "mypet_settings_v1",
  specialMissions: "mypet_special_missions_v1",
  petStates: "mypet_pet_states_v1",
  submissions: "mypet_submissions_v1",
  dailyProgress: "mypet_daily_progress_v1",
  seeded: "mypet_seeded_v1",
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

const wait = () => Promise.resolve(); // 비동기 백엔드로 교체할 자리를 표시하는 더미 await 지점

function emptyMealProgress(): MealProgress {
  return {
    dailyMealSuccess: false,
    dailyMealExpGranted: false,
    zeroLeftoverSuccess: null,
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

// ---------- 사용자 / 로그인 ----------
// 지금은 구글 로그인 대신 간편 로그인을 씁니다. 실제 배포 시 이 두 함수 내부를
// Firebase Auth(Google Provider) 결과로 교체하고, 그 외 코드는 그대로 둡니다.

export async function getAllUsers(): Promise<User[]> {
  await wait();
  return read<User[]>(KEYS.users, []);
}

export async function getUser(id: string): Promise<User | undefined> {
  const users = await getAllUsers();
  return users.find((u) => u.id === id);
}

export async function getCurrentUser(): Promise<User | null> {
  await wait();
  const id = localStorage.getItem(KEYS.currentUserId);
  if (!id) return null;
  const user = await getUser(id);
  return user ?? null;
}

async function upsertUser(user: User): Promise<void> {
  const users = await getAllUsers();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) users[idx] = user;
  else users.push(user);
  write(KEYS.users, users);
}

/** 데모 모드에서는 학급 코드를 따로 입력받지 않고, 브라우저당 하나뿐인 기본 교사 학급에 자동으로 들어갑니다. */
export async function loginStudent(input: {
  displayName: string;
  studentNumber: string;
  useAlias: boolean;
}): Promise<User> {
  const users = await getAllUsers();
  const existing = users.find(
    (u) => u.role === "student" && u.studentNumber === input.studentNumber && !u.isDemo
  );
  const user: User = existing ?? {
    id: newId("student"),
    role: "student",
    displayName: "",
    studentNumber: input.studentNumber,
    useAlias: input.useAlias,
    createdAt: new Date().toISOString(),
    teacherId: DEFAULT_TEACHER_ID,
  };
  user.displayName = input.displayName;
  user.useAlias = input.useAlias;
  await upsertUser(user);
  localStorage.setItem(KEYS.currentUserId, user.id);
  return user;
}

/** 데모 모드는 교사 계정이 브라우저당 하나뿐이라고 가정합니다(id 고정). */
export async function loginTeacher(input: { displayName: string }): Promise<User> {
  const users = await getAllUsers();
  const existing = users.find((u) => u.role === "teacher" && u.id === DEFAULT_TEACHER_ID);
  const user: User = existing ?? {
    id: DEFAULT_TEACHER_ID,
    role: "teacher",
    displayName: input.displayName,
    useAlias: false,
    createdAt: new Date().toISOString(),
    classCode: "DEMO01",
  };
  user.displayName = input.displayName;
  await upsertUser(user);
  localStorage.setItem(KEYS.currentUserId, user.id);
  return user;
}

export async function logout(): Promise<void> {
  await wait();
  localStorage.removeItem(KEYS.currentUserId);
}

export async function listStudents(teacherId: string, includeDemo = true): Promise<User[]> {
  const users = await getAllUsers();
  return users.filter((u) => u.role === "student" && u.teacherId === teacherId && (includeDemo || !u.isDemo));
}

// ---------- 미션 설정 (교사가 화면에서 수정) ----------

async function readAllSettings(): Promise<MissionSetting[]> {
  return read<MissionSetting[]>(KEYS.settings, []);
}

export async function getMissionSetting(teacherId: string): Promise<MissionSetting> {
  await wait();
  const all = await readAllSettings();
  const found = all.find((s) => s.teacherId === teacherId);
  if (found) return found;
  const initial = defaultMissionSetting(teacherId);
  await writeSetting(initial);
  return initial;
}

async function writeSetting(setting: MissionSetting): Promise<void> {
  const all = await readAllSettings();
  const idx = all.findIndex((s) => s.teacherId === setting.teacherId);
  if (idx >= 0) all[idx] = setting;
  else all.push(setting);
  write(KEYS.settings, all);
}

export async function saveMissionSetting(teacherId: string, next: MissionSetting): Promise<MissionSetting> {
  await wait();
  const current = await getMissionSetting(teacherId);
  const updated: MissionSetting = {
    ...next,
    teacherId,
    version: current.version + 1,
    active: true,
    updatedAt: new Date().toISOString(),
  };
  await writeSetting(updated);
  return updated;
}

// ---------- 오늘의 미션 (교사가 등록한 목록에서 매일 자동으로 하나가 뽑히는 보너스 미션) ----------

async function readAllSpecialMissions(): Promise<SpecialMission[]> {
  return read<SpecialMission[]>(KEYS.specialMissions, []);
}

export async function listSpecialMissions(teacherId: string): Promise<SpecialMission[]> {
  await wait();
  const all = await readAllSpecialMissions();
  return all.filter((m) => m.teacherId === teacherId);
}

async function saveAllSpecialMissions(list: SpecialMission[]): Promise<void> {
  write(KEYS.specialMissions, list);
}

export async function addSpecialMission(
  teacherId: string,
  input: { title: string; description: string; bonusExp: number }
): Promise<SpecialMission> {
  const all = await readAllSpecialMissions();
  const mission: SpecialMission = {
    id: newId("mission"),
    teacherId,
    title: input.title,
    description: input.description,
    bonusExp: input.bonusExp,
    active: true,
    createdAt: new Date().toISOString(),
  };
  await saveAllSpecialMissions([...all, mission]);
  return mission;
}

export async function updateSpecialMission(
  teacherId: string,
  id: string,
  patch: Partial<Pick<SpecialMission, "title" | "description" | "bonusExp" | "active">>
): Promise<void> {
  const all = await readAllSpecialMissions();
  const next = all.map((m) => (m.id === id && m.teacherId === teacherId ? { ...m, ...patch } : m));
  await saveAllSpecialMissions(next);
}

export async function deleteSpecialMission(teacherId: string, id: string): Promise<void> {
  const all = await readAllSpecialMissions();
  await saveAllSpecialMissions(all.filter((m) => !(m.id === id && m.teacherId === teacherId)));
}

/** 오늘 날짜에 학생들에게 보여줄 미션 — 교사가 켜둔 목록 중 날짜 기준으로 결정론적으로 하나를 고릅니다. */
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
  await wait();
  const states = read<PetState[]>(KEYS.petStates, []);
  return states.find((p) => p.studentId === studentId) ?? defaultPetState(studentId, teacherId);
}

async function savePetState(state: PetState): Promise<void> {
  const states = read<PetState[]>(KEYS.petStates, []);
  const idx = states.findIndex((p) => p.studentId === state.studentId);
  if (idx >= 0) states[idx] = state;
  else states.push(state);
  write(KEYS.petStates, states);
}

// ---------- 제출 기록 ----------

export async function listSubmissions(studentId: string, teacherId?: string): Promise<MealSubmission[]> {
  await wait();
  const all = read<MealSubmission[]>(KEYS.submissions, []);
  return all
    .filter((s) => s.studentId === studentId && (!teacherId || s.teacherId === teacherId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function listSubmissionsForMeal(
  studentId: string,
  date: string,
  mealType: MealType
): Promise<MealSubmission[]> {
  const all = read<MealSubmission[]>(KEYS.submissions, []);
  return all.filter((s) => s.studentId === studentId && s.date === date && s.mealType === mealType);
}

async function appendSubmission(sub: MealSubmission): Promise<void> {
  const all = read<MealSubmission[]>(KEYS.submissions, []);
  all.push(sub);
  write(KEYS.submissions, all);
}

// ---------- 오늘 기록 (DailyProgress) ----------

export async function getDailyProgress(studentId: string, teacherId: string, date: string): Promise<DailyProgress> {
  await wait();
  const all = read<DailyProgress[]>(KEYS.dailyProgress, []);
  return all.find((d) => d.studentId === studentId && d.date === date) ?? emptyDailyProgress(studentId, teacherId, date);
}

export async function listDailyProgress(studentId: string, teacherId?: string): Promise<DailyProgress[]> {
  await wait();
  const all = read<DailyProgress[]>(KEYS.dailyProgress, []);
  return all
    .filter((d) => d.studentId === studentId && (!teacherId || d.teacherId === teacherId))
    .sort((a, b) => b.date.localeCompare(a.date));
}

async function saveDailyProgress(progress: DailyProgress): Promise<void> {
  const all = read<DailyProgress[]>(KEYS.dailyProgress, []);
  const idx = all.findIndex((d) => d.studentId === progress.studentId && d.date === progress.date);
  if (idx >= 0) all[idx] = progress;
  else all.push(progress);
  write(KEYS.dailyProgress, all);
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
  const scores = scoreImage(input.imageDataUrl); // 데모 모드 임시 시뮬레이션(실제 서비스 모드는 Gemini 분석 사용)

  const submission: MealSubmission = {
    id: newId("sub"),
    studentId: input.studentId,
    teacherId: input.teacherId,
    date,
    mealType: input.mealType,
    phase: input.phase,
    foodDescription: "데모 모드 임시 판정 (실제 사진 분석 아님)",
    sourceType: input.sourceType,
    scores,
    createdAt: new Date().toISOString(),
  };
  await appendSubmission(submission);

  const setting = await getMissionSetting(input.teacherId);
  const progress = await getDailyProgress(input.studentId, input.teacherId, date);
  const meal = progress.meals[input.mealType];

  meal.submissionCount += 1;

  const prevDailyMealSuccess = meal.dailyMealSuccess;
  const dailyMealSuccessNow = judgeDailyMeal(setting, scores) || prevDailyMealSuccess;
  meal.dailyMealSuccess = dailyMealSuccessNow;

  // 전/후 비교: 오늘 이 끼니에 전(before)/후(after) 사진이 모두 있어야 판정
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
    dailyMealSuccess: dailyMealSuccessNow && !prevDailyMealSuccess ? true : dailyMealSuccessNow,
    zeroLeftoverSuccess: meal.zeroLeftoverSuccess,
    hardBonusJustApplied,
    leveledUp: petState.level > prevLevel,
  };
}

// ---------- 교사 대시보드 집계 ----------

export async function listAllStudentsSummary(teacherId: string): Promise<StudentSummary[]> {
  const students = await listStudents(teacherId, true);
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

export { expIntoCurrentLevel };

// ---------- 최초 실행 시 대시보드 미리보기용 샘플 데이터 ----------

export async function ensureSeedData(): Promise<void> {
  if (localStorage.getItem(KEYS.seeded)) return;
  localStorage.setItem(KEYS.seeded, "1");

  const setting = await getMissionSetting(DEFAULT_TEACHER_ID); // 기본 설정 생성 트리거
  await saveAllSpecialMissions(defaultSpecialMissions(DEFAULT_TEACHER_ID)); // 오늘의 미션 기본 목록 생성

  const demoStudents: Array<{ id: string; name: string; number: string; exp: number; days: Array<{ date: string; success: number; attempted: number }> }> = [
    {
      id: "demo_student_1",
      name: "김민준",
      number: "10105",
      exp: 135,
      days: [
        { date: shiftDate(-2), success: 3, attempted: 3 },
        { date: shiftDate(-1), success: 2, attempted: 3 },
        { date: shiftDate(0), success: 1, attempted: 1 },
      ],
    },
    {
      id: "demo_student_2",
      name: "이서연",
      number: "10112",
      exp: 60,
      days: [
        { date: shiftDate(-2), success: 1, attempted: 2 },
        { date: shiftDate(-1), success: 2, attempted: 2 },
      ],
    },
  ];

  const users = await getAllUsers();
  for (const d of demoStudents) {
    const user: User = {
      id: d.id,
      role: "student",
      displayName: d.name,
      studentNumber: d.number,
      useAlias: false,
      createdAt: new Date().toISOString(),
      isDemo: true,
      teacherId: DEFAULT_TEACHER_ID,
    };
    users.push(user);

    const petState: PetState = {
      studentId: d.id,
      teacherId: DEFAULT_TEACHER_ID,
      exp: d.exp,
      level: levelFromExp(d.exp),
      growthStage: growthStageFromLevel(levelFromExp(d.exp)),
      updatedAt: new Date().toISOString(),
    };
    await savePetState(petState);

    const dailyList: DailyProgress[] = d.days.map((day) => {
      const mealTypes: MealType[] = ["breakfast", "lunch", "dinner"];
      const progress = emptyDailyProgress(d.id, DEFAULT_TEACHER_ID, day.date);
      for (let i = 0; i < day.attempted; i += 1) {
        const mt = mealTypes[i];
        progress.meals[mt].submissionCount = 1;
        progress.meals[mt].dailyMealSuccess = i < day.success;
        progress.meals[mt].dailyMealExpGranted = i < day.success;
        progress.meals[mt].zeroLeftoverSuccess = i === 0 ? true : null;
      }
      progress.totalExpToday = day.success * setting.bonusRules.baseExp;
      return progress;
    });
    const allProgress = read<DailyProgress[]>(KEYS.dailyProgress, []);
    write(KEYS.dailyProgress, [...allProgress, ...dailyList]);

    const sampleSub: MealSubmission = {
      id: newId("sub"),
      studentId: d.id,
      teacherId: DEFAULT_TEACHER_ID,
      date: d.days[d.days.length - 1].date,
      mealType: "breakfast",
      phase: "after",
      foodDescription: "예시 기록: 밥, 시금치나물, 계란말이",
      sourceType: "gallery",
      scores: { vegetable: 70, protein: 65, leftover: 20 },
      createdAt: new Date().toISOString(),
    };
    const allSubs = read<MealSubmission[]>(KEYS.submissions, []);
    write(KEYS.submissions, [...allSubs, sampleSub]);
  }
  write(KEYS.users, users);
}

function shiftDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export type { Role };
