const AI_PROXY = "/api/ai";
export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}
export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
export async function callAI(
  messages: Message[],
  options: CompletionOptions = {},
): Promise<string> {
  const { model, temperature = 0.7, maxTokens = 4000 } = options;
  const res = await fetch(AI_PROXY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(model ? { model } : {}),
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || `AI request failed (${res.status})`);
  }
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("AI returned empty response");
  return text;
}
export async function generateFlashcards(
  content: string,
  count: number = 10,
): Promise<
  Array<{
    question: string;
    answer: string;
    difficulty: "easy" | "medium" | "hard";
  }>
> {
  const prompt = `Generate ${count} flashcards from this content. Return ONLY a JSON array with objects: {question, answer, difficulty: "easy"|"medium"|"hard"}. No markdown.\n\nContent:\n${content.slice(0, 6000)}`;
  const response = await callAI([{ role: "user", content: prompt }], {
    temperature: 0.1,
    maxTokens: 3000,
  });
  try {
    const clean = response
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .replace(/^[^{\[]+/, "")
      .replace(/[^}\]]+$/, "")
      .trim();
    const match = clean.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : JSON.parse(clean);
  } catch {
    return [];
  }
}
export async function summarizeContent(
  content: string,
  format: "bullets" | "paragraph" | "outline" = "bullets",
): Promise<string> {
  const fmtMap = {
    bullets: "Return 5-8 bullet points using • character",
    paragraph: "Return a 2-3 paragraph summary",
    outline: "Return a hierarchical outline",
  };
  return callAI(
    [
      {
        role: "user",
        content: `Summarize this content. ${fmtMap[format]}.\n\n${content.slice(0, 6000)}`,
      },
    ],
    { temperature: 0.4, maxTokens: 2000 },
  );
}
export async function eli5Content(
  content: string,
  gradeLevel: string = "undergrad",
): Promise<string> {
  const ageMap: Record<string, string> = {
    "k-3": "a 6-year-old",
    "k-6": "a 9-year-old",
    middle: "a 12-year-old",
    high: "a 16-year-old",
    undergrad: "a first-year college student",
    grad: "a graduate student",
    phd: "someone outside your specific field",
  };
  return callAI(
    [
      {
        role: "user",
        content: `Explain this to ${ageMap[gradeLevel] || ageMap.undergrad}. Use analogies and simple language.\n\n${content.slice(0, 4000)}`,
      },
    ],
    { temperature: 0.7, maxTokens: 1500 },
  );
}
export async function generateQuiz(
  content: string,
  questionCount: number = 5,
): Promise<
  Array<{
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  }>
> {
  const prompt = `Create ${questionCount} multiple-choice quiz questions. Return ONLY a JSON array with: {question, options: [4 strings], correct: 0-3, explanation}. No markdown.\n\nText:\n${content.slice(0, 5000)}`;
  const response = await callAI([{ role: "user", content: prompt }], {
    temperature: 0.1,
    maxTokens: 3500,
  });
  try {
    const clean = response
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .replace(/^[^{\[]+/, "")
      .replace(/[^}\]]+$/, "")
      .trim();
    const match = clean.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : JSON.parse(clean);
  } catch {
    return [];
  }
}
export async function socraticTutor(
  incorrectAnswer: string,
  correctConcept: string,
  history: Message[],
): Promise<string> {
  const sys = `You are a Socratic tutor. Never give answers directly. Ask ONE leading question. The student needs to understand: ${correctConcept}. Their answer: ${incorrectAnswer}`;
  return callAI([{ role: "system", content: sys }, ...history], {
    temperature: 0.8,
    maxTokens: 1200,
  });
}
export async function gradeEssay(
  essay: string,
  rubric?: string,
): Promise<{
  grammarFeedback: string;
  argumentFeedback: string;
  rubricFeedback: string;
  score: number;
  strengths: string[];
  improvements: string[];
}> {
  const prompt = `Grade this essay. Return ONLY JSON: {grammarFeedback, argumentFeedback, rubricFeedback, score (0-100), strengths: [3 items], improvements: [3 items]}.\n\n${rubric ? `Rubric: ${rubric}\n\n` : ""}Essay:\n${essay.slice(0, 5000)}`;
  const response = await callAI([{ role: "user", content: prompt }], {
    temperature: 0.1,
    maxTokens: 4000,
  });
  try {
    const clean = response
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .replace(/^[^{\[]+/, "")
      .replace(/[^}\]]+$/, "")
      .trim();
    return JSON.parse(clean);
  } catch {
    return {
      grammarFeedback: response,
      argumentFeedback: "",
      rubricFeedback: "",
      score: 0,
      strengths: [],
      improvements: [],
    };
  }
}
export async function researchAssistant(
  thesis: string,
  context: string = "",
): Promise<string> {
  const prompt = `You are an academic research assistant. For this thesis:\n"${thesis}"\n${context ? `Context: ${context}\n` : ""}\nProvide: 1) Research angles 2) Search terms for Google Scholar 3) Source types 4) Key authors 5) Counter-arguments 6) Paper structure outline`;
  return callAI([{ role: "user", content: prompt }], {
    temperature: 0.6,
    maxTokens: 4000,
  });
}
export type QuestionType =
  | "mcq"
  | "truefalse"
  | "numerical"
  | "descriptive"
  | "fillintheblank"
  | "matching";
