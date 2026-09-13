import type { StudentSummary } from "../../types";
import { stageEmoji } from "../../lib/pet";
import { MEAL_ORDER } from "../../lib/labels";

export function DashboardHome({
  summaries,
  onSelect,
}: {
  summaries: StudentSummary[];
  onSelect: (studentId: string) => void;
}) {
  const hasDemo = summaries.some((s) => s.user.isDemo);

  return (
    <div className="stack">
      <div>
        <p className="page-title">학생 현황</p>
        <p className="page-sub">담당 학생 {summaries.length}명의 오늘 진행과 누적 성장을 한눈에 확인하세요.</p>
      </div>

      {hasDemo && (
        <div className="callout warn">
          <span className="tag demo">예시</span> 표시가 붙은 학생 2명은 화면 확인용 샘플입니다. 실제 학생은 학생 화면에서 로그인하면 자동으로 이 목록에 추가돼요.
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>학생</th>
              <th>오늘 진행</th>
              <th>펫 성장</th>
              <th>누적 경험치</th>
              <th>성공률</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => {
              const doneToday = MEAL_ORDER.filter((m) => s.today.meals[m].dailyMealSuccess).length;
              return (
                <tr key={s.user.id} className="clickable" onClick={() => onSelect(s.user.id)}>
                  <td>
                    {s.user.useAlias ? s.user.displayName : `${s.user.displayName} (${s.user.studentNumber ?? "-"})`}
                    {s.user.isDemo && (
                      <span className="tag demo" style={{ marginLeft: 6 }}>
                        예시
                      </span>
                    )}
                  </td>
                  <td>{doneToday} / 3끼</td>
                  <td>
                    {stageEmoji(s.petState.growthStage)} {s.petState.growthStage} · Lv.{s.petState.level}
                  </td>
                  <td className="mono">{s.petState.exp} EXP</td>
                  <td>{Math.round(s.successRate * 100)}%</td>
                </tr>
              );
            })}
            {summaries.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--ink-faint)" }}>
                  아직 로그인한 학생이 없어요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
