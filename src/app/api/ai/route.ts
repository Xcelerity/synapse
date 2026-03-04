import { NextRequest, NextResponse } from "next/server";
const GOOGLE_AI_STUDIO_KEY = process.env.GOOGLE_AI_STUDIO_KEY || "";
const MODELS = [
    "gemini-2.5-flash-lite", // Has 0/20 RPD usage
    "gemini-3-flash",        // Has 16/20 RPD usage
    "gemini-2.5-flash",      // Exceeded
    "gemini-2.0-flash",
    "gemini-1.5-flash"
];
export async function POST(req: NextRequest) {
    if (!GOOGLE_AI_STUDIO_KEY) {
        return NextResponse.json(
            { error: "GOOGLE_AI_STUDIO_KEY missing" },
            { status: 500 },
        );
    }
    try {
        const { messages, temperature = 0.7, max_tokens = 4000 } = await req.json();
        const systemMsg =
            messages.find((m: any) => m.role === "system")?.content || "";
        const lastMessage = messages[messages.length - 1]?.content || "";
        const isJSONRequest =
            lastMessage.toLowerCase().includes("json") ||
            lastMessage.toLowerCase().includes("array") ||
            systemMsg.toLowerCase().includes("json");
        const userMessages = messages.filter((m: any) => m.role !== "system");
        let promptLogic = "";
        if (isJSONRequest) {
            promptLogic = `[UTILITY MODE]\nCRITICAL: You are a JSON generator. Return ONLY raw JSON. No markdown backticks or explanations.\n${systemMsg ? `Instructions: ${systemMsg}\n\n` : ""}`;
        } else if (systemMsg) {
            promptLogic = `[ACADEMIC PERSONA: ${systemMsg}]\nCRITICAL: Respond directly as your persona.\n- NO meta-talk.\n- NO markdown bolding (**text**). Use headers.\n- Provide academic depth.\n\n`;
        }
        const contents = userMessages.map((m: any, idx: number) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: (idx === 0 ? promptLogic : "") + m.content }],
        }));
        const body: any = {
            contents,
            ...(!isJSONRequest && { tools: [{ googleSearch: {} }] }),
            generationConfig: {
                maxOutputTokens: max_tokens,
                temperature: isJSONRequest ? 0.1 : temperature,
                ...(isJSONRequest && { responseMimeType: "application/json" }),
            },
        };
        let lastError = null;
        for (const model of MODELS) {
            try {

                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_AI_STUDIO_KEY}`;
                const res = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
                const data = await res.json();
                if (!res.ok || !data.candidates || data.candidates.length === 0) {
                    const msg =
                        data.error?.message || data.message || "No candidates found";
                    console.warn(`[AI] ${model} failed: ${msg}`);
                    const isFatal =
                        msg.toLowerCase().includes("invalid key") ||
                        msg.toLowerCase().includes("api key");
                    if (!isFatal) {
                        lastError = msg;
                        continue;
                    }
                    throw new Error(msg);
                }
                let text =
                    data.candidates[0].content?.parts?.[0]?.text || "No text content";
                if (isJSONRequest) {
                    text = text
                        .replace(/```json\n?/g, "")
                        .replace(/```\n?/g, "")
                        .trim();
                } else {
                    text = text.replace(/\*\*/g, "");
                }

                return NextResponse.json({
                    id: `gemini-${Date.now()}`,
                    object: "chat.completion",
                    created: Math.floor(Date.now() / 1000),
                    model: model,
                    choices: [
                        {
                            index: 0,
                            message: { role: "assistant", content: text },
                            finish_reason: "stop",
                        },
                    ],
                    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                });
            } catch (err: any) {
                console.error(`[AI] ${model} Error:`, err.message);
                lastError = err.message;
                const msg = err.message.toLowerCase();
                const shouldContinue =
                    msg.includes("quota") ||
                    msg.includes("rate limit") ||
                    msg.includes("not found") ||
                    msg.includes("404") ||
                    msg.includes("500") ||
                    msg.includes("503");
                if (shouldContinue) {
                    continue;
                }
                break;
            }
        }
        const isQuota =
            lastError?.toLowerCase().includes("quota") ||
            lastError?.toLowerCase().includes("rate limit");
        return NextResponse.json(
            {
                error: isQuota
                    ? "All AI models are busy (Rate Limit). Please wait a few seconds and try again."
                    : lastError,
            },
            { status: 500 },
        );
    } catch (e: any) {
        console.error(`[AI] Global Error:`, e);
        return NextResponse.json(
            { error: e.message || "AI Fail" },
            { status: 500 },
        );
    }
}
