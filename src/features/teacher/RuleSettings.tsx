import { useEffect, useState } from "react";
import type { MissionSetting } from "../../types";
import { getMissionSetting, saveMissionSetting } from "../../lib/store";

export function RuleSettings({ teacherId }: { teacherId: string }) {
  const [setting, setSetting] = useState<MissionSetting | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getMissionSetting(teacherId).then(setSetting);
  }, [teacherId]);

  if (!setting) return <p className="page-sub">불러오는 중...</p>;

  function update<K extends keyof MissionSetting>(key: K, value: MissionSetting[K]) {
    setSetting((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }

  async function handleSave() {
    if (!setting) return;
    const next = await saveMissionSetting(teacherId, setting);
    setSetting(next);
    setSaved(true);
  }

  return (
    <div className="stack">
      <div>
        <p className="page-title">미션 규칙 설정</p>
        <p className="page-sub">
          저장하면 <b>이 시점 이후 제출되는 인증부터</b> 새 규칙이 적용돼요. 현재 버전: v{setting.version}
        </p>
      </div>

      <div className="setting-group">
        <h4>🥦 일일 세 끼 판정 기준</h4>
        <div className="setting-row">
          <span>채소 점수 기준 (0~100, 이상이면 인정)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={setting.dailyMealRules.vegetableThreshold}
            onChange={(e) => update("dailyMealRules", { ...setting.dailyMealRules, vegetableThreshold: Number(e.target.value) })}
          />
        </div>
        <div className="setting-row">
          <span>단백질 점수 기준 (0~100, 이상이면 인정)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={setting.dailyMealRules.proteinThreshold}
            onChange={(e) => update("dailyMealRules", { ...setting.dailyMealRules, proteinThreshold: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="setting-group">
        <h4>🍽️ 잔반 제로 판정 기준</h4>
        <div className="setting-row">
          <span>잔반 점수 기준 (0~100, 이하면 성공)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={setting.zeroLeftoverRules.leftoverThreshold}
            onChange={(e) => update("zeroLeftoverRules", { leftoverThreshold: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="setting-group">
        <h4>⭐ 경험치 · 보너스 규칙</h4>
        <div className="setting-row">
          <span>세 끼 미션 1회 성공 시 경험치</span>
          <input
            type="number"
            min={0}
            value={setting.bonusRules.baseExp}
            onChange={(e) => update("bonusRules", { ...setting.bonusRules, baseExp: Number(e.target.value) })}
          />
        </div>
        <div className="setting-row">
          <span>잔반 제로 성공 보너스 경험치</span>
          <input
            type="number"
            min={0}
            value={setting.bonusRules.zeroLeftoverBonusExp}
            onChange={(e) => update("bonusRules", { ...setting.bonusRules, zeroLeftoverBonusExp: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="setting-group">
        <h4>🏆 고난도 미션 조건</h4>
        <div className="setting-row">
          <span>필요한 오늘 성공 끼니 수 (1~3)</span>
          <input
            type="number"
            min={1}
            max={3}
            value={setting.hardRules.requiredSuccessMeals}
            onChange={(e) => update("hardRules", { ...setting.hardRules, requiredSuccessMeals: Number(e.target.value) })}
          />
        </div>
        <div className="setting-row">
          <span>잔반 제로 전체 성공도 필요</span>
          <input
            type="checkbox"
            checked={setting.hardRules.requireZeroLeftover}
            onChange={(e) => update("hardRules", { ...setting.hardRules, requireZeroLeftover: e.target.checked })}
          />
        </div>
        <div className="setting-row">
          <span>고난도 보너스 경험치</span>
          <input
            type="number"
            min={0}
            value={setting.hardRules.bonusExp}
            onChange={(e) => update("hardRules", { ...setting.hardRules, bonusExp: Number(e.target.value) })}
          />
        </div>
      </div>

      {saved && <div className="save-toast">저장됐어요. 다음 인증부터 새 규칙이 적용돼요.</div>}

      <button className="btn btn-primary btn-block" onClick={handleSave}>
        저장하기
      </button>
    </div>
  );
}
