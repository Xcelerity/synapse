"use client";
import { Theme, useThemeStore } from "@/store/themeStore";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState, useRef } from "react";
const THEME_OPTIONS: { id: Theme; label: string; color: string }[] = [
  { id: "black", label: "Dark Mode (Black)", color: "#000000" },
  { id: "blue", label: "Dark Mode (Blue)", color: "#080b14" },
  { id: "dark-red", label: "Dark Mode (Red)", color: "#1f0505" },
  { id: "grey", label: "Dark Mode (Grey)", color: "#18181b" },
  { id: "dark-green", label: "Dark Mode (Green)", color: "#022c22" },
  { id: "light", label: "Light Mode (White)", color: "#f8fafc" },
  { id: "light-red", label: "Light Mode (Red)", color: "#fef2f2" },
  { id: "light-blue", label: "Light Mode (Blue)", color: "#e0f2fe" },
  { id: "light-green", label: "Light Mode (Green)", color: "#ecfdf5" },
];
export default function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  if (!mounted) return <div style={{ width: 40, height: 40 }} />;
  const activeTheme =
    THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[1];
  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 16px",
          borderRadius: 99,
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          cursor: "pointer",
          color: "var(--text-primary)",
          fontSize: 13,
          fontWeight: 600,
          boxShadow: "var(--shadow-card)",
          transition: "all 0.2s ease",
        }}
        title="Change Theme"
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: activeTheme.color,
            border: "1px solid var(--border-subtle)",
          }}
        />
        <span>{activeTheme.label}</span>
      </motion.button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              width: 220,
              background: "var(--bg-glass)",
              backdropFilter: "blur(20px)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-elevated)",
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              zIndex: 100,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                padding: "4px 8px",
                letterSpacing: "0.05em",
              }}
            >
              Select Theme
            </div>
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setTheme(opt.id);
                  setIsOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  background:
                    theme === opt.id
                      ? "rgba(124, 58, 237, 0.15)"
                      : "transparent",
                  color:
                    theme === opt.id
                      ? "var(--brand-violet-light)"
                      : "var(--text-secondary)",
                  border: "1px solid transparent",
                  borderColor:
                    theme === opt.id
                      ? "rgba(124, 58, 237, 0.3)"
                      : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 13,
                  fontWeight: theme === opt.id ? 700 : 500,
                }}
                onMouseEnter={(e) => {
                  if (theme !== opt.id) {
                    e.currentTarget.style.background =
                      "rgba(255, 255, 255, 0.05)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (theme !== opt.id) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: opt.color,
                      border: "1px solid var(--border-subtle)",
                    }}
                  />
                  <span>{opt.label}</span>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
