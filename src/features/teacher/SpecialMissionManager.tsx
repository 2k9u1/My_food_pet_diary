import { useEffect, useState } from "react";
import type { SpecialMission } from "../../types";
import { addSpecialMission, deleteSpecialMission, getTodaysSpecialMission, listSpecialMissions, updateSpecialMission } from "../../lib/store";

export function SpecialMissionManager() {
  const [missions, setMissions] = useState<SpecialMission[]>([]);
  const [today, setToday] = useState<SpecialMission | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bonusExp, setBonusExp] = useState(8);

  async function refresh() {
    const [list, t] = await Promise.all([listSpecialMissions(), getTodaysSpecialMission()]);
    setMissions(list);
    setToday(t);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleAdd() {
    if (!title.trim()) return;
    await addSpecialMission({ title: title.trim(), description: description.trim(), bonusExp });
    setTitle("");
    setDescription("");
    setBonusExp(8);
    await refresh();
  }

  return (
    <div className="stack">
      <div>
        <p className="page-title">오늘의 미션 관리</p>
        <p className="page-sub">
          여기에 등록한 미션 중 하나가 <b>매일 자동으로 무작위</b>로 뽑혀 모든 학생에게 오늘의 미션으로 보여집니다.
        </p>
      </div>

      <div className="callout note">
        <b>오늘({new Date().toLocaleDateString("ko-KR")}) 자동으로 뽑힌 미션: </b>
        {today ? `${today.title} (+${today.bonusExp} EXP)` : "켜둔 미션이 없어서 오늘은 표시되지 않아요."}
      </div>

      <div className="card stack">
        <h4 style={{ margin: 0, fontSize: 14.5 }}>새 미션 추가</h4>
        <div className="field">
          <label>미션 이름</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 초록 채소 데이" />
        </div>
        <div className="field">
          <label>설명</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="예: 오늘은 초록색 채소를 한 가지 이상 먹어보기"
          />
        </div>
        <div className="setting-row">
          <span>보너스 경험치</span>
          <input type="number" min={0} value={bonusExp} onChange={(e) => setBonusExp(Number(e.target.value))} />
        </div>
        <button className="btn btn-primary" onClick={handleAdd} disabled={!title.trim()}>
          미션 추가
        </button>
      </div>

      <div className="card">
        <h4 style={{ margin: "0 0 10px", fontSize: 14.5 }}>등록된 미션 목록 ({missions.length}개)</h4>
        {missions.length === 0 && <p style={{ color: "var(--ink-faint)", fontSize: 13.5 }}>아직 등록된 미션이 없어요.</p>}
        <div className="stack" style={{ gap: 10 }}>
          {missions.map((m) => (
            <div key={m.id} className="setting-group" style={{ opacity: m.active ? 1 : 0.55 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <h4 style={{ margin: "0 0 4px" }}>
                    {m.title} {today?.id === m.id && <span className="tag success">오늘의 미션</span>}
                  </h4>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--ink-dim)" }}>{m.description}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--ink-faint)" }}>보너스 +{m.bonusExp} EXP</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                  <label className="checkbox-row" style={{ fontSize: 12.5 }}>
                    <input
                      type="checkbox"
                      checked={m.active}
                      onChange={async (e) => {
                        await updateSpecialMission(m.id, { active: e.target.checked });
                        await refresh();
                      }}
                    />
                    뽑기 대상
                  </label>
                  <button
                    className="btn"
                    style={{ padding: "5px 10px", fontSize: 12.5 }}
                    onClick={async () => {
                      await deleteSpecialMission(m.id);
                      await refresh();
                    }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
