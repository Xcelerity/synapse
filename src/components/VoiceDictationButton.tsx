"use client";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
interface VoiceDictationButtonProps {
  onResult: (text: string) => void;
}
export default function VoiceDictationButton({
  onResult,
}: VoiceDictationButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (event: any) => {
          let finalTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + " ";
            }
          }
          if (finalTranscript) {
            onResult(finalTranscript);
          }
        };
        rec.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          if (event.error === "not-allowed") {
            toast.error("Microphone access denied.");
          }
          setIsListening(false);
        };
        rec.onend = () => {
          setIsListening(false);
        };
        setRecognition(rec);
      }
    }
  }, [onResult]);
  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!recognition) {
      toast.error(
        "Voice dictation is not natively supported in this browser (Use Chrome/Edge).",
      );
      return;
    }
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        recognition.start();
        setIsListening(true);
        toast.success("🎙️ Listening... Speak now!");
      } catch (err) {
        console.error(err);
      }
    }
  };
  return (
    <button
      type="button"
      onClick={toggleListening}
      style={{
        background: isListening ? "#fee2e2" : "#f1f5f9",
        border: `1px solid ${isListening ? "#ef4444" : "#cbd5e1"}`,
        color: isListening ? "#dc2626" : "#475569",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "10px 16px",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "13px",
        fontWeight: 600,
        transition: "all 0.2s",
        boxShadow: isListening ? "0 0 12px rgba(239, 68, 68, 0.5)" : "none",
        width: "100%",
      }}
    >
      {isListening ? (
        <>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              background: "#dc2626",
              borderRadius: "50%",
              animation: "pulse 1s infinite",
            }}
          ></span>
          Listening (Tap to Stop)
        </>
      ) : (
        <>🎙️ Voice Dictation</>
      )}
      <style>{`
                @keyframes pulse {
                    0% { transform: scale(0.85); opacity: 0.5; }
                    50% { transform: scale(1.3); opacity: 1; }
                    100% { transform: scale(0.85); opacity: 0.5; }
                }
            `}</style>
    </button>
  );
}
