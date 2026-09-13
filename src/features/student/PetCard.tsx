import type { PetState } from "../../types";
import { expIntoCurrentLevel, levelProgressPercent, stageEmoji } from "../../lib/pet";

export function PetCard({ pet }: { pet: PetState }) {
  return (
    <div className="card pet-card">
      <div className="pet-emoji">{stageEmoji(pet.growthStage)}</div>
      <div className="pet-meta" style={{ flex: 1 }}>
        <h3>
          {pet.growthStage} · Lv.{pet.level}
        </h3>
        <p>
          누적 경험치 {pet.exp} EXP (다음 레벨까지 {expIntoCurrentLevel(pet.exp)}/50)
        </p>
        <div className="bar-track">
          <div className="bar-fill" style={{ width: `${levelProgressPercent(pet.exp)}%` }} />
        </div>
      </div>
    </div>
  );
}
