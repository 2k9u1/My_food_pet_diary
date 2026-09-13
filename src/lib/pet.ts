// 펫 성장/경험치 모듈 (요구사항 정의서 07-⑥)
// 같은 경험치 입력이면 항상 같은 레벨/성장 단계가 나오도록 순수 함수로만 구성합니다.

export const EXP_PER_LEVEL = 50;

const STAGES: Array<{ maxLevel: number; name: string; emoji: string }> = [
  { maxLevel: 2, name: "알", emoji: "🥚" },
  { maxLevel: 4, name: "새싹", emoji: "🌱" },
  { maxLevel: 7, name: "아기 밥친구", emoji: "🐣" },
  { maxLevel: 10, name: "청소년 밥친구", emoji: "🐥" },
  { maxLevel: Infinity, name: "어른 밥친구", emoji: "🦉" },
];

export function levelFromExp(exp: number): number {
  return 1 + Math.floor(Math.max(0, exp) / EXP_PER_LEVEL);
}

export function expIntoCurrentLevel(exp: number): number {
  return Math.max(0, exp) % EXP_PER_LEVEL;
}

export function growthStageFromLevel(level: number): string {
  const stage = STAGES.find((s) => level <= s.maxLevel);
  return stage ? stage.name : STAGES[STAGES.length - 1].name;
}

export function stageEmoji(stageName: string): string {
  return STAGES.find((s) => s.name === stageName)?.emoji ?? "🐾";
}

export function levelProgressPercent(exp: number): number {
  return Math.round((expIntoCurrentLevel(exp) / EXP_PER_LEVEL) * 100);
}
