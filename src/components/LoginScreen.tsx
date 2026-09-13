import { useState, type CSSProperties } from "react";
import type { Role, User } from "../types";
import {
  AuthFormError,
  ClassCodeError,
  signInLocalStudent,
  signInLocalTeacher,
  signInOrUpStudent,
  signInOrUpTeacher,
  usingFirebase,
} from "../lib/auth";
import { PolicyModal } from "./PolicyModal";

const linkStyle: CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  font: "inherit",
  color: "var(--accent)",
  textDecoration: "underline",
  cursor: "pointer",
};

/** 주소창의 ?code=AB12CD 를 읽어옵니다 — 교사가 코드 대신 링크를 공유하면 학생은 이 칸을 아예 안 봐도 됩니다. */
function codeFromUrl(): string {
  try {
    return new URLSearchParams(window.location.search).get("code")?.toUpperCase() ?? "";
  } catch {
    return "";
  }
}

export function LoginScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const prefilledCode = codeFromUrl();
  const [role, setRole] = useState<Role>("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [classCode, setClassCode] = useState(prefilledCode);
  const [useAlias, setUseAlias] = useState(false);
  const [consent, setConsent] = useState(false);
  const [openPolicy, setOpenPolicy] = useState<"privacy" | "terms" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canSubmit =
    (role === "teacher"
      ? name.trim().length > 0 && (!usingFirebase || (email.trim().length > 0 && password.length >= 6))
      : name.trim().length > 0 &&
      studentNumber.trim().length > 0 &&
      (!usingFirebase || (classCode.trim().length > 0 && password.length >= 6))) &&
    (!usingFirebase || consent);

  async function handleSubmit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError("");
    try {
      const user =
        role === "teacher"
          ? usingFirebase
            ? await signInOrUpTeacher({ email: email.trim(), password, displayName: name.trim() })
            : await signInLocalTeacher({ displayName: name.trim() })
          : usingFirebase
            ? await signInOrUpStudent({
              displayName: name.trim(),
              studentNumber: studentNumber.trim(),
              useAlias,
              classCode: classCode.trim(),
              password,
            })
            : await signInLocalStudent({ displayName: name.trim(), studentNumber: studentNumber.trim(), useAlias });
      onLogin(user);
    } catch (err) {
      setError(err instanceof ClassCodeError || err instanceof AuthFormError ? err.message : "시작하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="card login-card stack" style={{ gap: 12 }}>
        <div>
          <p className="page-title">🐾마이푸드펫다이어리</p>
          <p className="page-sub">식단을 인증하고 내 펫을 키워보세요.</p>
        </div>

        {prefilledCode ? (
          <div className="callout note" style={{ fontSize: 13 }}>
            🎓 선생님 링크로 들어왔어요 — 학급 코드 <b className="mono">{prefilledCode}</b>로 자동 연결돼요.
          </div>
        ) : (
          <div className="role-toggle" style={{ marginBottom: 0 }}>
            <button className={`choice-btn ${role === "student" ? "selected" : ""}`} onClick={() => setRole("student")}>
              <span className="emoji">🧒</span>학생으로 시작
            </button>
            <button className={`choice-btn ${role === "teacher" ? "selected" : ""}`} onClick={() => setRole("teacher")}>
              <span className="emoji">🍎</span>교사로 시작
            </button>
          </div>
        )}

        <div className="field" style={{ marginBottom: 0 }}>
          <label>{role === "student" ? "이름 또는 별명" : "이름"}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={role === "student" ? "예: 김민준" : "예: 박선생"}
          />
          {role === "student" && (
            <label className="checkbox-row" style={{ marginTop: 4 }}>
              <input type="checkbox" checked={useAlias} onChange={(e) => setUseAlias(e.target.checked)} />
              친구들에게는 별명으로 보이기
            </label>
          )}
        </div>

        {role === "teacher" && usingFirebase && (
          <div className="field" style={{ marginBottom: 0 }}>
            <label>이메일</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teacher@example.com" />
          </div>
        )}

        {role === "student" && (
          <>
            {usingFirebase && !prefilledCode && (
              <div className="field" style={{ marginBottom: 0 }}>
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
            <div className="field" style={{ marginBottom: 0 }}>
              <label>학번</label>
              <input
                type="text"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                placeholder="예: 10112"
                inputMode="numeric"
              />
            </div>
          </>
        )}

        {usingFirebase && (
          <div className="field" style={{ marginBottom: 0 }}>
            <label>비밀번호</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6자 이상, 처음 쓰면 자동으로 만들어져요" />
          </div>
        )}

        {usingFirebase && (
          <label className="checkbox-row" style={{ alignItems: "flex-start" }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 2 }} />
            <span>
              <button type="button" onClick={() => setOpenPolicy("privacy")} style={linkStyle}>
                개인정보 처리방침
              </button>
              {" "}및{" "}
              <button type="button" onClick={() => setOpenPolicy("terms")} style={linkStyle}>
                이용약관
              </button>
              에 동의해요.
              {role === "student" && " (보호자의 동의도 받았어요.)"}
            </span>
          </label>
        )}

        {error && <p style={{ color: "var(--danger)", fontSize: 13, margin: 0 }}>{error}</p>}

        <button className="btn btn-primary btn-block" disabled={!canSubmit || busy} onClick={handleSubmit}>
          {busy ? "확인 중..." : "시작하기"}
        </button>

        <PolicyModal kind={openPolicy} onClose={() => setOpenPolicy(null)} />

        {!usingFirebase && (
          <p className="hint" style={{ textAlign: "center", margin: 0 }}>
            지금은 시연용 간편 로그인입니다. .env.local에 Firebase 설정을 넣으면 실제 저장소(Firestore)로 바뀝니다.
          </p>
        )}
      </div>
    </div>
  );
}
