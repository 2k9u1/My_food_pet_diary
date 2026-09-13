import { useCallback, useEffect, useState } from "react";
import type { StudentSummary, User } from "../../types";
import { listAllStudentsSummary } from "../../lib/store";
import { DashboardHome } from "./DashboardHome";
import { RuleSettings } from "./RuleSettings";
import { SpecialMissionManager } from "./SpecialMissionManager";
import { StudentDetail } from "./StudentDetail";

type Tab = "home" | "settings" | "specialMissions";

export function TeacherApp({ user }: { user: User }) {
  const [tab, setTab] = useState<Tab>("home");
  const [summaries, setSummaries] = useState<StudentSummary[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listAllStudentsSummary(user.id).then(setSummaries);
  }, [user.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (selectedStudent) {
    return <StudentDetail studentId={selectedStudent} teacherId={user.id} onBack={() => setSelectedStudent(null)} />;
  }

  return (
    <div>
      <div className="tabs">
        <button className={`tab-btn ${tab === "home" ? "active" : ""}`} onClick={() => setTab("home")}>
          학생 현황
        </button>
        <button className={`tab-btn ${tab === "settings" ? "active" : ""}`} onClick={() => setTab("settings")}>
          미션 규칙 설정
        </button>
        <button className={`tab-btn ${tab === "specialMissions" ? "active" : ""}`} onClick={() => setTab("specialMissions")}>
          오늘의 미션 관리
        </button>
      </div>

      {tab === "home" && (
        <DashboardHome
          summaries={summaries}
          onSelect={(id) => {
            setSelectedStudent(id);
            refresh();
          }}
        />
      )}
      {tab === "settings" && <RuleSettings teacherId={user.id} />}
      {tab === "specialMissions" && <SpecialMissionManager teacherId={user.id} />}
    </div>
  );
}
