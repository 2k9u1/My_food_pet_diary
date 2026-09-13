import { useCallback, useEffect, useState } from "react";
import type { DailyProgress, PetState, SpecialMission, SubmitResult, User } from "../../types";
import { completeSpecialMission, getDailyProgress, getPetState, getTodaysSpecialMission } from "../../lib/store";
import { todayStr } from "../../lib/id";
import { TodaySummary } from "./TodaySummary";
import { SubmitFlow } from "./SubmitFlow";
import { ResultScreen } from "./ResultScreen";

type Screen = "loading" | "today" | "submit" | "result";

export function StudentApp({ user }: { user: User }) {
  const [screen, setScreen] = useState<Screen>("loading");
  const [pet, setPet] = useState<PetState | null>(null);
  const [progress, setProgress] = useState<DailyProgress | null>(null);
  const [specialMission, setSpecialMission] = useState<SpecialMission | null>(null);
  const [lastResult, setLastResult] = useState<SubmitResult | null>(null);

  const teacherId = user.teacherId;

  const refresh = useCallback(async () => {
    if (!teacherId) return;
    const [p, d, sm] = await Promise.all([
      getPetState(user.id, teacherId),
      getDailyProgress(user.id, teacherId, todayStr()),
      getTodaysSpecialMission(teacherId),
    ]);
    setPet(p);
    setProgress(d);
    setSpecialMission(sm);
  }, [user.id, teacherId]);

  useEffect(() => {
    refresh().then(() => setScreen("today"));
  }, [refresh]);

  if (!teacherId) {
    return <p className="page-sub">담당 교사 정보를 찾을 수 없어요. 선생님께 문의해 주세요.</p>;
  }

  if (screen === "loading" || !pet || !progress) {
    return <p className="page-sub">불러오는 중...</p>;
  }

  if (screen === "submit") {
    return (
      <SubmitFlow
        studentId={user.id}
        teacherId={teacherId}
        onCancel={() => setScreen("today")}
        onDone={async (result) => {
          setLastResult(result);
          await refresh();
          setScreen("result");
        }}
      />
    );
  }

  if (screen === "result" && lastResult) {
    return (
      <ResultScreen
        result={lastResult}
        onNext={async () => {
          await refresh();
          setScreen("today");
        }}
      />
    );
  }

  return (
    <TodaySummary
      pet={pet}
      progress={progress}
      specialMission={specialMission}
      onStart={() => setScreen("submit")}
      onCompleteSpecial={async () => {
        await completeSpecialMission(user.id, teacherId);
        await refresh();
      }}
    />
  );
}
