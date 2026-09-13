import { useEffect, useState } from "react";
import type { DailyProgress, MealSubmission, PetState, User } from "../../types";
import { getPetState, getUser, listDailyProgress, listSubmissions } from "../../lib/store";
import { MEAL_EMOJI, MEAL_LABEL, MEAL_ORDER } from "../../lib/labels";
import { stageEmoji } from "../../lib/pet";

export function StudentDetail({
  studentId,
  teacherId,
  onBack,
}: {
  studentId: string;
  teacherId: string;
  onBack: () => void;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [pet, setPet] = useState<PetState | null>(null);
  const [days, setDays] = useState<DailyProgress[]>([]);
  const [submissions, setSubmissions] = useState<MealSubmission[]>([]);

  useEffect(() => {
    Promise.all([
      getUser(studentId),
      getPetState(studentId, teacherId),
      listDailyProgress(studentId, teacherId),
      listSubmissions(studentId, teacherId),
    ]).then(([u, p, d, s]) => {
      setUser(u ?? null);
      setPet(p);
      setDays(d);
      setSubmissions(s);
    });
  }, [studentId, teacherId]);

  if (!user || !pet) return <p className="page-sub">불러오는 중...</p>;

  return (
    <div className="stack">
      <button className="btn" style={{ alignSelf: "flex-start" }} onClick={onBack}>
        ← 학생 목록으로
      </button>

      <div>
        <p className="page-title">
          {user.useAlias ? user.displayName : `${user.displayName} (${user.studentNumber ?? "-"})`}
        </p>
        <p className="page-sub">
          {stageEmoji(pet.growthStage)} {pet.growthStage} · Lv.{pet.level} · 누적 {pet.exp} EXP
        </p>
      </div>

      <div className="card">
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>날짜별 기록</h3>
        {days.length === 0 && <p style={{ color: "var(--ink-faint)", fontSize: 13.5 }}>아직 제출 기록이 없어요.</p>}
        <div className="stack" style={{ gap: 10 }}>
          {days.map((day) => (
            <div key={day.date} className="setting-group">
              <h4 style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{day.date}</span>
                <span className="mono" style={{ color: "var(--accent)" }}>
                  +{day.totalExpToday} EXP
                </span>
              </h4>
              {MEAL_ORDER.map((m) => {
                const meal = day.meals[m];
                if (meal.submissionCount === 0) return null;
                return (
                  <div className="meal-row" key={m}>
                    <span className="meal-label">
                      {MEAL_EMOJI[m]} {MEAL_LABEL[m]}
                    </span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span className={`tag ${meal.dailyMealSuccess ? "success" : "fail"}`}>{meal.dailyMealSuccess ? "성공" : "실패"}</span>
                      {meal.zeroLeftoverSuccess !== null && (
                        <span className={`tag ${meal.zeroLeftoverSuccess ? "success" : "fail"}`}>
                          잔반 {meal.zeroLeftoverSuccess ? "제로" : "남음"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {day.hardBonusApplied && <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--accent)" }}>⭐ 고난도 보너스 달성</p>}
              {day.specialMission?.completed && (
                <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--accent)" }}>
                  🎲 오늘의 미션 "{day.specialMission.title}" 실천 (+{day.specialMission.bonusExp} EXP)
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>AI가 확인한 음식 ({submissions.length}건)</h3>
        <p className="hint" style={{ marginTop: 0 }}>사진 자체는 저장하지 않고, AI가 분석한 설명만 기록돼요.</p>
        <div className="stack" style={{ gap: 8 }}>
          {submissions.slice(0, 20).map((s) => (
            <div key={s.id} className="meal-row">
              <span className="meal-label">
                {MEAL_EMOJI[s.mealType]} {s.date} · {MEAL_LABEL[s.mealType]} · {s.phase === "before" ? "식사 전" : "식사 후"}
              </span>
              <span style={{ fontSize: 13, color: "var(--ink-dim)", textAlign: "right" }}>{s.foodDescription}</span>
            </div>
          ))}
          {submissions.length === 0 && <p style={{ color: "var(--ink-faint)", fontSize: 13.5 }}>아직 제출 기록이 없어요.</p>}
        </div>
      </div>
    </div>
  );
}
