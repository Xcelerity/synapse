import { NextRequest, NextResponse } from "next/server";
export const maxDuration = 120;
const GOOGLE_AI_STUDIO_KEY = process.env.GOOGLE_AI_STUDIO_KEY || "";
const LANGUAGE_TOOL_KEY = process.env.LANGUAGE_TOOL_KEY || "";
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-latest",
  "gemini-3-flash-preview",
];
async function callGemini(prompt: string, maxTokens = 1200): Promise<string> {
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_AI_STUDIO_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
          }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.candidates?.length) {
        const msg = data.error?.message || "No candidates";
        if (msg.toLowerCase().includes("quota") || res.status === 429) continue;
        throw new Error(msg);
      }
      return (
        (data.candidates[0].content?.parts || [])
          .map((p: any) => p.text || "")
          .join("")
          .trim() || ""
      );
    } catch (e: any) {
      if (e.message?.toLowerCase().includes("quota")) continue;
      throw e;
    }
  }
  throw new Error(
    "All Gemini models rate-limited. Try again in a few seconds.",
  );
}
function extract(raw: string, key: string): string {
  const lines = raw.split(/\r?\n/);
  let capturing = false;
  const collected: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim().replace(/\*\*/g, "");
    const keyPattern = `${key}:`;
    if (trimmed.startsWith(keyPattern)) {
      capturing = true;
      const val = trimmed.slice(keyPattern.length).trim();
      if (val) collected.push(val);
    } else if (capturing) {
      if (/^[A-Z][A-Z0-9_]{1,}:/.test(trimmed)) break;
      if (trimmed) collected.push(trimmed);
    }
  }
  return collected.join(" ").replace(/\s+/g, " ").trim();
}
async function runEssayGrader(essay: string, rubric: string) {
  const [ltResult, geminiRaw] = await Promise.all([
    (async () => {
      try {
        const body = new URLSearchParams({ text: essay, language: "en-US" });
        if (LANGUAGE_TOOL_KEY) body.append("apiKey", LANGUAGE_TOOL_KEY);
        const res = await fetch("https://api.languagetool.org/v2/check", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });
        if (!res.ok) throw new Error("LT failed");
        const data = await res.json();
        const matches = data.matches || [];
        const topIssues: string[] = matches.slice(0, 5).map((m: any) => {
          const ctx = m.context?.text || "";
          const word = ctx.substring(
            m.context.offset,
            m.context.offset + m.context.length,
          );
          return `"${word}" — ${m.message}`;
        });
        return { errorCount: matches.length as number, topIssues };
      } catch {
        return { errorCount: -1, topIssues: [] };
      }
    })(),
    callGemini(
      `You are a professional academic essay grader. Grade this essay carefully.
RUBRIC: ${rubric || "Standard academic rubric: argument clarity, evidence, structure, originality, style."}
ESSAY:
${essay}
Reply in this EXACT labeled format. Each value starts immediately after the colon:
SCORE: [integer 0-100]
ARGUMENT: [2-3 sentences assessing logical structure, thesis strength, and evidence quality]
RUBRIC_FEEDBACK: [2-3 sentences on how well the essay meets the rubric criteria]
STRENGTH_1: [one specific strength in the essay]
STRENGTH_2: [another specific strength]
STRENGTH_3: [another specific strength]
IMPROVEMENT_1: [one concrete, actionable improvement]
IMPROVEMENT_2: [another actionable improvement]
IMPROVEMENT_3: [another actionable improvement]`,
      1000,
    ),
  ]);
  let grammarFeedback: string;
  if (ltResult.errorCount === -1) {
    grammarFeedback =
      "Grammar check unavailable (LanguageTool API unreachable). Manual review recommended.";
  } else if (ltResult.errorCount === 0) {
    grammarFeedback =
      "LanguageTool found no grammar or spelling issues. Writing mechanics are excellent.";
  } else {
    grammarFeedback = `LanguageTool detected ${ltResult.errorCount} grammar/style issue${ltResult.errorCount !== 1 ? "s" : ""}.${ltResult.topIssues.length ? " Examples: " + ltResult.topIssues.join("; ") + "." : ""}`;
  }
  const score = parseInt(extract(geminiRaw, "SCORE") || "70", 10);
  return {
    score: Math.max(0, Math.min(100, score)),
    grammarFeedback,
    argumentFeedback: extract(geminiRaw, "ARGUMENT") || "Analysis unavailable.",
    rubricFeedback:
      extract(geminiRaw, "RUBRIC_FEEDBACK") || "Rubric feedback unavailable.",
    strengths: ["STRENGTH_1", "STRENGTH_2", "STRENGTH_3"]
      .map((k) => extract(geminiRaw, k))
      .filter(Boolean),
    improvements: ["IMPROVEMENT_1", "IMPROVEMENT_2", "IMPROVEMENT_3"]
      .map((k) => extract(geminiRaw, k))
      .filter(Boolean),
    languageToolErrors: ltResult.errorCount,
  };
}
async function runAIDetector(text: string) {
  const raw = await callGemini(
    `You are an expert AI content detection analyst. Analyze the following text and identify whether it was written by a human or an AI model.
Carefully look for these AI writing fingerprints:
- UNIFORMITY: sentences that are all similar in length and structure (AI flaw)
- TRANSITIONS: overuse of "Furthermore", "Moreover", "Additionally", "In conclusion", "It is important to note", "It is worth noting", "Consequently", "Subsequently"
- HEDGING: "it can be argued", "one might say", "it is possible that", "it should be noted"
- FLAGGED AI WORDS: delve, tapestry, vibrant, multifaceted, nuanced, comprehensive, intricate, pivotal, paramount, harness, groundbreaking, embark, underscore
- PERFECT GRAMMAR with no contractions, no fragments, no natural human irregularities
- TRIPLETS: listing ideas exactly three at a time, consistently
- EM-DASHES used as connectors instead of simple punctuation
- SYMMETRIC ARGUMENTS: perfectly balanced "on one hand... on the other hand" every time
- GENERIC OPENERS: "In today's world", "In recent years", "Throughout history"
- CORPORATE JARGON: "utilize", "leverage", "facilitate", "implement", "optimize" instead of simple words
- FORMULAIC ENDINGS: always ending with a summary or moral lesson
TEXT TO ANALYZE:
${text}
Respond in this EXACT labeled format. Be specific and quote actual phrases from the text as evidence:
AI_PROBABILITY: [integer 0-100, where 100 = definitely AI]
VERDICT: [exactly one of: Likely Human-Written | Possibly AI-Assisted | Likely AI-Generated | Almost Certainly AI-Generated]
CONFIDENCE: [exactly one of: Low | Medium | High]
EVIDENCE_1: [quote a specific phrase from the text and explain why it signals AI or human authorship]
EVIDENCE_2: [another specific phrase with explanation]
EVIDENCE_3: [another specific phrase with explanation]
HUMAN_SIGNALS: [list specific human-like elements found in the text, or write "None detected" if absent]
AI_SIGNALS: [list specific AI-like patterns found, quoting phrases, or write "None detected" if absent]
SUMMARY: [2 clear sentences summarizing your verdict with specific reasoning from the text]`,
    900,
  );
  const prob = Math.max(
    0,
    Math.min(100, parseInt(extract(raw, "AI_PROBABILITY") || "50", 10)),
  );
  return {
    probability: prob,
    verdict: extract(raw, "VERDICT") || "Inconclusive",
    confidence: extract(raw, "CONFIDENCE") || "Medium",
    evidence: ["EVIDENCE_1", "EVIDENCE_2", "EVIDENCE_3"]
      .map((k) => extract(raw, k))
      .filter(Boolean),
    humanSignals: extract(raw, "HUMAN_SIGNALS") || "Analysis unavailable.",
    aiSignals: extract(raw, "AI_SIGNALS") || "Analysis unavailable.",
    summary: extract(raw, "SUMMARY") || "Unable to generate summary.",
  };
}
async function runHumanizer(text: string) {
  const HUMANIZER_PROMPT = `You are an elite text humanizer. Your job is to rewrite AI-generated text so it passes any AI detection tool while preserving the original quality and intent.
CRITICAL — TONE MATCHING:
First, assess the formality of the original text. If it is an academic essay, formal report, or educational piece, your output MUST stay formal and precise. Do NOT make it casual, slangy, or informal. Humanizing does NOT mean dumbing down — it means making it sound like a real person wrote it, not a robot. The vocabulary level, subject-matter depth, and professional tone must all be preserved.
CRITICAL — EVADING SELF-DETECTION (GEMINI BIAS):
You are an LLM (Gemini). The tool that will grade your output is ALSO Gemini. This means you must explicitly avoid your own default linguistic fingerprints. Gemini heavily favors:
1. Symmetrical paragraph lengths
2. The "claim -> example -> mini-conclusion" micro-structure inside paragraphs
3. Overly polite, sterile, or diplomatically hedged language ("it is possible that", "it is worth considering")
4. Explaining every point fully instead of leaving some things unsaid
To beat your own detector, you MUST break these habits violently. Make the text slightly messy, asymmetrical, and opinionated (if the original allows it) so your own architecture doesn't recognize itself.
═══════════════════════════════════════════════
 SECTION 1 — ABSOLUTELY FORBIDDEN (never use)
═══════════════════════════════════════════════
FORBIDDEN TRANSITION WORDS (replace with natural connectors or restructure):
Furthermore, Moreover, Additionally, In addition, Consequently, Subsequently, Nevertheless, Nonetheless, Thus, Hence, Thereby, Therein, Henceforth, In conclusion, In summary, To summarize, To conclude, As previously mentioned, As mentioned above, It is important to note, It is worth noting, It should be noted, Notably, It goes without saying, Needless to say, It is crucial to understand, Last but not least, First and foremost, In light of, In terms of, With respect to, With regard to, In the context of
FORBIDDEN CLICHÉ PHRASES:
Revolutionize the way, Game-changing, Cutting-edge, Unlock the potential, Unleash the power, Significant milestone, Unparalleled excellence, State-of-the-art, Stands the test of time, In today's world, In today's fast-paced world, In recent years, In the modern era, In the digital age, Throughout history, At the end of the day, When all is said and done, The fact of the matter is, It cannot be overstated, I cannot emphasize enough, At its core, In its entirety, In the grand scheme of things, Moving forward, Going forward, A testament to
FORBIDDEN AI VOCABULARY (use simple everyday words instead):
- delve → explore, look into, dig into
- tapestry → mix, blend, combination
- vibrant → lively, active, busy
- multifaceted → complex, layered, many-sided
- nuanced → subtle, complicated
- comprehensive → thorough, complete, full
- intricate → complex, detailed
- pivotal → key, critical, major
- paramount → most important, top priority
- harness → use, tap into, draw on
- groundbreaking → new, original, first-of-its-kind
- embark → start, begin, set out
- underscore → show, highlight, reveal
- elucidate → explain, clarify
- facilitate → help, make easier, enable
- leverage → use, apply
- utilize → use
- implement → use, put in place, apply
- optimize → improve, refine, tune
- streamline → simplify, speed up
- commence → start, begin
- endeavor → try, effort, attempt
- methodology → method, approach
- paradigm → model, pattern, framework
FORBIDDEN PUNCTUATION:
- Em-dashes used as connectors (—): replace with a period, comma, or parentheses
- Excessive hyphens forming compound modifiers in every sentence
═══════════════════════════════════════════════
 SECTION 2 — SENTENCE STRUCTURE RULES
═══════════════════════════════════════════════
SENTENCE LENGTH VARIATION (most important rule for passing detection):
- Mix SHORT sentences (under 8 words) with LONG ones (over 25 words) throughout
- Never write more than 2 consecutive sentences of similar length
- Use single-sentence paragraphs occasionally for punch
- Use sentence fragments on purpose for emphasis. Like this.
SENTENCE STARTERS:
- Regularly start sentences with: And, But, So, Yet, Still, Though, Because, Since
- Vary how sentences start: some with nouns, some with verbs, some with time words, some with conditions
- Never start more than 2 sentences in a row the same way
VOICE AND GRAMMAR:
- Use contractions everywhere that sounds natural: don't, it's, they're, you'll, we've, I'd, that's, isn't, can't, won't
- Use active voice. Passive voice is an AI red flag.
- Vary between long and short clauses within sentences
- Include one intentional comma splice if it sounds natural (humans do this)
═══════════════════════════════════════════════
 SECTION 3 — STRUCTURAL RULES
═══════════════════════════════════════════════
PARAGRAPH STRUCTURE:
- Destroy any symmetric or perfectly equal paragraph structure
- Make paragraphs deliberately uneven: one might be 1 sentence, another might be 7
- Don't follow the academic pattern: claim → evidence → analysis → repeat
- Resist presenting every possible angle — real writing has a point of view and some bias
ARGUMENT STRUCTURE:
- No "on one hand... on the other hand" constructions
- No perfectly balanced pros and cons lists
- No exactly-three-examples pattern (triplets are a major AI tell)
- Never end with a formal summary paragraph unless it was in the original
- Never add a moral lesson, call to action, or "this shows us that" conclusion
═══════════════════════════════════════════════
 SECTION 4 — VOICE AND PERSONALITY RULES
═══════════════════════════════════════════════
ADD HUMAN TOUCHES (tone-appropriate — do not add slang to formal texts):
- Include one specific, concrete real-world detail that grounds the text
- Add one rhetorical question if the content and tone allow it
- Use parentheses for a natural aside (like this) when it fits
- Show slight uncertainty where appropriate for the register: in formal text use "appears to", "suggests", "likely"; in casual text use "I think", "probably"
- Write as someone who genuinely knows this topic, not someone reciting from a template
- Vary paragraph lengths to break any mechanical symmetry
- Occasionally move on without fully developing a point — this is human
═══════════════════════════════════════════════
 SECTION 5 — FINAL CHECKS
═══════════════════════════════════════════════
Before finishing, verify:
[ ] No forbidden transition words remain
[ ] No em-dashes used as connectors
[ ] Sentences vary dramatically in length
[ ] At least 3 contractions used
[ ] No flagged AI vocabulary words
[ ] No triplet patterns (listing in threes)
[ ] Paragraphs are uneven lengths
[ ] No symmetric "on one hand... on the other" structure
[ ] No corporate jargon (utilize/leverage/facilitate)
CRITICAL: Preserve every fact, claim, and piece of information from the original. Only the style changes.
Return ONLY the rewritten text. No labels, no commentary, no explanation.
═══════════════════════════════════════════════
ORIGINAL TEXT:
${text}`;
  async function detect(
    txt: string,
  ): Promise<{ prob: number; verdict: string; signals: string }> {
    const raw = await callGemini(
      `Analyze this text for AI generation. Respond ONLY in this exact labeled format:
AI_PROBABILITY: [single integer 0-100]
VERDICT: [write exactly one: Human / AI-Assisted / AI-Generated / Definitely-AI]
REMAINING_SIGNALS: [one sentence listing remaining AI patterns, or write: None detected]
TEXT:
${txt}`,
      200,
    );
    const prob = Math.max(
      0,
      Math.min(100, parseInt(extract(raw, "AI_PROBABILITY") || "60", 10)),
    );
    const rawV = extract(raw, "VERDICT") || "";
    const verdictMap: Record<string, string> = {
      human: "Likely Human-Written",
      "ai-assisted": "Possibly AI-Assisted",
      "ai-generated": "Likely AI-Generated",
      "definitely-ai": "Almost Certainly AI-Generated",
    };
    return {
      prob,
      verdict: verdictMap[rawV.toLowerCase()] || rawV || "Analyzed",
      signals: extract(raw, "REMAINING_SIGNALS") || "None detected",
    };
  }
  let humanized = await callGemini(HUMANIZER_PROMPT, 8192);
  humanized = humanized.replace(/ — /g, ", ").replace(/—/g, ", ");
  let best = { text: humanized, prob: 100, verdict: "Unknown", signals: "" };
  for (let pass = 1; pass <= 3; pass++) {
    const d = await detect(humanized);
    if (d.prob < best.prob)
      best = {
        text: humanized,
        prob: d.prob,
        verdict: d.verdict,
        signals: d.signals,
      };
    if (d.prob <= 30) break;
    if (pass < 3) {
      const fixPrompt = `You are refining a text to sound more human-written. A detection tool just analyzed it and found these remaining AI patterns:
"${d.signals}"
Rules for this revision:
- Fix ONLY the patterns mentioned above
- Do NOT use em-dashes (—) anywhere — replace with commas or short separate sentences
- No "Furthermore", "Moreover", "Additionally", "In conclusion"
- Vary sentence length more aggressively if uniformity was flagged
- Add one natural human observation or slight tangent if robotic structure was flagged  
- Use contractions if lack of contractions was flagged
- Keep all facts and preserve the overall formal/informal tone of the current text
- Return ONLY the revised text
CURRENT TEXT:
${humanized}`;
      humanized = await callGemini(fixPrompt, 8192);
      humanized = humanized.replace(/ — /g, ", ").replace(/—/g, ", ");
    }
  }
  return {
    humanized: best.text,
    detectionScore: best.prob,
    detectionVerdict: best.verdict,
    remainingSignals: best.signals || "None detected",
    passesRun:
      best.prob <= 30 ? "✅ Target reached" : "⚠️ Best achieved after 3 passes",
  };
}
export async function POST(req: NextRequest) {
  if (!GOOGLE_AI_STUDIO_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_AI_STUDIO_KEY missing" },
      { status: 500 },
    );
  }
  try {
    const { action, text, essay, rubric } = await req.json();
    switch (action) {
      case "grade":
        return NextResponse.json(
          await runEssayGrader(essay || text, rubric || ""),
        );
      case "detect":
        return NextResponse.json(await runAIDetector(text));
      case "humanize":
        return NextResponse.json(await runHumanizer(text));
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e: any) {
    console.error("[essay-tools]", e.message);
    return NextResponse.json(
      { error: e.message || "Processing failed" },
      { status: 500 },
    );
  }
}
