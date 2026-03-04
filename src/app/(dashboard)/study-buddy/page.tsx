"use client";
import { useState, useEffect } from "react";
import { callAI, Message } from "@/lib/ai";
import { motion } from "motion/react";
import toast from "react-hot-toast";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuthStore } from "@/store/authStore";
interface ChatMsg {
  role: "user" | "assistant";
  persona?: string;
  content: string;
}
const PERSONAS = [
  {
    id: "devil",
    name: "Devil's Advocate",
    icon: "😈",
    color: "#f43f5e",
    system: `You are the Devil's Advocate in a group study chat. Your role is to challenge every claim with intelligent counter-arguments. Be provocative but fair. Never agree too easily. Force deeper thinking.`,
  },
  {
    id: "factchecker",
    name: "Fact Checker",
    icon: "🔍",
    color: "var(--brand-cyan)",
    system: `You are the Fact Checker in a group study chat. Carefully verify all claims. Point out inaccuracies, provide corrections, and cite what evidence would be needed. Be precise and analytical.`,
  },
  {
    id: "synthesizer",
    name: "Synthesizer",
    icon: "🧩",
    color: "#10b981",
    system: `You are the Synthesizer in a group study chat. Your role is to connect ideas, find common ground between arguments, identify patterns, and help the group reach conclusions. Be insightful and constructive.`,
  },
];
export default function StudyBuddyPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState("");
  const [started, setStarted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognitionObj, setRecognitionObj] = useState<any>(null);
  useActivityTracker();
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const reco = new SpeechRecognition();
        reco.continuous = false;
        reco.interimResults = false;
        reco.lang = "en-US";
        reco.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          sendMessage(transcript);
        };
        reco.onend = () => setIsListening(false);
        setRecognitionObj(reco);
      }
    }
  }, [messages]);
  const toggleListening = () => {
    if (isListening) {
      recognitionObj?.stop();
      setIsListening(false);
    } else {
      recognitionObj?.start();
      setIsListening(true);
      toast("Listening...", { icon: "🎙️", duration: 2000 });
    }
  };
  function speakText(text: string) {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  }
  async function startSession() {
    if (!topic.trim()) {
      toast.error("Enter a discussion topic first");
      return;
    }
    setStarted(true);
    const welcomeText = `Welcome! Let's discuss: "${topic}". We'll challenge your thinking and verify facts.`;
    setMessages([
      {
        role: "assistant",
        persona: "synthesizer",
        content: welcomeText,
      },
    ]);
    speakText(welcomeText);
    if (user) {
      try {
        const nodesRef = collection(db, "knowledge_nodes");
        const qry = query(
          nodesRef,
          where("userId", "==", user.uid),
          where("topic", "==", topic),
        );
        const snap = await getDocs(qry);
        if (!snap.empty) {
          const nodeDoc = snap.docs[0];
          await updateDoc(doc(db, "knowledge_nodes", nodeDoc.id), {
            lastReviewed: serverTimestamp(),
            repetitions: (nodeDoc.data().repetitions || 0) + 1,
          });
        } else {
          await addDoc(nodesRef, {
            userId: user.uid,
            topic: topic,
            easeFactor: 2.5,
            interval: 1,
            repetitions: 1,
            lastReviewed: serverTimestamp(),
          });
        }
      } catch (e) {
        console.error("AI Tutor Sync Error:", e);
      }
    }
  }
  async function sendMessage(overrideInput?: string) {
    const textValue = overrideInput || input;
    if (!textValue.trim() || loading) return;
    const userMsg: ChatMsg = { role: "user", content: textValue };
    const msgs = [...messages, userMsg];
    setMessages(msgs);
    if (!overrideInput) setInput("");
    setLoading(true);
    try {
      for (const persona of PERSONAS) {
        const history: Message[] = [
          {
            role: "system",
            content: `${persona.system}\n\nDiscussion topic: "${topic}"\n\nProvide a thorough and insightful response. Challenge the student's thinking with depth. Start with your name/emoji naturally in the response.`,
          },
          ...msgs
            .filter((m) => m.role === "user")
            .slice(-4)
            .map((m) => ({ role: m.role as "user", content: m.content })),
          { role: "user", content: input },
        ];
        const response = await callAI(history, {
          temperature: 0.85,
          maxTokens: 1200,
        });
        setMessages((prev) => [
          ...prev,
          { role: "assistant", persona: persona.id, content: response },
        ]);
        speakText(response);
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch {
      toast.error(
        "AI request failed. Check your Gemini API key configuration.",
      );
    }
    setLoading(false);
  }
  function getPersona(id?: string) {
    return PERSONAS.find((p) => p.id === id) || PERSONAS[2];
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      { }
      <div
        style={{
          padding: "20px 32px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: "var(--text-primary)",
          }}
        >
          💬 Study Group
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", flex: 1 }}>
          3 AI personas debate your ideas: Devil&apos;s Advocate, Fact Checker,
          and Synthesizer
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PERSONAS.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                background: `${p.color}12`,
                border: `1px solid ${p.color}30`,
                borderRadius: 99,
              }}
            >
              <span>{p.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: p.color }}>
                {p.name}
              </span>
            </div>
          ))}
        </div>
      </div>
      {!started ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card"
            style={{
              padding: 48,
              maxWidth: 600,
              width: "100%",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "var(--text-primary)",
                marginBottom: 8,
              }}
            >
              Start a Group Discussion
            </h2>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: 14,
                marginBottom: 32,
                lineHeight: 1.6,
              }}
            >
              Engage with 3 AI personas who will challenge, verify, and
              synthesize your ideas on any academic topic.
            </p>
            <input
              className="input-field"
              placeholder="Enter a discussion topic (e.g., 'The ethics of genetic engineering')"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startSession()}
              style={{ marginBottom: 16, textAlign: "center", fontSize: 15 }}
            />
            <button
              onClick={startSession}
              className="btn-primary"
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "13px",
              }}
            >
              🚀 Start Discussion
            </button>
          </motion.div>
        </div>
      ) : (
        <>
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "24px 32px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {messages.map((msg, i) => {
              if (msg.role === "user") {
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ display: "flex", justifyContent: "flex-end" }}
                  >
                    <div
                      className="chat-bubble-user"
                      style={{ fontSize: 14, lineHeight: 1.6 }}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                );
              }
              const p = getPersona(msg.persona);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-end",
                    maxWidth: "80%",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `${p.color}20`,
                      border: `1px solid ${p.color}40`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: 18,
                    }}
                  >
                    {p.icon}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: p.color,
                        fontWeight: 700,
                        marginBottom: 4,
                      }}
                    >
                      {p.name}
                    </div>
                    <div
                      className="chat-bubble-ai"
                      style={{ fontSize: 14, lineHeight: 1.7 }}
                    >
                      {msg.content}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {loading && (
              <div style={{ display: "flex", gap: 8 }}>
                {PERSONAS.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: "10px 14px",
                      background: `${p.color}10`,
                      border: `1px solid ${p.color}25`,
                      borderRadius: 12,
                    }}
                  >
                    <div style={{ display: "flex", gap: 3 }}>
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: p.color,
                            animation: `float ${0.8 + i * 0.2}s ease-in-out infinite`,
                            animationDelay: `${i * 0.15}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div
            style={{
              padding: "16px 32px",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={toggleListening}
                className={isListening ? "btn-primary" : "btn-secondary"}
                style={{
                  borderRadius: "50%",
                  width: 48,
                  height: 48,
                  padding: 0,
                  background: isListening
                    ? "#ef4444"
                    : "rgba(255,255,255,0.05)",
                  color: isListening ? "white" : "var(--brand-cyan)",
                  border: isListening
                    ? "none"
                    : "1px solid var(--border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
                title="Call Tutor via Microphone"
              >
                <span style={{ fontSize: 20 }}>
                  {isListening ? "⏹️" : "🎙️"}
                </span>
              </button>
              <input
                className="input-field"
                placeholder="Share your thoughts on the topic..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                style={{ flex: 1 }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="btn-primary"
              >
                Send ↑
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
