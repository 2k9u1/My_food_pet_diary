// 데이터 모델 (요구사항 정의서 08. 데이터 모델 대응)
// 실제 서비스에서는 이 타입 그대로 Firestore 컬렉션 구조로 옮겨갈 수 있도록 설계했습니다.

export type Role = "student" | "teacher";

export interface User {
  id: string;
  role: Role;
  displayName: string; // 이름 또는 별명/번호(useAlias가 true면 별명 사용)
  studentNumber?: string;
  useAlias: boolean; // 이름 대신 번호/별명 표시 여부 (개인정보 최소 수집 옵션)
  createdAt: string;
  isDemo?: boolean; // 대시보드 미리보기용 샘플 학생 여부
}

export type MealType = "breakfast" | "lunch" | "dinner";
export type Phase = "before" | "after";
export type SourceType = "camera" | "gallery" | "unknown";

export interface MissionSetting {
  id: string;
  teacherId: string;
  version: number;
  active: boolean;
  updatedAt: string;
  dailyMealRules: {
    vegetableThreshold: number; // 0~100, 이 값 이상이면 채소 섭취 인정
    proteinThreshold: number; // 0~100, 이 값 이상이면 단백질 섭취 인정
  };
  zeroLeftoverRules: {
    leftoverThreshold: number; // 0~100, 식사 후 사진의 잔반 점수가 이 값 "이하"면 성공
  };
  bonusRules: {
    baseExp: number; // 세 끼 미션 1회 성공 시 지급 경험치
    zeroLeftoverBonusExp: number; // 잔반 제로 성공 시 추가 경험치
  };
  hardRules: {
    requiredSuccessMeals: number; // 고난도 보너스에 필요한 오늘 성공 끼니 수(1~3)
    requireZeroLeftover: boolean; // 고난도 보너스에 잔반 제로 전체 성공을 요구하는지
    bonusExp: number; // 고난도 보너스 경험치
  };
}

// 오늘의 미션(교사가 등록한 목록에서 매일 자동으로 하나가 무작위로 뽑히는 보너스 미션)
export interface SpecialMission {
  id: string;
  title: string;
  description: string;
  bonusExp: number;
  active: boolean; // 꺼두면 오늘의 미션 뽑기 대상에서 제외
  createdAt: string;
}

// 오늘 학생이 실제로 마주한 오늘의 미션과 실천 여부(교사가 목록을 나중에 바꿔도
// 그날 기록은 그대로 남도록 제목/보너스를 스냅샷으로 함께 저장)
export interface DailySpecialMissionState {
  missionId: string;
  title: string;
  bonusExp: number;
  completed: boolean;
  expGranted: boolean;
}

export interface PetState {
  studentId: string;
  exp: number;
  level: number;
  growthStage: string;
  updatedAt: string;
}

export interface MealSubmission {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  phase: Phase;
  imageDataUrl: string;
  sourceType: SourceType;
  scores: {
    vegetable?: number;
    protein?: number;
    leftover?: number;
  };
  createdAt: string;
}

export interface MealProgress {
  dailyMealSuccess: boolean;
  dailyMealExpGranted: boolean;
  zeroLeftoverSuccess: boolean | null; // null = 아직 전/후 비교 불가(둘 다 제출 전)
  zeroLeftoverExpGranted: boolean;
  submissionCount: number;
}

// "오늘 기록" + MissionResult 판정 상태를 학생/날짜 단위로 모아둔 집계 레코드
export interface DailyProgress {
  studentId: string;
  date: string;
  meals: Record<MealType, MealProgress>;
  hardBonusApplied: boolean;
  specialMission: DailySpecialMissionState | null;
  totalExpToday: number;
}

export interface SubmitResult {
  submission: MealSubmission;
  dailyProgress: DailyProgress;
  petState: PetState;
  expDelta: number;
  dailyMealSuccess: boolean;
  zeroLeftoverSuccess: boolean | null;
  hardBonusJustApplied: boolean;
  leveledUp: boolean;
}

export interface StudentSummary {
  user: User;
  petState: PetState;
  today: DailyProgress;
  successRate: number; // 최근 기록 기준 성공 비율(0~1)
  totalSubmissions: number;
}
