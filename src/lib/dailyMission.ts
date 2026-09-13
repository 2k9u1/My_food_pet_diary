// 오늘의 미션(교사가 등록한 목록에서 매일 자동으로 하나를 무작위로 골라 보여주는 보너스 미션)
//
// "무작위"이지만 같은 날짜에는 모든 학생에게 항상 같은 미션이 보이도록,
// 실제 Math.random 대신 날짜 문자열을 시드로 쓰는 결정론적 해시로 고릅니다.
// (같은 입력 = 같은 결과, 라는 판정 모듈 전체의 원칙과 동일합니다.)

import type { SpecialMission } from "../types";
import { hashString } from "./id";

export function pickTodaysMission(missions: SpecialMission[], date: string): SpecialMission | null {
  const active = missions.filter((m) => m.active);
  if (active.length === 0) return null;
  const index = hashString(date) % active.length;
  return active[index];
}