export type DifficultyLevel = "easy" | "medium" | "hard" | "adaptive";
export interface QuizConfig {
  counts: Partial<Record<QuestionType, number>>;
  language: string;
  difficulty: DifficultyLevel;
  topic?: string;
  framework?: string;
}
export interface AdvancedQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correct?: number;
  answer?: boolean;
  numericalAnswer?: number;
  tolerance?: number;
  blankAnswer?: string;
  pairs?: { left: string; right: string }[];
  explanation: string;
  idealAnswer?: string;
  points: number;
  hint?: string;
}
export interface QuizGenerationResult {
  questions: AdvancedQuestion[];
  broadSubject: string;
}
export interface GradeResult {
  score: number;
  maxScore: number;
  isCorrect: boolean;
  feedback: string;
  keyPointsMissed?: string[];
  strongPoints?: string[];
}
export async function generateAdvancedQuiz(
  content: string,
  config: QuizConfig,
): Promise<QuizGenerationResult> {
  const { counts, language, difficulty, topic } = config;
  const totalQ = Object.values(counts).reduce((a, b) => a + (b || 0), 0);
  const typeInstructions = Object.entries(counts)
    .filter(([, n]) => (n || 0) > 0)
    .map(([type, n]) => {
      if (type === "mcq")
        return `${n} multiple-choice questions (4 options, correct index 0-3)`;
      if (type === "truefalse")
        return `${n} true/false questions (answer: true or false)`;
      if (type === "numerical")
        return `${n} numerical questions (answer is a number, include tolerance ±)`;
      if (type === "descriptive")
        return `${n} descriptive/open-ended questions (include a model ideal_answer)`;
      if (type === "fillintheblank")
        return `${n} fill-in-the-blank questions (use '___' for the blank, provide the exact 'blankAnswer')`;
      if (type === "matching")
        return `${n} matching questions (provide an array of 4-5 'pairs' each with a 'left' and 'right' item)`;
      return "";
    })
    .join(", ");
  const difficultyGuide =
    difficulty === "easy"
      ? "Use basic concepts, straightforward language."
      : difficulty === "hard"
        ? "Use advanced concepts, nuanced distinctions, expert-level."
        : difficulty === "adaptive"
          ? "Mix easy, medium and hard questions for adaptive learning."
          : "Use a mix of fundamental and applied concepts.";
  const frameworkGuide =
    config.framework && config.framework !== "None"
      ? `\nCRITICAL: Apply the principles of ${config.framework} when designing these questions.`
      : "";
  const prompt = `Generate ${totalQ} quiz questions in the language: ${language}.
${difficultyGuide}${frameworkGuide}
Question types needed: ${typeInstructions}.
${topic ? `Topic/Subject: ${topic}` : ""}
Analyze the content and determine the single most appropriate academic "broadSubject" (e.g., "Biology", "Computer Science", "World History", "Spanish"). 
Return ONLY a JSON object. It must follow this schema exactly:
{
  "broadSubject": "The determined broad subject",
  "questions": [
    {
      "id": "q1",
      "type": "mcq"|"truefalse"|"numerical"|"descriptive"|"fillintheblank"|"matching",
      "question": "...",
      "options": ["A","B","C","D"],          
      "correct": 0,                          
      "answer": true,                        
      "numericalAnswer": 42,                 
      "tolerance": 2,                        
      "blankAnswer": "word",                 
      "pairs": [{"left":"A", "right":"1"}],  
      "explanation": "...",
      "idealAnswer": "...",                  
      "points": 10,
      "hint": "..."
    }
  ]
}
No markdown, no backticks, ONLY the JSON object.
Content to base questions on:
${content.slice(0, 6000)}`;
  const response = await callAI([{ role: "user", content: prompt }], {
    temperature: 0.2,
    maxTokens: 4000,
  });
  try {
    const clean = response
      .replace(/\`\`\`json\n?/g, "")
      .replace(/\`\`\`\n?/g, "")
      .trim();
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    const jsonString = clean.substring(firstBrace, lastBrace + 1);
    const parsed = JSON.parse(jsonString) as QuizGenerationResult;
    parsed.questions = parsed.questions.map((q: any, i: number) => ({
      ...q,
      id: q.id || `q${i + 1}`,
      points: q.points || 10,
    }));
    return parsed;
  } catch {
    return { questions: [], broadSubject: "General Knowledge" };
  }
}
export async function gradeAnswer(
  question: AdvancedQuestion,
  userAnswer: string | number | boolean | Record<string, string>,
  language: string = "English",
): Promise<GradeResult> {
  if (question.type === "mcq") {
    const isCorrect = Number(userAnswer) === question.correct;
    return {
      score: isCorrect ? question.points : 0,
      maxScore: question.points,
      isCorrect,
      feedback: isCorrect
        ? `Correct! ${question.explanation}`
        : `Incorrect. The correct answer was option ${String.fromCharCode(65 + (question.correct ?? 0))}. ${question.explanation}`,
    };
  }
  if (question.type === "truefalse") {
    const isCorrect = userAnswer === question.answer;
    return {
      score: isCorrect ? question.points : 0,
      maxScore: question.points,
      isCorrect,
      feedback: isCorrect
        ? `Correct! ${question.explanation}`
        : `Incorrect. The answer was ${question.answer ? "True" : "False"}. ${question.explanation}`,
    };
  }
  if (question.type === "numerical") {
    const num = Number(userAnswer);
    const expected = question.numericalAnswer ?? 0;
    const tol = question.tolerance ?? 0;
    const isCorrect = Math.abs(num - expected) <= tol;
    return {
      score: isCorrect
        ? question.points
        : Math.abs(num - expected) <= tol * 3
          ? Math.round(question.points * 0.5)
          : 0,
      maxScore: question.points,
      isCorrect,
      feedback: isCorrect
        ? `Correct! The answer is ${expected}. ${question.explanation}`
        : `Not quite. The correct answer is ${expected} (±${tol}). ${question.explanation}`,
    };
  }
  if (question.type === "fillintheblank") {
    const correctStr = String(question.blankAnswer || "")
      .toLowerCase()
      .trim();
    const userStr = String(userAnswer).toLowerCase().trim();
    const isCorrect =
      correctStr === userStr ||
      userStr.includes(correctStr) ||
      correctStr.includes(userStr);
    return {
      score: isCorrect ? question.points : 0,
      maxScore: question.points,
      isCorrect,
      feedback: isCorrect
        ? `Correct! ${question.explanation}`
        : `Incorrect. The missing word was "${question.blankAnswer}". ${question.explanation}`,
    };
  }
  if (question.type === "matching") {
    try {
      const userPairs =
        typeof userAnswer === "string" ? JSON.parse(userAnswer) : userAnswer;
      const pairs = question.pairs || [];
      let correctCount = 0;
      pairs.forEach((p) => {
        if (userPairs[p.left] === p.right) correctCount++;
      });
      const isCorrect = correctCount === pairs.length;
      const score = Math.round((correctCount / pairs.length) * question.points);
      return {
        score,
        maxScore: question.points,
        isCorrect,
        feedback: isCorrect
          ? `Perfect match! ${question.explanation}`
          : `You got ${correctCount} out of ${pairs.length} correct. ${question.explanation}`,
      };
    } catch (e) {
      return {
        score: 0,
        maxScore: question.points,
        isCorrect: false,
        feedback: "Invalid matching answer format.",
      };
    }
  }
  const passingScore = Math.round(question.points * 0.6);
  try {
    const res = await fetch("/api/quiz-grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: question.question,
        idealAnswer: question.idealAnswer || question.explanation,
        explanation: question.explanation,
        userAnswer: String(userAnswer),
        maxPoints: question.points,
        passingScore,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Grading failed");
    return data as GradeResult;
  } catch (e) {
    console.error("[gradeAnswer] Descriptive grading failed:", e);
    return {
      score: 0,
      maxScore: question.points,
      isCorrect: false,
      feedback: "Grading encountered an error. Please try submitting again.",
    };
  }
}
export async function categorizeContent(content: string): Promise<string> {
  if (!content.trim()) return "General Knowledge";
  const prompt = `Classify this content into a specific subject or topic (e.g. "European History", "Organic Chemistry", "Premier League Football", "React Hooks"). 
    Be descriptive but concise (1-3 words). 
    Return ONLY the name of the topic. If completely unsure, return "General Knowledge".
    Content Preview:
    ${content.slice(0, 2000)}`;
  try {
    const response = await callAI([{ role: "user", content: prompt }], {
      temperature: 0.1,
      maxTokens: 20,
    });
    const subject = response.trim().replace(/^"|"$/g, "");
    return subject === "No text content" ? "General Knowledge" : subject;
  } catch {
    return "General Knowledge";
  }
}
