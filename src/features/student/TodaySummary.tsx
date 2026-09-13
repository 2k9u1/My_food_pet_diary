import type { DailyProgress, PetState, SpecialMission } from "../../types";
import { MEAL_EMOJI, MEAL_LABEL, MEAL_ORDER } from "../../lib/labels";
import { PetCard } from "./PetCard";
import { SpecialMissionCard } from "./SpecialMissionCard";

export function TodaySummary({
  pet,
  progress,
  specialMission,
  onStart,
  onCompleteSpecial,
}: {
  pet: PetState;
  progress: DailyProgress;
  specialMission: SpecialMission | null;
  onStart: () => void;
  onCompleteSpecial: () => Promise<void>;
}) {
  const doneMeals = MEAL_ORDER.filter((m) => progress.meals[m].dailyMealSuccess).length;

  return (
    <div className="stack">
      <div>
        <p className="page-title">오늘의 미션</p>
        <p className="page-sub">오늘 {doneMeals}/3끼 성공했어요. 아래에서 이어서 인증해 보세요.</p>
      </div>

      <PetCard pet={pet} />

      <SpecialMissionCard mission={specialMission} state={progress.specialMission} onComplete={onCompleteSpecial} />

      <div className="card">
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>오늘 기록</h3>
        {MEAL_ORDER.map((m) => {
          const meal = progress.meals[m];
          const zeroLabel =
            meal.zeroLeftoverSuccess === null ? "전/후 비교 대기" : meal.zeroLeftoverSuccess ? "잔반 제로 성공" : "잔반 남음";
          return (
            <div className="meal-row" key={m}>
              <div className="meal-label">
                <span className={`status-dot ${meal.dailyMealSuccess ? "done" : meal.submissionCount > 0 ? "partial" : ""}`} />
                {MEAL_EMOJI[m]} {MEAL_LABEL[m]}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <span className={`tag ${meal.dailyMealSuccess ? "success" : meal.submissionCount > 0 ? "fail" : ""}`}>
                  {meal.dailyMealSuccess ? "미션 성공" : meal.submissionCount > 0 ? "재도전 필요" : "아직 안함"}
                </span>
                <span className={`tag ${meal.zeroLeftoverSuccess ? "success" : ""}`}>{zeroLabel}</span>
              </div>
            </div>
          );
        })}
        {progress.hardBonusApplied && (
          <div className="callout" style={{ marginTop: 12, background: "var(--accent-soft)", borderColor: "var(--accent-soft-line)", color: "var(--accent)" }}>
            ⭐ 오늘 고난도 보너스 미션도 성공했어요!
          </div>
        )}
      </div>

      <button className="btn btn-primary btn-block" onClick={onStart}>
        📸 미션 인증하기
      </button>
    </div>
  );
}
