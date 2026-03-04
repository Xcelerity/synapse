import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
interface InterviewState {
  topic: string;
  difficulty: string;
  content: string;
  transcript: string;
  currentCode: string;
  canvasSummary: string;
  lastUserMessage: string;
  mode?: "professional" | "casual";
}
export async function orchestrateInterview(state: InterviewState) {
  const analystPrompt = PromptTemplate.fromTemplate(`
        Analyze the full technical and conversational state of this interview:
        Topic: {topic}
        Transcript History: {transcript}
        Current Code: {currentCode}
        Canvas Activity: {canvasSummary}

        Objective: Provide a 1-sentence analytical summary of the user's conceptual or technical progress.
        Identify if they have answered previous questions correctly or if they are deviating.
    `);
  const scribePrompt = PromptTemplate.fromTemplate(`
        Transcript History: {transcript}
        Recent User Input: {lastUserMessage}

        Identify any evolving complex equations, specific values, or technical constraints that should be documented visually.
        Return ONLY the text to display in the Scribe Notes area. If nothing new or important, return "".
    `);
  const interviewerPrompt = PromptTemplate.fromTemplate(`
        Role: {role}
        Tone: {tone}
        Difficulty: {difficulty}
        Topic: {topic}
        Deep Context Analysis: {technicalContext}
        Full Transcript (Memory): {transcript}

        CRITICAL: Use the Full Transcript above to ensure you do not repeat yourself and that you build upon the user's previous answers.
        
        Objective: Drive the conversation forward based on the history. 
        - If the user answered a question (check history), acknowledge it and ask a logical follow-up.
        - If they are struggling with a specific point mentioned earlier, offer a Socratic hint.
        - Stay concise and focused on {topic}.
        Respond with the verbal response for the AI to speak.
    `);
  async function callAgent(prompt: string) {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }
  const [technicalContext, scribeNotes] = await Promise.all([
    callAgent(
      await analystPrompt.format({
        topic: state.topic,
        transcript: state.transcript,
        currentCode: state.currentCode,
        canvasSummary: state.canvasSummary,
      }),
    ),
    callAgent(
      await scribePrompt.format({
        transcript: state.transcript,
        lastUserMessage: state.lastUserMessage,
      }),
    ),
  ]);
  const verbalResponse = await callAgent(
    await interviewerPrompt.format({
      role:
        state.mode === "professional"
          ? "Expert Subject Interviewer"
          : "Encouraging Quiz Master",
      tone:
        state.mode === "professional"
          ? "Professional, deep, and logical"
          : "Casual, energetic, and supportive",
      difficulty: state.difficulty,
      topic: state.topic,
      technicalContext,
      transcript: state.transcript,
    }),
  );
  return {
    verbalResponse,
    scribeNotes: scribeNotes.length > 5 ? scribeNotes : null,
    technicalContext,
  };
}
export async function generateFinalReport(state: InterviewState) {
  const scorerPrompt = `
        Role: Senior Practice Interview Evaluator
        Topic: ${state.topic}
        Difficulty: ${state.difficulty}
        
        FULL INTERVIEW TRANSCRIPT:
        ${state.transcript}
        
        Final Artifacts:
        Code: ${state.currentCode}
        Canvas Activity: ${state.canvasSummary}

        TASK: Analyze the WHOLE transcript from start to finish. 
        Evaluate how successful the student was in answering questions and demonstrating mastery of ${state.topic}.
        
        TERMINOLOGY: Use Achievement scores (Success Percentage) and Mastery Levels. Do NOT mention hiring, jobs, or recruitment. This is an educational assessment.

        Provide a professional report in JSON format:
        {
            "score": number (0-100, representing Achievement/Success Percentage),
            "achievementLevel": "Mastery" | "Excellence" | "Proficient" | "Developing" | "Needs Review",
            "dimensions": {
                "conceptual": number,
                "technical": number,
                "communication": number,
                "logic": number
            },
            "strengths": string[],
            "growthAreas": string[],
            "summary": string (Evaluate the entire performance from the first question to the last)
        }
        Return ONLY the raw JSON.
    `;
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: "You are a JSON evaluator." },
        { role: "user", content: scorerPrompt },
      ],
      temperature: 0.3,
      isJSON: true,
    }),
  });
  const data = await res.json();
  let content = data.choices[0].message.content;
  try {
    if (content.includes("```json")) {
      content = content.split("```json")[1].split("```")[0].trim();
    } else if (content.includes("```")) {
      content = content.split("```")[1].split("```")[0].trim();
    }
    return JSON.parse(content);
  } catch (e) {
    console.error("JSON Parse Error", e, content);
    return {
      score: 0,
      verdict: "Error",
      dimensions: { conceptual: 0, technical: 0, communication: 0, logic: 0 },
      strengths: ["Internal AI processing error"],
      growthAreas: ["Retry the session"],
      summary:
        "I had trouble generating the report format. Please try again or check the transcript manually.",
    };
  }
}
