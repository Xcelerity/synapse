"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { XP_REWARDS } from "@/lib/gamification";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
type Mode = "work" | "shortBreak" | "longBreak";
type MusicTrack =
  | "off"
  | "lofi"
  | "rain"
  | "piano"
  | "brown"
  | "dark"
  | "hogwarts";
const MODES: Record<
  Mode,
  { label: string; minutes: number; color: string; icon: string }
> = {
  work: {
    label: "Focus",
    minutes: 25,
    color: "var(--brand-violet-light)",
    icon: "🧠",
  },
  shortBreak: {
    label: "Short Break",
    minutes: 5,
    color: "var(--brand-emerald)",
    icon: "☕",
  },
  longBreak: {
    label: "Long Break",
    minutes: 15,
    color: "var(--brand-cyan-light)",
    icon: "🌿",
  },
};
const MUSIC_TRACKS: Record<
  MusicTrack,
  { label: string; videoId: string; icon: string }
> = {
  off: { label: "No Music", videoId: "", icon: "🔇" },
  lofi: { label: "Lofi Girl Radio", videoId: "jfKfPfyJRdk", icon: "🎧" },
  rain: { label: "Rain & Jazz Cafe", videoId: "mPZkdNFkNps", icon: "🌧️" },
  piano: { label: "Classical Piano", videoId: "lFcSrYw-ARY", icon: "🎹" },
  brown: { label: "Brown Noise 10h", videoId: "RqzGzwTY-6w", icon: "🌊" },
  dark: { label: "Ambient Study", videoId: "1ZYbU82GVz4", icon: "🌌" },
  hogwarts: { label: "Hogwarts Library", videoId: "CHFif_y2TyM", icon: "✨" },
};
export default function PomodoroPage() {
  const { addXP, addStudyMinutes } = useAuthStore();
  const [mode, setMode] = useState<Mode>("work");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessions] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(25);
  const [showCustom, setShowCustom] = useState(false);
  const [musicTrack, setMusicTrack] = useState<MusicTrack>("off");
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const secondsElapsedRef = useRef(0);
  const totalSeconds = (showCustom ? customMinutes : MODES[mode].minutes) * 60;
  const progress = 1 - timeLeft / totalSeconds;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const handleComplete = useCallback(() => {
    setIsRunning(false);
    secondsElapsedRef.current = 0;
    if (mode === "work") {
      setSessions((s) => s + 1);
      addXP(XP_REWARDS.COMPLETE_POMODORO);
      const state = useAuthStore.getState();
      state.updateStats({
        pomodorosCompleted: state.gamification.pomodorosCompleted + 1,
      });
      const hour = new Date().getHours();
      if (hour < 6) state.awardBadge("early_bird");
      if (hour === 0 || hour >= 23 || hour <= 4) state.awardBadge("night_owl");
      const today = new Date().toLocaleDateString("en-CA");
      const todaysMins = state.gamification.dailyStudyMinutes?.[today] || 0;
      if (todaysMins >= 240) state.awardBadge("deep_dive");
      toast.success("🍅 Pomodoro complete! +25 XP");
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Synapse", {
          body: "✅ Focus session complete! Take a break.",
          icon: "/icon.png",
        });
      }
    } else {
      toast.success(`${MODES[mode].icon} Break over! Ready to focus?`);
    }
  }, [mode, addXP, addStudyMinutes, showCustom, customMinutes]);
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (mode === "work") {
          secondsElapsedRef.current += 1;
          if (secondsElapsedRef.current >= 60) {
            addStudyMinutes(1);
            secondsElapsedRef.current = 0;
          }
        }
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(intervalRef.current!);
            handleComplete();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current!);
    }
    return () => clearInterval(intervalRef.current!);
  }, [isRunning, handleComplete, mode, addStudyMinutes]);
  function changeMode(newMode: Mode) {
    setMode(newMode);
    setIsRunning(false);
    secondsElapsedRef.current = 0;
    setTimeLeft(MODES[newMode].minutes * 60);
    setShowCustom(false);
  }
  function reset() {
    setIsRunning(false);
    secondsElapsedRef.current = 0;
    setTimeLeft((showCustom ? customMinutes : MODES[mode].minutes) * 60);
  }
  function requestNotification() {
    if ("Notification" in window) Notification.requestPermission();
  }
  const size = 280;
  const strokeWidth = 12;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference * (1 - progress);
  const modeInfo = MODES[mode];
  return (
    <div className="page-container" style={{ display: "flex", flexDirection: isMobile ? "column" : "row", minHeight: "100vh", position: "relative" }}>
      {isMobile && (
        <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Pomodoro</h2>
          <button onClick={() => setShowSidebar(!showSidebar)} style={{ background: 'none', border: '1px solid var(--border-subtle)', padding: '6px 12px', borderRadius: 8, color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <span>📻</span> Radio
          </button>
        </div>
      )}
      { }
      <div
        style={{
          flex: 1,
          padding: isMobile ? "20px" : "40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: "center", marginBottom: 40 }}
        >
          <h1
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: "var(--text-primary)",
              marginBottom: 8,
            }}
          >
            🍅 Pomodoro Timer
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Deep work sessions with structured breaks — {sessionsCompleted}{" "}
            sessions today
          </p>
        </motion.div>
        { }
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginBottom: 48,
            background: "rgba(255,255,255,0.04)",
            padding: 6,
            borderRadius: 14,
            border: "1px solid var(--border-subtle)",
          }}
        >
          {(Object.keys(MODES) as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => changeMode(m)}
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "Inter",
                background: mode === m ? modeInfo.color : "transparent",
                color: mode === m ? "white" : "var(--text-muted)",
                boxShadow:
                  mode === m ? `0 4px 16px ${modeInfo.color}44` : "none",
                transition: "all 0.2s",
              }}
            >
              {MODES[m].icon} {MODES[m].label}
            </button>
          ))}
        </div>
        { }
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{ position: "relative", marginBottom: 48 }}
        >
          <svg width={size} height={size} className="pomodoro-ring">
            { }
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={strokeWidth}
            />
            { }
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={isRunning ? modeInfo.color : "rgba(255,255,255,0.2)"}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{
                transition: "stroke-dashoffset 1s linear, stroke 0.3s ease",
                filter: isRunning
                  ? `drop-shadow(0 0 8px ${modeInfo.color})`
                  : "none",
              }}
            />
          </svg>
          { }
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: 56,
                fontWeight: 900,
                color: "var(--text-primary)",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-2px",
              }}
            >
              {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}
            </div>
            <div
              style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}
            >
              {modeInfo.icon} {modeInfo.label}
            </div>
          </div>
        </motion.div>
        { }
        <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
          <button
            onClick={reset}
            className="btn-ghost"
            style={{ padding: "12px 24px" }}
          >
            ↺ Reset
          </button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setIsRunning((r) => !r);
              requestNotification();
            }}
            style={{
              padding: "14px 48px",
              background: isRunning
                ? "rgba(244,63,94,0.15)"
                : `linear-gradient(135deg, ${modeInfo.color}, ${modeInfo.color}bb)`,
              border: isRunning ? "1px solid rgba(244,63,94,0.4)" : "none",
              color: isRunning ? "#f43f5e" : "white",
              borderRadius: 14,
              fontWeight: 800,
              fontSize: 18,
              cursor: "pointer",
              fontFamily: "Inter",
              boxShadow: isRunning ? "none" : `0 8px 24px ${modeInfo.color}55`,
            }}
          >
            {isRunning ? "⏸ Pause" : "▶ Start"}
          </motion.button>
        </div>
        { }
        <button
          onClick={() => setShowCustom((s) => !s)}
          className="btn-ghost"
          style={{ fontSize: 12, marginBottom: 16 }}
        >
          ⚙️ Custom Duration
        </button>
        <AnimatePresence>
          {showCustom && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ display: "flex", alignItems: "center", gap: 12 }}
            >
              <input
                type="number"
                min={1}
                max={120}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(Number(e.target.value))}
                className="input-field"
                style={{ width: 80, textAlign: "center" }}
              />
              <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
                minutes
              </span>
              <button
                onClick={() => {
                  setIsRunning(false);
                  setTimeLeft(customMinutes * 60);
                }}
                className="btn-secondary"
                style={{ fontSize: 13 }}
              >
                Apply
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        { }
        <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
          {Array.from({ length: Math.max(4, sessionsCompleted + 1) }).map(
            (_, i) => (
              <div
                key={i}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background:
                    i < sessionsCompleted
                      ? modeInfo.color
                      : "rgba(255,255,255,0.1)",
                  boxShadow:
                    i < sessionsCompleted
                      ? `0 0 8px ${modeInfo.color}88`
                      : "none",
                  transition: "all 0.3s",
                }}
              />
            ),
          )}
          <span
            style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: 8 }}
          >
            {sessionsCompleted} completed
          </span>
        </div>
      </div>
      { }
      <AnimatePresence>
        {(!isMobile || showSidebar) && (
          <motion.div
            initial={isMobile ? { x: "100%" } : false}
            animate={{ x: 0 }}
            exit={isMobile ? { x: "100%" } : undefined}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            style={{
              width: isMobile ? "100%" : 320,
              padding: 32,
              borderLeft: isMobile ? "none" : "1px solid var(--border-subtle)",
              background: isMobile ? "var(--bg-primary)" : "rgba(255,255,255,0.01)",
              display: "flex",
              flexDirection: "column",
              position: isMobile ? 'fixed' : 'relative',
              top: isMobile ? 65 : 0,
              right: 0,
              bottom: isMobile ? 0 : 0,
              height: isMobile ? "100vh" : "100%",
              zIndex: isMobile ? 9999 : 1,
              overflowY: 'auto'
            }}
          >
            {isMobile && (
              <div className="page-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Background Audio</h3>
                <button onClick={() => setShowSidebar(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 24, cursor: 'pointer' }}>×</button>
              </div>
            )}
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "var(--text-primary)",
                marginBottom: 4,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>📻</span> Focus Radio
            </div>
            <div
              style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}
            >
              24/7 ambient background streams
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(Object.keys(MUSIC_TRACKS) as MusicTrack[]).map((track) => {
                const isOff = track === "off";
                const isSelected = musicTrack === track;
                return (
                  <button
                    key={track}
                    onClick={() => setMusicTrack(track)}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 12,
                      border:
                        "1px solid " +
                        (isSelected
                          ? "rgba(255,255,255,0.15)"
                          : "rgba(255,255,255,0.04)"),
                      background: isSelected
                        ? "rgba(255,255,255,0.05)"
                        : "transparent",
                      color: isSelected
                        ? isOff
                          ? "#f43f5e"
                          : "#10b981"
                        : "var(--text-secondary)",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      textAlign: "left",
                      boxShadow:
                        isSelected && !isOff
                          ? "0 0 20px rgba(16, 185, 129, 0.1)"
                          : "none",
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{MUSIC_TRACKS[track].icon}</span>
                    <span style={{ flex: 1 }}>{MUSIC_TRACKS[track].label}</span>
                    {isSelected && !isOff && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#10b981",
                          boxShadow: "0 0 8px #10b981",
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            { }
            {musicTrack !== "off" && (
              <div
                style={{
                  position: "absolute",
                  width: 0,
                  height: 0,
                  overflow: "hidden",
                  opacity: 0,
                  pointerEvents: "none",
                }}
              >
                <iframe
                  width="100"
                  height="100"
                  src={`https://www.youtube.com/embed/${MUSIC_TRACKS[musicTrack].videoId}?autoplay=1&controls=0&showinfo=0&rel=0&playsinline=1`}
                  title="Pomodoro Music"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
