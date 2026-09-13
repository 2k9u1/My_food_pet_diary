import { useRef, useState, type ChangeEvent } from "react";
import type { MealType, Phase, SubmitResult } from "../../types";
import { MEAL_EMOJI, MEAL_LABEL, MEAL_ORDER } from "../../lib/labels";
import { fileToCompressedDataUrl, UploadError } from "../../lib/image";
import { submitMeal } from "../../lib/store";

const PHASES: Array<{ value: Phase; label: string; emoji: string }> = [
  { value: "before", label: "식사 전", emoji: "🍽️" },
  { value: "after", label: "식사 후", emoji: "✅" },
];

export function SubmitFlow({
  studentId,
  teacherId,
  onDone,
  onCancel,
}: {
  studentId: string;
  teacherId: string;
  onDone: (result: SubmitResult) => void;
  onCancel: () => void;
}) {
  const [mealType, setMealType] = useState<MealType | null>(null);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<"camera" | "gallery" | "unknown">("unknown");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setPreview(dataUrl);
    } catch (err) {
      setPreview(null);
      setError(err instanceof UploadError ? err.message : "사진 처리 중 문제가 생겼어요.");
    }
  }

  const canSubmit = mealType && phase && preview && !busy;

  async function handleSubmit() {
    if (!mealType || !phase || !preview) return;
    setBusy(true);
    setError("");
    try {
      const result = await submitMeal({
        studentId,
        teacherId,
        mealType,
        phase,
        imageDataUrl: preview,
        sourceType,
      });
      onDone(result);
    } catch {
      setError("제출에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div>
        <p className="page-title">미션 인증하기</p>
        <p className="page-sub">끼니와 전/후를 고르고, 사진 한 장만 올리면 끝이에요.</p>
      </div>

      <div className="card stack">
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-dim)" }}>① 어떤 끼니인가요?</label>
          <div className="choice-row" style={{ marginTop: 8 }}>
            {MEAL_ORDER.map((m) => (
              <button key={m} className={`choice-btn ${mealType === m ? "selected" : ""}`} onClick={() => setMealType(m)}>
                <span className="emoji">{MEAL_EMOJI[m]}</span>
                {MEAL_LABEL[m]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-dim)" }}>② 식사 전인가요, 후인가요?</label>
          <div className="choice-row two" style={{ marginTop: 8 }}>
            {PHASES.map((p) => (
              <button key={p.value} className={`choice-btn ${phase === p.value ? "selected" : ""}`} onClick={() => setPhase(p.value)}>
                <span className="emoji">{p.emoji}</span>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-dim)" }}>③ 사진을 올려주세요</label>
          <div className={`upload-box ${preview ? "has-image" : ""}`} style={{ marginTop: 8 }}>
            {preview ? (
              <img src={preview} alt="업로드한 사진 미리보기" />
            ) : (
              <>
                <div style={{ fontSize: 30 }}>📷</div>
                지금 촬영하거나, 사진첩에서 골라도 돼요
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                handleFile(e);
                setSourceType("unknown");
              }}
            />
          </div>
          {preview && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="btn" onClick={() => fileRef.current?.click()}>
                다른 사진으로 바꾸기
              </button>
            </div>
          )}
          <p className="hint">오늘 먹은 식사 사진을 올려주세요. 판정 결과는 미션 수행을 돕기 위한 참고이며, 사진을 잘못 인식할 수 있어요.</p>
        </div>

        {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" onClick={onCancel}>
          취소
        </button>
        <button className="btn btn-primary" style={{ flex: 1 }} disabled={!canSubmit} onClick={handleSubmit}>
          {busy ? "판정 중..." : "제출하고 결과 보기"}
        </button>
      </div>
    </div>
  );
}
