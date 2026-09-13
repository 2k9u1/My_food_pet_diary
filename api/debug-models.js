// 임시 디버그용 — 이 API 키로 실제 사용 가능한 Gemini 모델 목록을 확인합니다.
// 확인 후 삭제할 예정입니다.
export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "no key" });
    return;
  }
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await r.json();
    const models = (data.models ?? []).map((m) => ({
      name: m.name,
      displayName: m.displayName,
      supportedGenerationMethods: m.supportedGenerationMethods,
    }));
    res.status(r.status).json({ status: r.status, models });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
