import { useEffect, useState } from "react";
import type { User } from "./types";
import { ensureSeedData, getCurrentUser, logout } from "./lib/store";
import { LoginScreen } from "./components/LoginScreen";
import { Footer } from "./components/Footer";
import { StudentApp } from "./features/student/StudentApp";
import { TeacherApp } from "./features/teacher/TeacherApp";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureSeedData().then(() =>
      getCurrentUser().then((u) => {
        setUser(u);
        setReady(true);
      })
    );
  }, []);

  if (!ready) return null;

  if (!user) {
    return (
      <div className="app-shell">
        <LoginScreen onLogin={setUser} />
        <Footer />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="logo">🐾</span> 밥친구
        </div>
        <div className="user-chip">
          <span className={`role-pill ${user.role}`}>{user.role === "student" ? "학생" : "교사"}</span>
          <span>{user.useAlias ? user.displayName : user.displayName}</span>
          <button
            className="btn btn-ghost"
            onClick={async () => {
              await logout();
              setUser(null);
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
