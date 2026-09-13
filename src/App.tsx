import { useCallback, useEffect, useState } from "react";
import { ensureSeedData } from "./lib/store";
import { completeGoogleOnboarding, getSessionState, logout, subscribeAuthChanges, type SessionState } from "./lib/auth";
import { LoginScreen } from "./components/LoginScreen";
import { GoogleOnboardingForm } from "./components/GoogleOnboardingForm";
import { Footer } from "./components/Footer";
import { StudentApp } from "./features/student/StudentApp";
import { TeacherApp } from "./features/teacher/TeacherApp";

export default function App() {
  const [session, setSession] = useState<SessionState>({ status: "signedOut" });
  const [ready, setReady] = useState(false);

  const refreshSession = useCallback(async () => {
    setSession(await getSessionState());
  }, []);

  useEffect(() => {
    ensureSeedData().then(() => refreshSession().then(() => setReady(true)));
    return subscribeAuthChanges(() => {
      refreshSession();
    });
  }, [refreshSession]);

  // 교사로 인식된 계정은 별도 입력 화면 없이 자동으로 프로필을 만듭니다.
  useEffect(() => {
    if (session.status === "needsOnboarding" && session.suggestedRole === "teacher") {
      completeGoogleOnboarding({
        uid: session.uid,
        displayName: session.googleName || "교사",
        role: "teacher",
      }).then(refreshSession);
    }
  }, [session, refreshSession]);

  if (!ready) return null;

  if (session.status === "signedOut") {
    return (
      <div className="app-shell">
        <LoginScreen onLogin={(user) => setSession({ status: "ready", user })} />
        <Footer />
      </div>
    );
  }

  if (session.status === "needsOnboarding") {
    if (session.suggestedRole === "teacher") {
      return (
        <div className="login-wrap">
          <p className="page-sub">교사 계정을 확인하는 중...</p>
        </div>
      ); // 자동 등록 처리 중
    }

    return (
      <div className="app-shell">
        <GoogleOnboardingForm
          googleName={session.googleName}
          onSubmit={async (input) => {
            await completeGoogleOnboarding({ uid: session.uid, ...input, role: "student" });
            await refreshSession();
          }}
        />
        <Footer />
      </div>
    );
  }

  const { user } = session;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="logo">🐾</span> 밥친구
        </div>
        <div className="user-chip">
          <span className={`role-pill ${user.role}`}>{user.role === "student" ? "학생" : "교사"}</span>
          <span>{user.displayName}</span>
          {user.role === "teacher" && user.classCode && (
            <span className="meta-chip" title="학생들에게 이 코드를 알려주면 우리 반으로 가입해요">
              학급 코드 <b className="mono">{user.classCode}</b>
            </span>
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
