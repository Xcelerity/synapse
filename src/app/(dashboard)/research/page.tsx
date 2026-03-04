"use client";
import { useState } from "react";
import { researchAssistant } from "@/lib/ai";
import { motion } from "motion/react";
import toast from "react-hot-toast";
import { useActivityTracker } from "@/hooks/useActivityTracker";
const EXAMPLE_TOPICS = [
  "The impact of social media on adolescent mental health",
  "Climate change mitigation through carbon capture technology",
  "The ethical implications of AI in healthcare decision-making",
  "The economic causes of the 2008 financial crisis",
];
export default function ResearchPage() {
  const [thesis, setThesis] = useState("");
  const [context, setContext] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  useActivityTracker();
  async function runResearch() {
    if (!thesis.trim()) {
      toast.error("Enter a thesis or research question first");
      return;
    }
    setLoading(true);
    setResult("");
    try {
      const res = await researchAssistant(thesis, context);
      setResult(res);
      toast.success("🔬 Research plan generated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Research agent failed");
    }
    setLoading(false);
  }
  return (
    <div style={{ padding: "32px 40px", maxWidth: 1000 }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          🔬 Research Assistant Agent
        </h1>
        <p
          style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 32 }}
        >
          Type a thesis statement and the AI will generate a comprehensive
          research roadmap: search terms, key authors, sources, and paper
          structure.
        </p>
      </motion.div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: 8,
              }}
            >
              📌 Thesis / Research Question *
            </label>
            <textarea
              className="input-field"
              placeholder='e.g. "Social media algorithms contribute to political polarization by creating echo chambers..."'
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
              rows={5}
              style={{ resize: "vertical" }}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: 8,
              }}
            >
              🏫 Additional Context (optional)
            </label>
            <textarea
              className="input-field"
              placeholder="Course name, academic level, specific angle you want to explore..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
              style={{ resize: "vertical" }}
            />
          </div>
          <button
            onClick={runResearch}
            disabled={loading || !thesis.trim()}
            className="btn-primary"
            style={{ padding: "12px", justifyContent: "center" }}
          >
            {loading ? "⏳ Researching..." : "🔬 Generate Research Plan"}
          </button>
          <div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 8,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Try These Examples
            </div>
            {EXAMPLE_TOPICS.map((t) => (
              <button
                key={t}
                onClick={() => setThesis(t)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  marginBottom: 6,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  color: "var(--text-secondary)",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "Inter",
                  lineHeight: 1.4,
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(124,58,237,0.06)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "rgba(124,58,237,0.3)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(255,255,255,0.02)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "var(--border-subtle)";
                }}
              >
                &quot;{t}&quot;
              </button>
            ))}
          </div>
        </div>
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              Research Plan
            </h2>
            {result && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(result);
                  toast.success("Copied!");
                }}
                className="btn-ghost"
                style={{ fontSize: 12 }}
              >
                📋 Copy
              </button>
            )}
          </div>
          {loading ? (
            <div className="glass-card" style={{ padding: 24 }}>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {[100, 80, 90, 70, 85, 75, 95].map((w, i) => (
                  <div
                    key={i}
                    className="shimmer"
                    style={{ height: 18, borderRadius: 6, width: `${w}%` }}
                  />
                ))}
              </div>
            </div>
          ) : result ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card"
              style={{ padding: 24, maxHeight: 600, overflowY: "auto" }}
            >
              <pre
                style={{
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  lineHeight: 1.8,
                  whiteSpace: "pre-wrap",
                  fontFamily: "Inter",
                }}
              >
                {result}
              </pre>
            </motion.div>
          ) : (
            <div
              className="glass-card"
              style={{
                padding: 48,
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔬</div>
              <p style={{ fontSize: 14 }}>
                Enter a thesis statement to generate your research roadmap
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
