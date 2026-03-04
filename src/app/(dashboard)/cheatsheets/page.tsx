"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";
import CheatsheetTemplate, {
  CheatsheetData,
} from "@/components/CheatsheetTemplate";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import dynamic from "next/dynamic";
type InputTab = "text" | "image" | "pdf" | "docx" | "youtube";
export default function CheatsheetsPage() {
  const { user } = useAuthStore();
  const [phase, setPhase] = useState<"setup" | "view">("setup");
  const [inputTab, setInputTab] = useState<InputTab>("text");
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [cheatsheetData, setCheatsheetData] = useState<CheatsheetData | null>(
    null,
  );
  const cheatsheetRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  async function handleGenerate() {
    if (!topic.trim() && !content.trim()) {
      return toast.error("Please provide a topic or source content.");
    }
    setGenerating(true);
    toast.loading("Analyzing content and designing...", { id: "cheat" });
    try {
      const systemPrompt = `You are a world-class academic educator and graphic designer. Your task is to extract material and return a STRICT JSON object representing a HIGHLY DETAILED, SUPER IN-DEPTH, multi-page capable cheatsheet.
CRITICAL INSTRUCTIONS:
1. Do NOT summarize too briefly. Your cheatsheet MUST BE COMPREHENSIVE and extremely deep.
2. If only a topic is provided, cover as many advanced concepts, sub-topics, frameworks, and edge-cases as possible. Be an expert.
3. If source text/files are provided, extract EVERY SINGLE important point. Leave no stone unturned.
4. You must generate a unified layout using 'contentBlocks'. Produce 6-10 deep rules, exactly 1 highly detailed Mermaid diagram, and 1 extensive comparison table. All interleaved logically in the 'contentBlocks' array. This ensures the output fits within strict API limits without truncating.
5. The main title MUST strictly follow the exact format: "[Topic Name]: Cheatsheet". Do not invent other creative title structures!
6. For every 'rule' block, you must select an aesthetic 'shape' constraint: "square", "rounded", "pill", or "outline". This produces diverse aesthetic shapes.
7. SECURITY/SYNTAX: Ensure ALL strings are properly escaped. You MUST finish generating the entire JSON object completely. Do not truncate.
8. MERMAID SYNTAX: You MUST wrap all node text in double quotes to prevent syntax crashes. Example: A["This is a complex node"] --> B["Another Node"]
Return ONLY valid JSON with this exact schema:
{
  "title": "String (Strictly '[Topic]: Cheatsheet')",
  "subtitle": "String (short description)",
  "colorTheme": "blue" | "red" | "green" | "purple" | "orange",
  "heroConcept": { "title": "String", "explanation": "String (in-depth overview)" },
  "contentBlocks": [
    {
      "type": "rule" | "diagram" | "table",
      "title": "String (Header for this block)",
      "content": "String (detailed point, ONLY for 'rule' type)",
      "icon": "emoji string (ONLY for 'rule' type)",
      "shape": "square" | "rounded" | "pill" | "outline",
      "mermaidCode": "String (valid Mermaid.js graph code, ONLY for 'diagram' type)",
      "tableData": { "headers": ["A", "B"], "rows": [["val A", "val B"]] }
    }
  ],
  "warningOrTip": "String (Crucial takeaway or common pitfall)"
}`;
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Topic: ${topic}\n\nContent: ${content}` },
          ],
          temperature: 0.2,
          max_tokens: 8000,
        }),
      });
      if (!res.ok) throw new Error("API Error");
      const data = await res.json();
      const textResponse = data.choices?.[0]?.message?.content || "";
      const cleaned = textResponse
        .replace(/^```json/g, "")
        .replace(/```$/g, "")
        .trim();
      const parsed: CheatsheetData = JSON.parse(cleaned);
      setCheatsheetData(parsed);
      setPhase("view");
      toast.success("Cheatsheet generated!", { id: "cheat" });
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to generate designer cheatsheet. Please try again.", {
        id: "cheat",
      });
    } finally {
      setGenerating(false);
    }
  }
  async function handleDownloadPDF() {
    if (!cheatsheetRef.current) return;
    toast.loading("Rendering high-quality PDF...", { id: "pdf" });
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = cheatsheetRef.current;
      const opt = {
        margin: 0,
        filename: `${cheatsheetData?.title || "Cheatsheet"}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      };
      await html2pdf().set(opt).from(element).save();
      toast.success("Downloaded!", { id: "pdf" });
    } catch (e) {
      console.error("PDF Error:", e);
      toast.error("Failed to generate PDF.", { id: "pdf" });
    }
  }
  return (
    <div className="page-container" style={{ padding: isMobile ? "16px 20px" : "32px 40px", maxWidth: 1200, margin: "0 auto" }}>
      {phase === "setup" ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="page-container" style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8, color: "var(--text-primary)" }}>
              🎨 Cheatsheets
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 16 }}>
              Turn any topic, text, or file into a beautiful, multi-page vector cheatsheet.
            </p>
          </div>
          <div className="glass-card" style={{ padding: 32 }}>
            <div className="page-container" style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                What do you want to learn?
              </label>
              <input
                className="input-field"
                style={{ fontSize: 16, padding: "14px 16px" }}
                placeholder="e.g. React Hooks, Organic Chemistry Reactions, French Grammar..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div className="page-container" style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  marginBottom: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Source Material (Optional)
              </label>
              <div className="page-container" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {(["text", "image", "pdf", "youtube"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setInputTab(tab)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "Inter",
                      background:
                        inputTab === tab
                          ? "var(--gradient-brand)"
                          : "rgba(255,255,255,0.05)",
                      color: inputTab === tab ? "white" : "var(--text-muted)",
                    }}
                  >
                    {tab === "text" && "📝 Type / Paste"}
                    {tab === "image" && "🖼️ Image"}
                    {tab === "pdf" && "📄 PDF"}
                    {tab === "youtube" && "📹 YouTube"}
                  </button>
                ))}
              </div>
              {inputTab === "text" && (
                <div className="page-container" style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <textarea
                    className="input-field"
                    style={{ height: 150, resize: "vertical" }}
                    placeholder="Paste your notes, essay, or syllabus here... or use voice dictation!"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                  <VoiceDictationButton
                    onResult={(text) =>
                      setContent((prev) => (prev ? prev + " " + text : text))
                    }
                  />
                </div>
              )}
              {inputTab !== "text" && (
                <div className="page-container" style={{
                  border: "2px dashed var(--border-subtle)",
                  borderRadius: 12,
                  padding: 40,
                  textAlign: "center",
                }}
                >
                  <div className="page-container" style={{ fontSize: 32, marginBottom: 12 }}>📝</div>
                  <div className="page-container" style={{ fontSize: 14, color: "var(--text-muted)" }}>
                    This tab is under construction. Please use Text input for
                    now!
                  </div>
                </div>
              )}
            </div>
            <div className="page-container" style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 32,
            }}
            >
              <button
                className="btn-primary"
                onClick={handleGenerate}
                disabled={generating}
                style={{ padding: "14px 32px", fontSize: 16 }}
              >
                {generating
                  ? "✨ Synthesizing Cheatsheet..."
                  : "🎨 Auto-Synthesize Cheatsheet"}
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="page-container" style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
          >
            <button onClick={() => setPhase("setup")} className="btn-ghost">
              â† Back to Editor
            </button>
            <button
              onClick={handleDownloadPDF}
              className="btn-primary"
              style={{ display: "flex", gap: 8, alignItems: "center" }}
            >
              <span>📥</span> Download PDF
            </button>
          </div>
          { }
          <div className="page-container" style={{
            background: "#e2e8f0",
            padding: 40,
            borderRadius: 16,
            overflowX: "auto",
          }}
          >
            <div
              ref={cheatsheetRef}
              style={{
                width: "210mm",
                minHeight: "297mm",
                background: "white",
                margin: "0 auto",
                boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
              }}
            >
              {cheatsheetData && <CheatsheetTemplate data={cheatsheetData} />}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

