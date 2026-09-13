import { useState } from "react";
import { ClassCodeError } from "../lib/auth";

export function GoogleOnboardingForm({
  googleName,
  onSubmit,
}: {
  googleName: string;
  onSubmit: (input: { displayName: string; studentNumber: string; useAlias: boolean; classCode: string }) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(googleName);
  const [studentNumber, setStudentNumber] = useState("");
  const [classCode, setClassCode] = useState("");
  const [useAlias, setUseAlias] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = displayName.trim().length > 0 && studentNumber.trim().length > 0 && classCode.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError("");
    try {
      await onSubmit({
        displayName: displayName.trim(),
        studentNumber: studentNumber.trim(),
        useAlias,
        classCode: classCode.trim(),
      });
    } catch (err) {
      setError(err instanceof ClassCodeError ? err.message : "저장에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="card login-card stack">
        <div>
          <p className="page-title">🎉 처음이시네요!</p>
          <p className="page-sub">시작하기 전에 몇 가지만 알려주세요.</p>
        </div>

        <div className="field">
          <label>선생님이 알려준 학급 코드</label>
          <input
            type="text"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value.toUpperCase())}
            placeholder="예: AB12CD"
            style={{ letterSpacing: "0.15em", fontFamily: "monospace" }}
          />
        </div>

        <div className="field">
          <label>이름 또는 별명</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>

        <div className="field">
          <label>학번</label>
          <input
            type="text"
            value={studentNumber}
            onChange={(e) => setStudentNumber(e.target.value)}
            placeholder="예: 10112"
            inputMode="numeric"
          />
        </div>

        <label className="checkbox-row">
          <input type="checkbox" checked={useAlias} onChange={(e) => setUseAlias(e.target.checked)} />
          친구들에게는 이름 대신 별명으로 보이게 하기
        </label>

        {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

        <button className="btn btn-primary btn-block" disabled={!canSubmit || busy} onClick={handleSubmit}>
          {busy ? "저장 중..." : "시작하기"}
        </button>
      </div>
    </div>
  );
}
