import type { MissionSetting, SpecialMission } from "../types";
import { newId } from "./id";

export const DEFAULT_TEACHER_ID = "teacher_default";

export function defaultMissionSetting(teacherId: string = DEFAULT_TEACHER_ID): MissionSetting {
  return {
    id: "setting_v1",
    teacherId,
    version: 1,
    active: true,
    updatedAt: new Date().toISOString(),
    dailyMealRules: {
      vegetableThreshold: 50,
      proteinThreshold: 50,
    },
    zeroLeftoverRules: {
      leftoverThreshold: 40,
    },
    bonusRules: {
      baseExp: 10,
      zeroLeftoverBonusExp: 5,
    },
    hardRules: {
      requiredSuccessMeals: 3,
      requireZeroLeftover: true,
      bonusExp: 20,
    },
  };
}

const DEFAULT_SPECIAL_MISSION_DRAFTS: Array<Pick<SpecialMission, "title" | "description" | "bonusExp">> = [
  { title: "초록 채소 데이", description: "오늘은 초록색 채소를 한 가지 이상 먹어보기", bonusExp: 8 },
  { title: "국물까지 완샷", description: "국이나 찌개를 남기지 않고 국물까지 다 먹기", bonusExp: 8 },
  { title: "골고루 편식 없이", description: "반찬을 하나도 안 남기고 골고루 먹어보기", bonusExp: 8 },
  { title: "천천히 꼭꼭", description: "한 끼를 15분 이상 천천히, 꼭꼭 씹어서 먹기", bonusExp: 6 },
  { title: "물 많이 마시기", description: "오늘 하루 물을 충분히 마시기(음료수 말고 물로!)", bonusExp: 6 },
];

export function defaultSpecialMissions(teacherId: string): SpecialMission[] {
  const now = new Date().toISOString();
  return DEFAULT_SPECIAL_MISSION_DRAFTS.map((draft) => ({
    id: newId("mission"),
    teacherId,
    ...draft,
    active: true,
    createdAt: now,
  }));
}
