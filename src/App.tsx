import { useCallback, useEffect, useState } from "react";
import { ensureSeedData } from "./lib/store";
import { getSessionState, logout, subscribeAuthChanges, type SessionState } from "./lib/auth";
import { LoginScreen } from "./components/LoginScreen";
import { Footer } from "./components/Footer";
import { StudentApp } from "./features/student/StudentApp";
import { TeacherApp } from "./features/teacher/TeacherApp";

export default function App() {
  const [session, setSession] = useState<SessionState>({ status: "signedOut" });
  const [ready, setReady] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const refreshSession = useCallback(async () => {
    setSession(await getSessionState());
  }, []);

  useEffect(() => {
    ensureSeedData().then(() => refreshSession().then(() => setReady(true)));
    return subscribeAuthChanges(() => {
      refreshSession();
    });
  }, [refreshSession]);

  if (!ready) return null;

  if (session.status === "signedOut") {
    return (
      <div className="app-shell">
        <LoginScreen onLogin={(user) => setSession({ status: "ready", user })} />
        <Footer />
      </div>
    );
  }

  const { user } = session;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="logo">🐾</span> 마이푸드펫다이어리
        </div>
        <div className="user-chip">
          <span className={`role-pill ${user.role}`}>{user.role === "student" ? "학생" : "교사"}</span>
          <span>{user.displayName}</span>
          {user.role === "teacher" && user.classCode && (
            <>
              <span className="meta-chip" title="학생들에게 이 코드를 알려주면 우리 반으로 가입해요">
                학급 코드 <b className="mono">{user.classCode}</b>
              </span>
              <button
                className="btn btn-ghost"
                onClick={async () => {
                  const url = `${window.location.origin}/?code=${user.classCode}`;
                  try {
                    await navigator.clipboard.writeText(url);
                  } catch {
                    // 클립보드 권한이 없으면 조용히 무시 — 코드는 옆에 그대로 보임
                  }
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2000);
                }}
              >
                {linkCopied ? "복사됨! ✓" : "학생용 링크 복사"}
              </button>
            </>
          )}
          <button
            className="btn btn-ghost"
            onClick={async () => {
              await logout();
              await refreshSession();
            }}
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="content">{user.role === "student" ? <StudentApp user={user} /> : <TeacherApp user={user} />}</main>

      <Footer />
    </div>
  );
}
