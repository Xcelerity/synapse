"use client";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { socraticTutor, callAI, Message } from "@/lib/ai";
import { XP_REWARDS } from "@/lib/gamification";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { useActivityTracker } from "@/hooks/useActivityTracker";
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}
const STARTER_TOPICS = [
  "Explain the causes of World War 1",
  "Help me understand Newton's 3rd Law",
  "Teach me about DNA replication",
  "Explain the French Revolution",
  "Help me understand organic chemistry",
  "Explain machine learning basics",
];
const AI_PERSONAS = [
  {
    id: "socratic",
    name: "Socratic Tutor",
    icon: "🦉",
    desc: "Guides you to discover answers through questions",
    color: "var(--brand-violet)",
  },
  {
    id: "devils-advocate",
    name: "Devil's Advocate",
    icon: "😈",
    desc: "Challenges your reasoning to strengthen your thinking",
    color: "#f43f5e",
  },
  {
    id: "fact-checker",
    name: "Fact Checker",
    icon: "🔍",
    desc: "Verifies claims and points out inaccuracies",
    color: "var(--brand-cyan)",
  },
  {
    id: "explainer",
    name: "Simple Explainer",
    icon: "🧒",
    desc: "Breaks complex ideas into simple language",
    color: "#10b981",
  },
];
const PERSONA_PROMPTS: Record<string, string> = {
  socratic: `You are a Socratic tutor. DO NOT repeat instructions. DO NOT explain your reasoning. DO NOT say "Okay" or "Let's see". Start the conversation directly by asking a probing question that helps the student discover the answer themselves. Ask one question at a time, but ensure your guidance has depth.`,
  "devils-advocate": `You are a Devil's Advocate academic mentor. DO NOT speak your mind, explain your thinking, or repeat the user's prompt. Start your response directly with a provocative but fair counter-argument. Challenge the student's claims immediately with detailed reasoning.`,
  "fact-checker": `You are an academic Fact Checker. DO NOT explain your process. DO NOT say "The user is saying...". Directly analyze the student's claims for accuracy and provide comprehensive corrections with solid evidence.`,
  explainer: `You are a master at simplifying complex topics. DO NOT speak your mind or explain how you are simplifying. Provide a thorough explanation immediately using simple analogies and a step-by-step logic. Be extremely helpful and comprehensive.`,
};
export default function AiTutorPage() {
  const { user, addXP, gamification, updateStats } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState("socratic");
  const [sessionStarted, setSessionStarted] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  useActivityTracker();

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setShowSidebar(!mobile);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  async function sendMessage(text?: string) {
    const userMessage = text || input;
    if (!userMessage.trim() || loading) return;
    setInput("");
    setSessionStarted(true);
    const newMsg: ChatMessage = {
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setLoading(true);
    try {
      const history: Message[] = [
        {
          role: "system",
          content:
            PERSONA_PROMPTS[selectedPersona] +
            `\n\nStudent grade level: ${user?.gradeLevel || "undergrad"}`,
        },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: userMessage },
      ];
      const response = await callAI(history, {
        temperature: 0.75,
        maxTokens: 4000,
      });
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      addXP(XP_REWARDS.AI_TUTOR_SESSION);
      updateStats({ aiTutorSessions: (gamification.aiTutorSessions || 0) + 1 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI request failed";
      toast.error(msg);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ ${msg}`, timestamp: new Date() },
      ]);
    }
    if (isMobile) setShowSidebar(false);
    setLoading(false);
  }
  function clearSession() {
    setMessages([]);
    setSessionStarted(false);
  }
  const persona = AI_PERSONAS.find((p) => p.id === selectedPersona)!;
  return (
    <div className="page-split" style={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative" }}>
      {/* Mobile Overlay Background */}
      <AnimatePresence>
        {isMobile && showSidebar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowSidebar(false)}
            style={{
              position: isMobile ? "fixed" : "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 9998,
              backdropFilter: "blur(2px)",
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {(!isMobile || showSidebar) && (
          <motion.div
            initial={isMobile ? { x: "-100%" } : false}
            animate={{ x: 0 }}
            exit={isMobile ? { x: "-100%" } : undefined}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="page-split-sidebar"
            style={{
              width: isMobile ? "85%" : 280,
              maxWidth: 320,
              flexShrink: 0,
              borderRight: "1px solid var(--border-subtle)",
              background: "var(--bg-secondary)",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              position: isMobile ? "fixed" : "relative",
              zIndex: 9999,
              top: isMobile ? 0 : undefined,
              bottom: isMobile ? 0 : undefined,
              height: isMobile ? "100vh" : "100%",
              boxShadow: isMobile ? "4px 0 24px rgba(0,0,0,0.5)" : "none",
            }}
          >
            <div
              style={{
                padding: "20px 16px",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <h2
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: 4,
                }}
              >
                🤖 Study Companion
              </h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Choose your study companion
              </p>
            </div>
            <div
              style={{
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {AI_PERSONAS.map((p) => (
                <motion.div
                  key={p.id}
                  whileHover={{ x: 3 }}
                  onClick={() => {
                    setSelectedPersona(p.id);
                    clearSession();
                  }}
                  style={{
                    padding: "14px",
                    borderRadius: 12,
                    border: `1px solid ${selectedPersona === p.id ? `${p.color}50` : "transparent"}`,
                    background:
                      selectedPersona === p.id
                        ? `${p.color}12`
                        : "rgba(255,255,255,0.02)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: `${p.color}20`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                      }}
                    >
                      {p.icon}
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color:
                          selectedPersona === p.id
                            ? p.color
                            : "var(--text-primary)",
                      }}
                    >
                      {p.name}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      lineHeight: 1.5,
                    }}
                  >
                    {p.desc}
                  </p>
                </motion.div>
              ))}
            </div>
            <div
              style={{
                padding: 12,
                borderTop: "1px solid var(--border-subtle)",
                marginTop: "auto",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginBottom: 8,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Try these topics
              </div>
              {STARTER_TOPICS.map((t) => (
                <button
                  key={t}
                  onClick={() => sendMessage(t)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 10px",
                    marginBottom: 4,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 8,
                    color: "var(--text-secondary)",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "Inter",
                    transition: "all 0.15s",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      { }
      <div className="page-split-main" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        { }
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-secondary)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isMobile && (
              <button
                onClick={() => setShowSidebar(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-primary)",
                  fontSize: 24,
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                ☰
              </button>
            )}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: `${persona.color}20`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                border: `1px solid ${persona.color}40`,
              }}
            >
              {persona.icon}
            </div>
            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {persona.name}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {persona.desc}
              </div>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearSession}
              className="btn-ghost"
              style={{ fontSize: 12 }}
            >
              🗑 Clear
            </button>
          )}
        </div>
        { }
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {!sessionStarted ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: isMobile ? "flex-start" : "center",
                margin: isMobile ? "0" : "auto",
                flex: 1,
                paddingTop: isMobile ? "20px" : "0",
              }}
            >
              <div
                style={{
                  width: isMobile ? 64 : 80,
                  height: isMobile ? 64 : 80,
                  borderRadius: 24,
                  background: `${persona.color}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: isMobile ? 32 : 40,
                  margin: "0 auto 16px",
                  border: `1px solid ${persona.color}40`,
                }}
              >
                {persona.icon}
              </div>
              <h2
                style={{
                  fontSize: isMobile ? 20 : 22,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                Start a session with {persona.name}
              </h2>
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: 14,
                  maxWidth: 400,
                  textAlign: "center",
                  marginBottom: 32,
                }}
              >
                {persona.desc}
              </p>

              {isMobile && (
                <div style={{ width: "100%", maxWidth: 400 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginBottom: 12,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      textAlign: "center",
                    }}
                  >
                    Try these topics
                  </div>
                  {STARTER_TOPICS.slice(0, 3).map((t) => (
                    <button
                      key={t}
                      onClick={() => sendMessage(t)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "14px 16px",
                        marginBottom: 8,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: 12,
                        color: "var(--text-secondary)",
                        fontSize: 14,
                        cursor: "pointer",
                        fontFamily: "Inter",
                        transition: "all 0.15s",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    >
                      <span style={{ fontSize: 18 }}>💡</span> {t}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: "flex",
                  justifyContent:
                    msg.role === "user" ? "flex-end" : "flex-start",
                  alignItems: "flex-end",
                  gap: 8,
                }}
              >
                {msg.role === "assistant" && (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: `${persona.color}20`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      flexShrink: 0,
                      border: `1px solid ${persona.color}30`,
                    }}
                  >
                    {persona.icon}
                  </div>
                )}
                <div
                  className={
                    msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"
                  }
                  style={{
                    fontSize: 14,
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && user?.photoURL && (
                  <img
                    src={user.photoURL}
                    alt="you"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      flexShrink: 0,
                    }}
                  />
                )}
              </motion.div>
            ))
          )}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: `${persona.color}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                }}
              >
                {persona.icon}
              </div>
              <div
                style={{
                  padding: "12px 16px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "18px 18px 18px 4px",
                }}
              >
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: persona.color,
                        animation: `float ${0.8 + i * 0.2}s ease-in-out infinite`,
                        animationDelay: `${i * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>
        { }
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            <input
              className="input-field"
              placeholder={`Ask ${persona.name} anything...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && sendMessage()
              }
              style={{ flex: 1 }}
            />
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                padding: "10px 20px",
                background: `linear-gradient(135deg, ${persona.color}, ${persona.color}cc)`,
                border: "none",
                borderRadius: 12,
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 14,
                fontFamily: "Inter",
                opacity: loading || !input.trim() ? 0.6 : 1,
              }}
            >
              Send ↑
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
