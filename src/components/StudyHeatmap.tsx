"use client";
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useAuthStore } from "@/store/authStore";
function hexToRgb(hex: string) {
  if (!hex) return "16, 185, 129";
  let c = hex.substring(1).split("");
  if (c.length === 3) {
    c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  }
  const color = parseInt(c.join(""), 16);
  return `${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}`;
}
export default function StudyHeatmap() {
  const { gamification } = useAuthStore();
  const dailyStudyMinutes = gamification.dailyStudyMinutes || {};
  const [themeColor, setThemeColor] = useState("#10b981");
  useEffect(() => {
    const saved = localStorage.getItem("heatmapColor");
    if (saved) setThemeColor(saved);
  }, []);
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setThemeColor(e.target.value);
    localStorage.setItem("heatmapColor", e.target.value);
  };
  const numWeeks = 52;
  const numDays = numWeeks * 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfGrid = new Date(today);
  startOfGrid.setDate(today.getDate() - today.getDay() - (numWeeks - 1) * 7);
  const cells = [];
  for (let i = 0; i < numDays; i++) {
    const d = new Date(startOfGrid);
    d.setDate(startOfGrid.getDate() + i);
    cells.push(d);
  }
  const getColor = (minutes: number) => {
    if (minutes === 0) return "rgba(255,255,255,0.04)";
    const rgb = hexToRgb(themeColor);
    if (minutes < 25) return `rgba(${rgb}, 0.3)`;
    if (minutes < 60) return `rgba(${rgb}, 0.6)`;
    if (minutes < 120) return `rgba(${rgb}, 0.8)`;
    return themeColor;
  };
  return (
    <div
      style={{
        padding: 24,
        background: "var(--bg-card)",
        borderRadius: 20,
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Contribution Heatmap
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Tracking your deep work and Pomodoro sessions.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          <span>Less</span>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              background: "rgba(255,255,255,0.04)",
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              background: `rgba(${hexToRgb(themeColor)}, 0.3)`,
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              background: `rgba(${hexToRgb(themeColor)}, 0.6)`,
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              background: `rgba(${hexToRgb(themeColor)}, 0.8)`,
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              background: themeColor,
            }}
          />
          <span>More</span>
          <div
            style={{
              width: 1,
              height: 16,
              background: "var(--border-subtle)",
              margin: "0 8px",
            }}
          />
          <input
            type="color"
            value={themeColor}
            onChange={handleColorChange}
            title="Customize Heatmap Color"
            style={{
              width: 24,
              height: 24,
              padding: 0,
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              background: "transparent",
            }}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            fontSize: 11,
            color: "var(--text-muted)",
            paddingTop: 14,
            paddingBottom: 14,
            fontWeight: 600,
          }}
        >
          <span>Mon</span>
          <span>Wed</span>
          <span>Fri</span>
        </div>
        {}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${numWeeks}, 1fr)`,
            gridTemplateRows: "repeat(7, 1fr)",
            gridAutoFlow: "column",
            gap: 4,
            flex: 1,
          }}
        >
          {cells.map((date, i) => {
            const dateString = date.toLocaleDateString("en-CA");
            const isFuture = date > today;
            const minutes = dailyStudyMinutes[dateString] || 0;
            const color = isFuture ? "transparent" : getColor(minutes);
            return (
              <motion.div
                key={dateString}
                title={`${date.toDateString()}: ${minutes} mins`}
                whileHover={!isFuture ? { scale: 1.5, zIndex: 10 } : {}}
                style={{
                  width: "100%",
                  aspectRatio: "1/1",
                  background: color,
                  borderRadius: 3,
                  border: isFuture
                    ? "none"
                    : "1px solid rgba(255,255,255,0.02)",
                  cursor: isFuture ? "default" : "pointer",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
