"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { useActivityTracker } from "@/hooks/useActivityTracker";
type Tool = "grade" | "detect" | "humanize";
interface GradeResult {
  score: number;
  grammarFeedback: string;
  argumentFeedback: string;
  rubricFeedback: string;
  strengths: string[];
  improvements: string[];
  languageToolErrors: number;
}
interface DetectResult {
  probability: number;
  verdict: string;
  confidence: string;
  evidence: string[];
  humanSignals: string;
  aiSignals: string;
  summary: string;
}
interface HumanizeResult {
  humanized: string;
  detectionScore: number;
  detectionVerdict: string;
  remainingSignals: string;
  passesRun?: string;
}
function getScoreColor(score: number) {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  return "#f43f5e";
}
function getHumanColor(aiScore: number) {
  if (aiScore <= 25) return "#10b981";
  if (aiScore <= 55) return "#f59e0b";
  return "#f43f5e";
}
async function callTool(
  action: Tool,
  payload: Record<string, string>,
): Promise<any> {
  const res = await fetch("/api/essay-tools", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Request failed");
  return data;
}
const TOOLS: {
  id: Tool;
  icon: string;
  label: string;
  desc: string;
  color: string;
}[] = [
    {
      id: "grade",
      icon: "📝",
      label: "Essay Grader",
      desc: "Multi-layer feedback: grammar, logic & rubric",
      color: "var(--brand-violet)",
    },
    {
      id: "detect",
      icon: "📝",
      label: "AI Detector",
      desc: "Detect if text was written by AI",
      color: "var(--brand-cyan)",
    },
    {
      id: "humanize",
      icon: "📝",
      label: "AI Humanizer",
      desc: "Convert AI text to undetectable human writing",
      color: "#10b981",
    },
  ];
const LAYER_INFO = [
  {
    key: "grammarFeedback",
    label: "Grammar & Style",
    icon: "📝",
    color: "var(--brand-cyan)",
  },
  {
    key: "argumentFeedback",
    label: "Logic & Argument",
    icon: "🧠",
    color: "var(--brand-violet)",
  },
  {
    key: "rubricFeedback",
    label: "Rubric Fit",
    icon: "📋",
    color: "#10b981",
  },
];
export default function EssayToolsPage() {
  const [activeTool, setActiveTool] = useState<Tool>("grade");
  const [text, setText] = useState("");
  const [rubric, setRubric] = useState("");
  const [loading, setLoading] = useState(false);
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [detectResult, setDetectResult] = useState<DetectResult | null>(null);
  const [humanizeResult, setHumanizeResult] = useState<HumanizeResult | null>(
    null,
  );
  const [gradeLayer, setGradeLayer] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  useActivityTracker();
  const tool = TOOLS.find((t) => t.id === activeTool)!;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  async function handleRun() {
    if (text.length < 50) {
      toast.error("Please enter at least 50 characters");
      return;
    }
    setLoading(true);
    try {
      if (activeTool === "grade") {
        const r = await callTool("grade", { essay: text, rubric });
        setGradeResult(r);
        toast.success("Essay graded!");
      } else if (activeTool === "detect") {
        const r = await callTool("detect", { text });
        setDetectResult(r);
        toast.success("AI detection complete!");
      } else if (activeTool === "humanize") {
        toast(
          "Humanizing + running AI check on output... this may take 15-20s",
          { icon: "â³" },
        );
        const r = await callTool("humanize", { text });
        setHumanizeResult(r);
        toast.success("Humanized! Check your AI score below.");
      }
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    }
    setLoading(false);
  }
  return (
    <div className="page-container" style={{ padding: "16px 24px", minHeight: "100vh" }}>
      { }
      <div className="page-container" style={{ marginBottom: 20 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          ✍️ AI Writing Tools
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          3 specialized agents: Grade essays, Detect AI content, Humanize AI
          text
        </p>
      </div>
      { }
      <div className="page-container" style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
        gap: 10,
        marginBottom: 18,
      }}
      >
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTool(t.id)}
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              border: `1px solid ${activeTool === t.id ? t.color + "80" : "var(--border-subtle)"}`,
              background:
                activeTool === t.id ? t.color + "14" : "rgba(255,255,255,0.02)",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "Inter",
              transition: "all 0.2s",
            }}
          >
            <div className="page-container" style={{ fontSize: 20, marginBottom: 4 }}>{t.icon}</div>
            <div className="page-container" style={{
              fontSize: 13,
              fontWeight: 700,
              color: activeTool === t.id ? t.color : "var(--text-primary)",
              marginBottom: 2,
            }}
            >
              {t.label}
            </div>
            <div className="page-container" style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {t.desc}
            </div>
          </button>
        ))}
      </div>
      { }
      <div className="page-container" style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: 16,
        alignItems: "start",
      }}
      >
        { }
        <div className="page-container" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {activeTool === "grade" && (
            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  display: "block",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                📋 Grading Rubric (optional)
              </label>
              <textarea
                className="input-field"
                placeholder="Paste your professor's rubric here..."
                value={rubric}
                onChange={(e) => setRubric(e.target.value)}
                rows={3}
                style={{ resize: "vertical" }}
              />
            </div>
          )}

          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {activeTool === "grade"
                ? "📝 Your Essay"
                : activeTool === "humanize"
                  ? "🤖 AI Text to Humanize"
                  : "📄 Text to Analyze"}
            </label>
            <textarea
              className="input-field"
              placeholder={
                activeTool === "grade"
                  ? "Paste your essay here..."
                  : activeTool === "humanize"
                    ? "Paste the AI-generated text you want to make sound human..."
                    : "Paste text to check if it was written by AI..."
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={14}
              style={{ resize: "vertical" }}
            />
          </div>
          <div className="page-container" style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
          >
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {wordCount} words • {text.length} chars
            </span>
            <button
              onClick={handleRun}
              disabled={loading || text.length < 50}
              className="btn-primary"
              style={{ padding: "11px 28px", fontSize: 14 }}
            >
              {loading
                ? `⏳ ${activeTool === "humanize" ? "Humanizing + checking..." : "Processing..."}`
                : `${tool.icon} Run ${tool.label}`}
            </button>
          </div>
        </div>
        { }
        <div>
          <AnimatePresence mode="wait">
            { }
            {activeTool === "grade" && gradeResult && (
              <motion.div
                key="grade"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                <div
                  className="glass-card"
                  style={{ padding: 24, textAlign: "center" }}
                >
                  <div className="page-container" style={{
                    fontSize: 60,
                    fontWeight: 900,
                    color: getScoreColor(gradeResult.score),
                  }}
                  >
                    {gradeResult.score}
                  </div>
                  <div className="page-container" style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    out of 100
                  </div>
                  <div
                    className="progress-bar"
                    style={{ marginTop: 10, height: 8 }}
                  >
                    <motion.div
                      className="progress-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${gradeResult.score}%` }}
                      transition={{ duration: 1 }}
                      style={{ background: getScoreColor(gradeResult.score) }}
                    />
                  </div>
                </div>
                <div className="page-container" style={{
                  display: "flex",
                  gap: 6,
                  background: "rgba(255,255,255,0.04)",
                  padding: 4,
                  borderRadius: 12,
                }}
                >
                  {LAYER_INFO.map((l, i) => (
                    <button
                      key={i}
                      onClick={() => setGradeLayer(i)}
                      style={{
                        flex: 1,
                        padding: "8px 4px",
                        borderRadius: 8,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 11,
                        fontWeight: 600,
                        fontFamily: "Inter",
                        background: gradeLayer === i ? l.color : "transparent",
                        color: gradeLayer === i ? "white" : "var(--text-muted)",
                        transition: "all 0.2s",
                      }}
                    >
                      {l.icon} {l.label}
                    </button>
                  ))}
                </div>
                <div
                  className="glass-card"
                  style={{ padding: 18, minHeight: 90 }}
                >
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      lineHeight: 1.7,
                      margin: 0,
                    }}
                  >
                    {
                      gradeResult[
                      LAYER_INFO[gradeLayer].key as keyof GradeResult
                      ] as string
                    }
                  </p>
                </div>
                <div className="page-container" style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 10,
                }}
                >
                  <div className="glass-card" style={{ padding: 14 }}>
                    <div className="page-container" style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#10b981",
                      marginBottom: 8,
                    }}
                    >
                      ✅ Strengths
                    </div>
                    {gradeResult.strengths.map((s, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          marginBottom: 5,
                          paddingLeft: 12,
                          position: "relative",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            left: 0,
                            color: "#10b981",
                          }}
                        >
                          â€¢
                        </span>
                        {s}
                      </div>
                    ))}
                  </div>
                  <div className="glass-card" style={{ padding: 14 }}>
                    <div className="page-container" style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#f59e0b",
                      marginBottom: 8,
                    }}
                    >
                      💡 Improvements
                    </div>
                    {gradeResult.improvements.map((s, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          marginBottom: 5,
                          paddingLeft: 12,
                          position: "relative",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            left: 0,
                            color: "#f59e0b",
                          }}
                        >
                          •
                        </span>
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            { }
            {activeTool === "detect" && detectResult && (
              <motion.div
                key="detect"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                <div
                  className="glass-card"
                  style={{ padding: 24, textAlign: "center" }}
                >
                  <div className="page-container" style={{
                    fontSize: 60,
                    fontWeight: 900,
                    color: getScoreColor(100 - detectResult.probability),
                  }}
                  >
                    {detectResult.probability}%
                  </div>
                  <div className="page-container" style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginBottom: 8,
                  }}
                  >
                    AI probability
                  </div>
                  <div className="page-container" style={{
                    display: "inline-block",
                    padding: "5px 16px",
                    borderRadius: 99,
                    background:
                      getScoreColor(100 - detectResult.probability) + "22",
                    color: getScoreColor(100 - detectResult.probability),
                    fontWeight: 700,
                    fontSize: 13,
                    marginBottom: 4,
                  }}
                  >
                    {detectResult.verdict}
                  </div>
                  <div className="page-container" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Confidence: {detectResult.confidence}
                  </div>
                  <div
                    className="progress-bar"
                    style={{ marginTop: 10, height: 8 }}
                  >
                    <motion.div
                      className="progress-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${detectResult.probability}%` }}
                      transition={{ duration: 1 }}
                      style={{
                        background: getScoreColor(
                          100 - detectResult.probability,
                        ),
                      }}
                    />
                  </div>
                </div>
                { }
                <div className="glass-card" style={{ padding: 16 }}>
                  <div className="page-container" style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                    marginBottom: 8,
                  }}
                  >
                    📋 Summary
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      lineHeight: 1.7,
                      margin: 0,
                    }}
                  >
                    {detectResult.summary}
                  </p>
                </div>
                { }
                <div className="page-container" style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 10,
                }}
                >
                  <div className="glass-card" style={{ padding: 14 }}>
                    <div className="page-container" style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#10b981",
                      marginBottom: 8,
                    }}
                    >
                      🧑 Human Signals
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        margin: 0,
                        lineHeight: 1.6,
                      }}
                    >
                      {detectResult.humanSignals}
                    </p>
                  </div>
                  <div className="glass-card" style={{ padding: 14 }}>
                    <div className="page-container" style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#f43f5e",
                      marginBottom: 8,
                    }}
                    >
                      🤖 AI Signals
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        margin: 0,
                        lineHeight: 1.6,
                      }}
                    >
                      {detectResult.aiSignals}
                    </p>
                  </div>
                </div>
                { }
                {detectResult.evidence.length > 0 && (
                  <div className="glass-card" style={{ padding: 14 }}>
                    <div className="page-container" style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--brand-cyan)",
                      marginBottom: 10,
                    }}
                    >
                      🔬 Specific Evidence
                    </div>
                    {detectResult.evidence.map((e, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          marginBottom: 8,
                          paddingLeft: 14,
                          position: "relative",
                          lineHeight: 1.6,
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            left: 0,
                            color: "var(--brand-cyan)",
                            fontWeight: 700,
                          }}
                        >
                          {i + 1}.
                        </span>
                        {e}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
            { }
            {activeTool === "humanize" && humanizeResult && (
              <motion.div
                key="humanize"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                { }
                <div
                  className="glass-card"
                  style={{
                    padding: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div className="page-container" style={{ textAlign: "center", flexShrink: 0 }}>
                    <div className="page-container" style={{
                      fontSize: 42,
                      fontWeight: 900,
                      color: getHumanColor(humanizeResult.detectionScore),
                    }}
                    >
                      {humanizeResult.detectionScore}%
                    </div>
                    <div className="page-container" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      AI score after
                    </div>
                  </div>
                  <div className="page-container" style={{ flex: 1 }}>
                    <div className="page-container" style={{
                      display: "inline-block",
                      padding: "4px 12px",
                      borderRadius: 99,
                      background:
                        getHumanColor(humanizeResult.detectionScore) + "22",
                      color: getHumanColor(humanizeResult.detectionScore),
                      fontWeight: 700,
                      fontSize: 12,
                      marginBottom: 6,
                    }}
                    >
                      {humanizeResult.detectionVerdict}
                    </div>
                    <div className="progress-bar" style={{ height: 6 }}>
                      <motion.div
                        className="progress-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${humanizeResult.detectionScore}%` }}
                        transition={{ duration: 1 }}
                        style={{
                          background: getHumanColor(
                            humanizeResult.detectionScore,
                          ),
                        }}
                      />
                    </div>
                    {humanizeResult.remainingSignals &&
                      humanizeResult.remainingSignals !== "None detected" && (
                        <div className="page-container" style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          marginTop: 6,
                        }}
                        >
                          âš ï¸ Remaining: {humanizeResult.remainingSignals}
                        </div>
                      )}
                    {humanizeResult.remainingSignals === "None detected" && (
                      <div className="page-container" style={{ fontSize: 11, color: "#10b981", marginTop: 6 }}
                      >
                        ✅ No remaining AI patterns detected
                      </div>
                    )}
                    {humanizeResult.passesRun && (
                      <div className="page-container" style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginTop: 4,
                      }}
                      >
                        {humanizeResult.passesRun}
                      </div>
                    )}
                  </div>
                </div>
                { }
                <div className="page-container" style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
                >
                  <span
                    style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}
                  >
                    ✅ Humanized Output
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(humanizeResult.humanized);
                      toast.success("Copied!");
                    }}
                    style={{
                      fontSize: 12,
                      padding: "6px 14px",
                      borderRadius: 8,
                      border: "1px solid var(--border-subtle)",
                      background: "rgba(255,255,255,0.05)",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      fontFamily: "Inter",
                    }}
                  >
                    📋 Copy
                  </button>
                </div>
                <div
                  className="glass-card"
                  style={{ padding: 20, maxHeight: 380, overflowY: "auto" }}
                >
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      lineHeight: 1.8,
                      margin: 0,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {humanizeResult.humanized}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setText(humanizeResult.humanized);
                    toast("Loaded into input â€” run AI Detector to verify", {
                      icon: "📝",
                    });
                  }}
                  style={{
                    fontSize: 12,
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "1px solid var(--border-subtle)",
                    background: "rgba(16,185,129,0.08)",
                    color: "#10b981",
                    cursor: "pointer",
                    fontFamily: "Inter",
                    fontWeight: 600,
                  }}
                >
                  â†™ï¸ Load into input (run Detector tab for deeper analysis)
                </button>
              </motion.div>
            )}
            { }
            {((activeTool === "grade" && !gradeResult) ||
              (activeTool === "detect" && !detectResult) ||
              (activeTool === "humanize" && !humanizeResult)) && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 360,
                    color: "var(--text-muted)",
                    textAlign: "center",
                  }}
                >
                  <div className="page-container" style={{ fontSize: 52, marginBottom: 12 }}>
                    {tool.icon}
                  </div>
                  <div className="page-container" style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                    marginBottom: 6,
                  }}
                  >
                    {tool.label}
                  </div>
                  <div className="page-container" style={{ fontSize: 13, maxWidth: 240 }}>{tool.desc}</div>
                  <div className="page-container" style={{ marginTop: 10, fontSize: 12 }}>
                    Paste text on the left and click Run
                  </div>
                </motion.div>
              )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

