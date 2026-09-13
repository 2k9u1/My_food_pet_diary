// 판정 로직 모듈 (요구사항 정의서 07-⑤)
//
// 지금 버전은 "가장 단순하게 작동하는 버전"입니다. 실제 이미지 인식 AI 대신,
// 사진 데이터를 기반으로 결정론적인(같은 사진이면 항상 같은 점수) 임시 점수를
// 만들어 판정 파이프라인 전체(점수 -> 임계값 비교 -> 성공/실패 -> 경험치)를
// 보여줍니다. 실제 서비스로 넘어갈 때는 scoreImage() 내부만 실제 비전 AI
// 호출로 교체하면 나머지 로직(교사 설정 반영, 경험치 계산 등)은 그대로 씁니다.

import type { MissionSetting } from "../types";
import { hashString } from "./id";

// dataUrl 자체를 그대로 해시하면 매번 계산량이 크므로, 길이와 표본 문자만 사용합니다.
function sample(dataUrl: string): string {
  const len = dataUrl.length;
  let s = String(len);
  for (let i = 0; i < 24; i += 1) {
    s += dataUrl[Math.floor((i / 24) * len)] ?? "";
  }
  return s;
}

function scoreFromSeed(dataUrl: string, salt: string): number {
  const h = hashString(sample(dataUrl) + salt);
  return h % 101; // 0~100
}

export interface ImageScores {
  vegetable: number;
  protein: number;
  leftover: number;
}

/** AI 판정 시뮬레이션 지점 — 실제 연동 시 이 함수만 교체하면 됩니다. */
export function scoreImage(dataUrl: string): ImageScores {
  return {
    vegetable: scoreFromSeed(dataUrl, "veg"),
    protein: scoreFromSeed(dataUrl, "protein"),
    leftover: scoreFromSeed(dataUrl, "leftover"),
  };
}

export function judgeDailyMeal(setting: MissionSetting, scores: ImageScores): boolean {
  return (
    scores.vegetable >= setting.dailyMealRules.vegetableThreshold &&
    scores.protein >= setting.dailyMealRules.proteinThreshold
  );
}

export function judgeZeroLeftover(setting: MissionSetting, afterLeftoverScore: number): boolean {
  return afterLeftoverScore <= setting.zeroLeftoverRules.leftoverThreshold;
}

export function checkHardBonus(
  setting: MissionSetting,
  successMealCount: number,
  allRequiredZeroLeftoverSuccess: boolean
): boolean {
  const meetsMeals = successMealCount >= setting.hardRules.requiredSuccessMeals;
  const meetsLeftover = !setting.hardRules.requireZeroLeftover || allRequiredZeroLeftoverSuccess;
  return meetsMeals && meetsLeftover;
}
