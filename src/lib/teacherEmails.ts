// 이 목록에 있는 구글 이메일로 로그인하면 자동으로 "교사" 역할이 됩니다.
//
// 중요: 여기 목록은 화면에 무엇을 보여줄지 정하는 용도일 뿐입니다. 실제 권한
// 검사(서버 강제)는 firestore.rules 안에 있는 같은 목록이 담당합니다.
// 선생님 이메일을 추가/삭제할 때는 반드시 firestore.rules 파일도 함께 고치고
// Firebase 콘솔의 Firestore 규칙에 다시 붙여넣어야 실제로 반영됩니다.
export const TEACHER_EMAILS: string[] = ["padsa15@gmail.com"];

export function isTeacherEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return TEACHER_EMAILS.some((e) => e.toLowerCase() === lower);
}
