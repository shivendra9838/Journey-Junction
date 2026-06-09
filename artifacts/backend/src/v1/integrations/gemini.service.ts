import { AppError } from "../shared/errors";

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: unknown;
};

const parseJsonResponse = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    if (fenced) return JSON.parse(fenced);
    const objectText = text.match(/\{[\s\S]*\}/)?.[0];
    if (objectText) return JSON.parse(objectText);
    throw new AppError(502, "Gemini returned invalid JSON", "GEMINI_INVALID_JSON");
  }
};

export async function generateTripPlan(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AppError(500, "GEMINI_API_KEY is not configured", "GEMINI_CONFIG_MISSING");

  const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `Return only valid JSON. ${prompt}` }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    }),
  });

  const json = await res.json() as GeminiResponse;
  if (!res.ok) throw new AppError(502, `Gemini request failed: ${JSON.stringify(json.error ?? json)}`, "GEMINI_FAILED");

  const content = json.candidates?.[0]?.content?.parts?.map(part => part.text ?? "").join("").trim();
  if (!content) throw new AppError(502, "Gemini returned no content", "GEMINI_EMPTY");
  return parseJsonResponse(content);
}
