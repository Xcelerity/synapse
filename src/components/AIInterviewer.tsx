"use client";
import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { motion } from "motion/react";
interface AIInterviewerProps {
  topic: string;
  content: string;
  difficulty: string;
  code: string;
  canvasData: string | null;
  mode: "professional" | "casual";
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  onMessage: (msg: { role: "user" | "assistant"; content: string }) => void;
  onScribeUpdate: (text: string) => void;
}
export default function AIInterviewer({
  topic,
  content,
  difficulty,
  mode,
  code,
  canvasData,
  messages,
  onMessage,
  onScribeUpdate,
}: AIInterviewerProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const hasGreeted = useRef(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = "en-US";
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          handleUserInput(transcript);
        };
        recognitionRef.current.onend = () => setIsListening(false);
        recognitionRef.current.onerror = () => setIsListening(false);
      }
      synthRef.current = window.speechSynthesis;
    }
    if (!hasGreeted.current) {
      hasGreeted.current = true;
      setTimeout(() => {
        const greeting =
          mode === "professional"
            ? `Hello! I'm your AI interviewer today. We're going to dive into ${topic}. I can see your workspace is ready. Let's start with a brief overview of your background in this area.`
            : `Hey there! Let's have some fun and talk about ${topic}! I'm ready to quiz you. Ready to start?`;
        speakText(greeting);
      }, 1500);
    }
    return () => {
      if (synthRef.current) synthRef.current.cancel();
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);
  const speakText = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      startListening();
    };
    synthRef.current.speak(utterance);
    onMessage({ role: "assistant", content: text });
  };
  const startListening = () => {
    if (!recognitionRef.current) return;
    if (isListening || isSpeaking) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e: any) {
      if (e.name !== "InvalidStateError") {
        console.error("STT Start Error", e);
      }
    }
  };
  const handleUserInput = async (text: string) => {
    onMessage({ role: "user", content: text });
    setIsListening(false);
    try {
      const { orchestrateInterview } =
        await import("@/lib/agents/interviewOrchestrator");
      const historyString = messages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n") + `\nUSER: ${text}`;
      const state = {
        topic,
        difficulty,
        content,
        transcript: historyString,
        currentCode: code,
        canvasSummary: canvasData
          ? "User has scribbled on whiteboard"
          : "Whiteboard is empty",
        lastUserMessage: text,
      };
      const result = await orchestrateInterview(state);
      if (result.scribeNotes) {
        onScribeUpdate(result.scribeNotes);
      }
      speakText(result.verbalResponse);
    } catch (err) {
      console.error("Orchestration Error", err);
      speakText(
        "I'm sorry, I encountered an internal error. Could you repeat your last point?",
      );
    }
  };
  const stopAndSubmit = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        { }
        <div
          style={{
            width: 240,
            height: 240,
            borderRadius: "50%",
            background: isSpeaking
              ? "radial-gradient(circle, #8b5cf6 0%, transparent 70%)"
              : isListening
                ? "radial-gradient(circle, #06b6d4 0%, transparent 70%)"
                : "radial-gradient(circle, #333 0%, transparent 70%)",
            filter: "blur(40px)",
            opacity: 0.6,
            position: "absolute",
            transition: "all 0.5s ease",
          }}
        />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          <motion.div
            key={isSpeaking ? "speaking" : isListening ? "listening" : "standby"}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <img
              src={isListening ? "/student.png" : "/interviewer.png"}
              alt="Interviewer"
              style={{
                width: 180,
                height: 180,
                objectFit: "contain",
                borderRadius: "20px",
                filter:
                  !isSpeaking && !isListening ? "grayscale(0.5)" : "none",
                opacity: !isSpeaking && !isListening ? 0.7 : 1,
                border: isSpeaking
                  ? "4px solid var(--brand-violet)"
                  : isListening
                    ? "4px solid #06b6d4"
                    : "4px solid transparent",
                transition: "all 0.3s ease",
              }}
            />
          </motion.div>
          <div
            style={{
              marginTop: 24,
              fontSize: 12,
              fontWeight: 800,
              color: isSpeaking
                ? "var(--brand-violet-light)"
                : isListening
                  ? "#06b6d4"
                  : "#555",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {isSpeaking
              ? "Interviewer Speaking..."
              : isListening
                ? "Listening to You..."
                : "Interviewer Ready"}
          </div>
        </div>
      </div>
      { }
      <div
        style={{
          padding: 20,
          borderTop: "1px solid #333",
          background: "#050505",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <button
          onClick={() => {
            if (isListening) {
              stopAndSubmit();
            } else {
              startListening();
            }
          }}
          className="btn-primary"
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 800,
            background: isListening ? "#f43f5e" : "var(--brand-violet)",
            boxShadow: isListening ? "0 0 20px rgba(244,63,94,0.3)" : "none",
          }}
        >
          {isListening ? "⏹️ Stop & Send Answer" : "🎙️ Start Speaking"}
        </button>
        {isListening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              textAlign: "center",
            }}
          >
            Click button when finished speaking to submit.
          </motion.div>
        )}
      </div>
    </div>
  );
}
