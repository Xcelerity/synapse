"use client";
import React, { useState, useRef, useEffect } from "react";
interface WorkshopProps {
  code: string;
  onChangeCode: (code: string) => void;
  canvasData: string | null;
  onChangeCanvas: (data: string) => void;
  scribeNotes: string;
}
export default function InterviewWorkshop({
  code,
  onChangeCode,
  canvasData,
  onChangeCanvas,
  scribeNotes,
}: WorkshopProps) {
  const [activeTab, setActiveTab] = useState<"code" | "canvas" | "scribe">(
    "code",
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  useEffect(() => {
    if (activeTab === "canvas" && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        if (canvasData) {
          const img = new Image();
          img.onload = () => ctx.drawImage(img, 0, 0);
          img.src = canvasData;
        }
      }
    }
  }, [activeTab, canvasData]);
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };
  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      onChangeCanvas(canvasRef.current.toDataURL());
    }
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x =
      "touches" in e
        ? e.touches[0].clientX - rect.left
        : (e as React.MouseEvent).clientX - rect.left;
    const y =
      "touches" in e
        ? e.touches[0].clientY - rect.top
        : (e as React.MouseEvent).clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      onChangeCanvas("");
    }
  };
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: "0 20px",
          background: "#1a1a1a",
          display: "flex",
          gap: 24,
          borderBottom: "1px solid #333",
        }}
      >
        <button
          onClick={() => setActiveTab("code")}
          style={{
            padding: "12px 16px",
            background: "none",
            border: "none",
            color: activeTab === "code" ? "#8b5cf6" : "#555",
            borderBottom:
              activeTab === "code"
                ? "2px solid #8b5cf6"
                : "2px solid transparent",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          💻 Code Playground
        </button>
        <button
          onClick={() => setActiveTab("canvas")}
          style={{
            padding: "12px 16px",
            background: "none",
            border: "none",
            color: activeTab === "canvas" ? "#06b6d4" : "#555",
            borderBottom:
              activeTab === "canvas"
                ? "2px solid #06b6d4"
                : "2px solid transparent",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          🎨 Technical Whiteboard
        </button>
        <button
          onClick={() => setActiveTab("scribe")}
          style={{
            padding: "12px 16px",
            background: "none",
            border: "none",
            color: activeTab === "scribe" ? "#f59e0b" : "#555",
            borderBottom:
              activeTab === "scribe"
                ? "2px solid #f59e0b"
                : "2px solid transparent",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          📄 Scribe Notes
        </button>
      </div>
      <div
        style={{
          flex: 1,
          background: "#0e0e0e",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {activeTab === "code" && (
          <textarea
            value={code}
            onChange={(e) => onChangeCode(e.target.value)}
            style={{
              width: "100%",
              height: "100%",
              background: "transparent",
              color: "#00ff00",
              fontFamily: "monospace",
              fontSize: 16,
              padding: 24,
              border: "none",
              outline: "none",
              resize: "none",
            }}
            spellCheck={false}
          />
        )}
        {activeTab === "canvas" && (
          <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <canvas
              ref={canvasRef}
              width={1200}
              height={800}
              onMouseDown={startDrawing}
              onMouseUp={stopDrawing}
              onMouseMove={draw}
              onTouchStart={startDrawing}
              onTouchEnd={stopDrawing}
              onTouchMove={draw}
              style={{
                width: "100%",
                height: "100%",
                cursor: "crosshair",
                background: "#111",
              }}
            />
            <button
              onClick={clearCanvas}
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                padding: "8px 16px",
                borderRadius: 8,
                background: "rgba(244,63,94,0.2)",
                border: "1px solid #f43f5e",
                color: "#f43f5e",
                cursor: "pointer",
              }}
            >
              Clear Board
            </button>
          </div>
        )}
        {activeTab === "scribe" && (
          <div style={{ padding: 32, height: "100%", overflowY: "auto" }}>
            <div
              style={{
                fontSize: 13,
                color: "#f59e0b",
                marginBottom: 16,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Important Interview Context
            </div>
            <div
              style={{
                fontSize: 18,
                color: "#e5e7eb",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                fontFamily: "Inter",
              }}
            >
              {scribeNotes ||
                "Wait for the AI to share important details or equations here..."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
