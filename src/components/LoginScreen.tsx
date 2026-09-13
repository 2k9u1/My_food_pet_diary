import { useState } from "react";
import type { Role, User } from "../types";
import {
  ClassCodeError,
  signInLocalStudent,
  signInLocalTeacher,
  signUpFirebaseStudent,
  signUpFirebaseTeacher,
  usingFirebase,
} from "../lib/auth";

export function LoginScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [role, setRole] = useState<Role>("student");
  const [name, setName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [classCode, setClassCode] = useState("");
  const [useAlias, setUseAlias] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canSubmit =
    role === "teacher"
      ? name.trim().length > 0
      : name.trim().length > 0 && studentNumber.trim().length > 0 && (!usingFirebase || classCode.trim().length > 0);

  async function handleSubmit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError("");
    try {
      const user =
        role === "teacher"
          ? usingFirebase
            ? await signUpFirebaseTeacher({ displayName: name.trim() })
            : await signInLocalTeacher({ displayName: name.trim() })
          : usingFirebase
            ? await signUpFirebaseStudent({
                displayName: name.trim(),
                studentNumber: studentNumber.trim(),
                useAlias,
                classCode: classCode.trim(),
              })
            : await signInLocalStudent({ displayName: name.trim(), studentNumber: studentNumber.trim(), useAlias });
      onLogin(user);
    } catch (err) {
      setError(err instanceof ClassCodeError ? err.message : "시작하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="card login-card stack">
        <div>
          <p className="page-title">🐾 밥친구</p>
          <p className="page-sub">식단을 인증하고 내 펫을 키워보세요.</p>
        </div>

        <div className="role-toggle">
          <button className={`choice-btn ${role === "student" ? "selected" : ""}`} onClick={() => setRole("student")}>
            <span className="emoji">🧒</span>학생으로 시작
          </button>
          <button className={`choice-btn ${role === "teacher" ? "selected" : ""}`} onClick={() => setRole("teacher")}>
            <span className="emoji">🍎</span>교사로 시작
          </button>
        </div>

        <div className="field">
          <label>{role === "student" ? "이름 또는 별명" : "이름"}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={role === "student" ? "예: 김민준" : "예: 박선생"}
          />
        </div>

        {role === "student" && (
          <>
            {usingFirebase && (
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
            )}
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
          </>
        )}

        {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

        <button className="btn btn-primary btn-block" disabled={!canSubmit || busy} onClick={handleSubmit}>
          {busy ? "확인 중..." : "시작하기"}
        </button>

        {!usingFirebase && (
          <p className="hint" style={{ textAlign: "center" }}>
            지금은 시연용 간편 로그인입니다. .env.local에 Firebase 설정을 넣으면 실제 저장소(Firestore)로 바뀝니다.
          </p>
        )}
      </div>
    </div>
  );
}
