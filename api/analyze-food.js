// Vercel 서버리스 함수 — 학생이 올린 식사 사진을 Google Gemini API로 분석합니다.
//
// 사진은 이 함수 안에서만 잠깐 쓰이고 저장되지 않습니다(요청이 끝나면 사라짐).
// GEMINI_API_KEY는 Vercel 프로젝트의 환경 변수에만 넣어주세요 — 브라우저 번들에는
// 절대 포함되지 않고, 이 서버 함수 안에서만 사용됩니다. 발급: https://aistudio.google.com/apikey
// (구글 계정만 있으면 카드 등록 없이 무료로 키를 받을 수 있습니다.)

// Flash-Lite 계열은 구글이 대량·저비용 처리에 맞춰 만든 모델이라 무료 할당량이
// 훨씬 넉넉합니다(음식 사진 분류 같은 간단한 작업에 딱 맞음). 학급 전체가 몰려서
// 제출해도 견디기 쉽도록 이 모델을 기본값으로 씁니다.
const GEMINI_MODEL = "gemini-3.5-flash-lite";

const PROMPT = `이 사진은 초등학생이 자기 식사를 스스로 점검하려고 올린 사진입니다.
사진 속 음식을 보고 아래 JSON 형식으로만 답하세요. 다른 설명은 절대 덧붙이지 마세요.

{
  "foodDescription": "사진에 보이는 음식을 한국어로 짧게 설명 (예: '밥, 김치찌개, 계란말이')",
  "vegetableScore": 0에서 100 사이 정수, 채소 반찬이 잘 보이면 높게 없으면 0에 가깝게,
  "proteinScore": 0에서 100 사이 정수, 고기·생선·계란·두부 등 단백질 음식이 보이면 높게,
  "leftoverScore": 0에서 100 사이 정수, 그릇에 음식이 많이 남아있으면 높게 깨끗이 비었으면 0에 가깝게
}

사진이 식사 사진이 아니거나 무엇인지 알아보기 어려우면 foodDescription에 "확인이 어려운 사진이에요"라고 쓰고 세 점수는 모두 0으로 하세요.`;

function clampScore(value) {
  const n = Math.round(Number(value));
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST 요청만 지원해요." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "서버에 GEMINI_API_KEY가 설정되지 않았어요." });
    return;
  }

  const { imageDataUrl } = req.body ?? {};
  const match = typeof imageDataUrl === "string" && imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    res.status(400).json({ error: "올바른 이미지가 아니에요." });
    return;
  }
  const [, mimeType, base64Data] = match;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  try {
    let geminiRes;
    let lastErrText = "";
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data: base64Data } }],
              },
            ],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );

      if (geminiRes.ok) break;

      lastErrText = await geminiRes.text();
      console.error(`Gemini API error (attempt ${attempt}/${maxAttempts}):`, geminiRes.status, lastErrText);

      // 429(요청 과다)·503(일시적 과부하)는 잠깐 쉬었다가 다시 시도해볼 가치가 있음
      const retryable = geminiRes.status === 429 || geminiRes.status === 503;
      if (!retryable || attempt === maxAttempts) break;
      await sleep(attempt * 800);
    }

    if (!geminiRes.ok) {
      res.status(502).json({
        error:
          geminiRes.status === 429
            ? "지금 사진 분석 요청이 많아서 잠시 기다려야 해요. 30초 후 다시 시도해 주세요."
            : "AI 분석 서버에 문제가 있어요. 잠시 후 다시 시도해 주세요.",
      });
      return;
    }

    const data = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      res.status(502).json({ error: "AI가 답을 주지 않았어요." });
      return;
    }

    const parsed = JSON.parse(text);
    res.status(200).json({
      foodDescription: String(parsed.foodDescription ?? "설명 없음").slice(0, 200),
      vegetable: clampScore(parsed.vegetableScore),
      protein: clampScore(parsed.proteinScore),
      leftover: clampScore(parsed.leftoverScore),
    });
  } catch (err) {
    console.error("analyze-food failed:", err);
    res.status(500).json({ error: "사진 분석 중 문제가 생겼어요." });
  }
}
