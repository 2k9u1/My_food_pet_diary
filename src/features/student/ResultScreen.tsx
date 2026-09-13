import type { SubmitResult } from "../../types";
import { MEAL_EMOJI, MEAL_LABEL, MEAL_ORDER } from "../../lib/labels";
import { PetCard } from "./PetCard";

export function ResultScreen({ result, onNext }: { result: SubmitResult; onNext: () => void }) {
  const success = result.dailyMealSuccess;

  return (
    <div className="stack">
      <div className={`result-banner ${success ? "success" : "fail"}`}>
        <div className="big">{success ? "🎉" : "🙂"}</div>
        <h2>{success ? "미션 성공!" : "이번엔 조건 미달이에요"}</h2>
        <p>{success ? "채소·단백질 기준을 만족했어요." : "채소·단백질 기준에 조금 못 미쳤어요. 다음 끼니에 다시 도전해 봐요."}</p>
        {result.expDelta > 0 && <div className="exp-pop">+{result.expDelta} EXP</div>}
        {result.leveledUp && <p style={{ marginTop: 10, fontWeight: 700, color: "var(--accent)" }}>레벨 업! 🎊</p>}
        {result.hardBonusJustApplied && <p style={{ marginTop: 6, fontWeight: 700, color: "var(--accent)" }}>⭐ 고난도 보너스 획득!</p>}
        {result.zeroLeftoverSuccess === true && <p style={{ marginTop: 6, color: "var(--accent)" }}>🍽️ 잔반 제로 성공!</p>}
      </div>

      <PetCard pet={result.petState} />

      <div className="card">
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>오늘 기록</h3>
        {MEAL_ORDER.map((m) => {
          const meal = result.dailyProgress.meals[m];
          return (
            <div className="meal-row" key={m}>
              <div className="meal-label">
                <span className={`status-dot ${meal.dailyMealSuccess ? "done" : meal.submissionCount > 0 ? "partial" : ""}`} />
                {MEAL_EMOJI[m]} {MEAL_LABEL[m]}
              </div>
              <span className={`tag ${meal.dailyMealSuccess ? "success" : meal.submissionCount > 0 ? "fail" : ""}`}>
                {meal.dailyMealSuccess ? "성공" : meal.submissionCount > 0 ? "재도전 필요" : "아직 안함"}
              </span>
            </div>
          );
        })}
      </div>

      <button className="btn btn-primary btn-block" onClick={onNext}>
        다음 미션으로 이동
      </button>
    </div>
  );
}
