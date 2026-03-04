import { NextRequest, NextResponse } from "next/server";
const GOOGLE_AI_STUDIO_KEY = process.env.GOOGLE_AI_STUDIO_KEY || "";
const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-latest",
  "gemini-3-flash-preview",
];
export async function POST(req: NextRequest) {
  if (!GOOGLE_AI_STUDIO_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_AI_STUDIO_KEY missing" },
      { status: 500 },
    );
  }
  try {
    const {
      question,
      idealAnswer,
      explanation,
      userAnswer,
      maxPoints,
      passingScore,
    } = await req.json();
    const max = Number(maxPoints) || 10;
    const passing = Number(passingScore) || Math.round(max * 0.6);
    const prompt = `You are an academic examiner. Grade this student answer.
QUESTION: ${question}
MODEL ANSWER: ${idealAnswer || explanation}
STUDENT ANSWER: ${String(userAnswer)}
MAX SCORE: ${max} points
Respond in this exact format, keeping each item on its own line:
SCORE: [write ONLY the integer score here, e.g. 7]
FEEDBACK: [write 2-3 sentences of feedback here]
Start your response with SCORE:`;
    let lastError: string | null = null;
    for (const model of MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_AI_STUDIO_KEY}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 400, temperature: 0.1 },
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.candidates?.length) {
          const msg = data.error?.message || "No candidates";
          console.warn(`[quiz-grade] ${model} failed: ${msg}`);
          if (
            msg.toLowerCase().includes("quota") ||
            msg.toLowerCase().includes("rate limit") ||
            res.status === 429
          ) {
            lastError = `Rate limit on ${model}`;
            continue;
          }
          throw new Error(msg);
        }
        const raw: string =
          data.candidates[0].content?.parts?.[0]?.text?.trim() || "";

        const scoreMatch = raw.match(/SCORE:\s*(\d+)/i);
        const score = scoreMatch
          ? Math.max(0, Math.min(max, parseInt(scoreMatch[1], 10)))
          : 0;
        const feedbackMatch = raw.match(/FEEDBACK:\s*([\s\S]+)/i);
        const feedback = feedbackMatch
          ? feedbackMatch[1].trim()
          : raw.replace(/SCORE:\s*\d+/i, "").trim() ||
          "Your answer has been evaluated.";

        return NextResponse.json({
          score,
          isCorrect: score >= passing,
          feedback,
          keyPointsMissed: [],
          strongPoints: [],
          maxScore: max,
        });
      } catch (err: any) {
        console.error(`[quiz-grade] ${model} error:`, err.message);
        lastError = err.message;
        if (
          err.message?.toLowerCase().includes("quota") ||
          err.message?.toLowerCase().includes("rate limit")
        ) {
          continue;
        }
        break;
      }
    }
    return NextResponse.json(
      { error: lastError || "All grading models failed" },
      { status: 500 },
    );
  } catch (e: any) {
    console.error("[quiz-grade] Global error:", e);
    return NextResponse.json(
      { error: e.message || "Grading failed" },
      { status: 500 },
    );
  }
}
