// 데이터 저장 파사드 — .env.local에 Firebase 설정이 있으면 firebaseStore.ts(실제 서버 저장)를,
// 없으면 localStore.ts(이 브라우저에만 남는 데모 저장)를 그대로 골라 씁니다.
//
// 화면 컴포넌트는 이 파일에서만 데이터 함수를 불러오면 되고, 어느 쪽이 실제로
// 동작하는지는 신경 쓸 필요가 없습니다. 로그인/회원가입 관련 함수는 여기가
// 아니라 auth.ts에 있습니다.

import { isFirebaseConfigured } from "./firebase";
import * as local from "./localStore";
import * as remote from "./firebaseStore";

export const usingFirebase = isFirebaseConfigured;

const impl = usingFirebase ? remote : local;

export const getUser = impl.getUser;
export const getMissionSetting = impl.getMissionSetting;
export const saveMissionSetting = impl.saveMissionSetting;
export const listSpecialMissions = impl.listSpecialMissions;
export const addSpecialMission = impl.addSpecialMission;
export const updateSpecialMission = impl.updateSpecialMission;
export const deleteSpecialMission = impl.deleteSpecialMission;
export const getTodaysSpecialMission = impl.getTodaysSpecialMission;
export const completeSpecialMission = impl.completeSpecialMission;
export const getPetState = impl.getPetState;
export const listSubmissions = impl.listSubmissions;
export const getDailyProgress = impl.getDailyProgress;
export const listDailyProgress = impl.listDailyProgress;
export const submitMeal = impl.submitMeal;
export const listAllStudentsSummary = impl.listAllStudentsSummary;
export const ensureSeedData = impl.ensureSeedData;

export { expIntoCurrentLevel } from "./pet";
export type { Role } from "../types";
