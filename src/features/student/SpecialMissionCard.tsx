import { useState } from "react";
import type { DailySpecialMissionState, SpecialMission } from "../../types";

export function SpecialMissionCard({
  mission,
  state,
  onComplete,
}: {
  mission: SpecialMission | null;
  state: DailySpecialMissionState | null;
  onComplete: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  if (!mission) return null;

  const done = state?.missionId === mission.id && state.completed;

  async function handleClick() {
    setBusy(true);
    try {
      await onComplete();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ borderColor: done ? "var(--accent-soft-line)" : undefined, background: done ? "var(--accent-soft)" : undefined }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <p className="tag" style={{ marginBottom: 6 }}>
            🎲 오늘의 미션
          </p>
          <h3 style={{ margin: "0 0 4px", fontSize: 15.5 }}>{mission.title}</h3>
          <p style={{ margin: 0, color: "var(--ink-dim)", fontSize: 13.5 }}>{mission.description}</p>
        </div>
        <span className="exp-pop" style={{ fontSize: 12.5, padding: "4px 10px" }}>
          +{mission.bonusExp} EXP
        </span>
      </div>

      {done ? (
        <p style={{ margin: "10px 0 0", color: "var(--accent)", fontWeight: 700, fontSize: 13.5 }}>✅ 오늘 실천 완료!</p>
      ) : (
        <button className="btn btn-primary btn-block" style={{ marginTop: 12 }} disabled={busy} onClick={handleClick}>
          {busy ? "처리 중..." : "오늘 실천했어요"}
        </button>
      )}
      <p className="hint">이 미션은 매일 자동으로 바뀌어요. 실천 여부는 스스로 체크하는 자기 점검 미션이에요.</p>
    </div>
  );
}
