// 실제 서비스 모드 전용: 사진을 서버 API(/api/analyze-food, Vercel 서버리스 함수)로
// 보내 Google Gemini가 무슨 음식인지 판단하게 합니다. 사진은 그 요청 안에서만
// 쓰이고 어디에도 저장되지 않습니다.
//
// 주의: 이 함수는 앱이 Vercel에 배포되어 있거나 `vercel dev`로 로컬 실행 중일
// 때만 동작합니다. 그냥 `npm run dev`(Vite만 실행)로는 /api 경로가 없어서
// 실패합니다 — README의 "AI 사진 분석 설정" 참고.

export interface FoodAnalysis {
  foodDescription: string;
  vegetable: number;
  protein: number;
  leftover: number;
}

export async function analyzeFoodPhoto(imageDataUrl: string): Promise<FoodAnalysis> {
  const res = await fetch("/api/analyze-food", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageDataUrl }),
  });
  if (!res.ok) {
    throw new Error("사진 분석에 실패했어요. 잠시 후 다시 시도해 주세요.");
  }
  return res.json();
}
