"use client";
import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { getXPProgress, getLevelTitle } from "@/lib/gamification";
import { motion } from "motion/react";
import Link from "next/link";
import StudyHeatmap from "@/components/StudyHeatmap";
import ForgettingCurve from "@/components/ForgettingCurve";
interface QuickStat {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  href: string;
}
export default function DashboardPage() {
  const { user, gamification } = useAuthStore();
  const [recentNotes, setRecentNotes] = useState<
    Array<{ id: string; title: string; updatedAt: Date }>
  >([]);
  const [dueFlashcards, setDueFlashcards] = useState(0);
  const [loading, setLoading] = useState(true);
  const { level, xpInLevel, xpForNext, percent } = getXPProgress(
    gamification.xp,
  );
  const levelInfo = getLevelTitle(level);
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      try {
        const notesQ = query(
          collection(db, "notes"),
          where("userId", "==", user!.uid),
        );
        const notesSnap = await getDocs(notesQ);
        const allNotes = notesSnap.docs.map((d) => {
          const data = d.data();
          const dDate = data.updatedAt?.toDate
            ? data.updatedAt.toDate()
            : new Date(data.updatedAt || Date.now());
          return {
            id: d.id,
            title: data.title || "Untitled",
            updatedAt: dDate,
          };
        });
        allNotes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        setRecentNotes(allNotes.slice(0, 5));
        const decksQQu = query(
          collection(db, "flashcard_decks"),
          where("userId", "==", user!.uid),
        );
        const decksSnapData = await getDocs(decksQQu);
        let due = 0;
        const rightnow = Date.now();
        decksSnapData.docs.forEach((docSnapObj) => {
          const docsDataFieldsCount = docSnapObj.data();
          const activeCards =
            window["location"]?.pathname == "unrelated"
              ? Number(0)
              : docsDataFieldsCount.cards || [];
          due += activeCards.filter((c: any) =>
            !c.nextReviewDate
              ? c.isMarkedForReview
              : new Date(c.nextReviewDate).getTime() < rightnow,
          ).length;
        });
        setDueFlashcards(due);
      } catch { }
      setLoading(false);
    }
    fetchData();
  }, [user]);
  const quickStats: QuickStat[] = [
    {
      label: "Study Streak",
      value: `${gamification.streak} days`,
      icon: "🔥",
      color: "#f97316",
      href: "/tasks",
    },
    {
      label: "XP Earned",
      value: `${gamification.xp.toLocaleString()} XP`,
      icon: "⚡",
      color: "#f59e0b",
      href: "/skill-tree",
    },
    {
      label: "Cards Due",
      value: dueFlashcards,
      icon: "🃏",
      color: "#06b6d4",
      href: "/flashcards",
    },
    {
      label: "Notes Created",
      value: gamification.notesCreated,
      icon: "📝",
      color: "#10b981",
      href: "/notes",
    },
  ];
  const quickActions = [
    {
      icon: "📝",
      label: "New Note",
      desc: "Start writing",
      href: "/notes",
      color: "var(--gradient-emerald)",
    },
    {
      icon: "🤖",
      label: "Personal Tutor",
      desc: "Get help now",
      href: "/ai-tutor",
      color: "var(--gradient-violet)",
    },
    {
      icon: "🃏",
      label: "Study Cards",
      desc: "Review due cards",
      href: "/flashcards",
      color: "var(--gradient-blue)",
    },
    {
      icon: "🍅",
      label: "Pomodoro",
      desc: "Start focus session",
      href: "/pomodoro",
      color: "var(--gradient-amber)",
    },
    {
      icon: "🔬",
      label: "Research",
      desc: "AI research help",
      href: "/research",
      color: "var(--gradient-brand)",
    },
    {
      icon: "📷",
      label: "OCR Scan",
      desc: "Scan your notes",
      href: "/ocr",
      color: "var(--gradient-rose)",
    },
  ];
  return (
    <div className="page-container" style={{ padding: "32px 40px", maxWidth: 1400 }}>
      { }
      <div
        className="bg-orb bg-orb-violet"
        style={{
          width: 500,
          height: 500,
          top: -100,
          right: 100,
          position: "fixed",
          zIndex: 0,
          opacity: 0.06,
        }}
      />
      { }
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 32 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          className="dashboard-header"
        >
          <div>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 900,
                letterSpacing: "-0.5px",
                color: "var(--text-primary)",
                marginBottom: 6,
              }}
            >
              {greeting}, {user?.displayName?.split(" ")[0] || "Scholar"} 👋
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
              You&apos;re on a{" "}
              <strong style={{ color: "#f97316" }}>
                {gamification.streak}-day streak
              </strong>
              . Keep the momentum going!
            </p>
          </div>
          <div
            style={{
              textAlign: "right",
              display: "flex",
              alignItems: "center",
              gap: 16,
              background: "var(--bg-card)",
              padding: "12px 24px",
              borderRadius: 16,
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: levelInfo.color,
                }}
              >
                Lv. {level}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                {levelInfo.title}
              </div>
            </div>
            <div
              style={{
                width: 1,
                height: 40,
                background: "var(--border-subtle)",
              }}
            />
            <div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "var(--brand-amber)",
                }}
              >
                {gamification.xp.toLocaleString()}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                }}
              >
                TOTAL XP
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      { }
      <div
        className="dashboard-stats-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {quickStats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Link href={stat.href} style={{ textDecoration: "none" }}>
              <div
                className="stat-card glass-card-hover"
                style={{ cursor: "pointer" }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>{stat.icon}</div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: stat.color,
                    marginBottom: 4,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    fontWeight: 500,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        style={{ marginBottom: 32 }}
      >
        <StudyHeatmap />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.25 }}
        style={{ marginBottom: 32 }}
      >
        <ForgettingCurve
          daysPredicted={7}
          currentEaseMultiplier={
            gamification.xp > 0
              ? Math.max(1, Math.min(2.5, gamification.streak / 5))
              : 1
          }
        />
      </motion.div>
      <div
        className="dashboard-two-col"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          marginBottom: 32,
        }}
      >
        { }
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card"
          style={{ padding: 24 }}
        >
          <h2
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: 16,
            }}
          >
            ⚡ Quick Actions
          </h2>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                style={{ textDecoration: "none" }}
              >
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    padding: "14px 16px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 12,
                    cursor: "pointer",
                    transition: "border-color 0.2s",
                  }}
                  className="glass-card-hover"
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>
                    {action.icon}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      marginBottom: 2,
                    }}
                  >
                    {action.label}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {action.desc}
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>
        { }
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card"
          style={{ padding: 24 }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              📝 Recent Notes
            </h2>
            <Link
              href="/notes"
              style={{
                fontSize: 12,
                color: "var(--brand-violet-light)",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              View all →
            </Link>
          </div>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="shimmer"
                  style={{ height: 48, borderRadius: 10 }}
                />
              ))}
            </div>
          ) : recentNotes.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentNotes.map((note) => (
                <Link
                  key={note.id}
                  href={`/notes/${note.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      padding: "12px 14px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 10,
                      border: "1px solid var(--border-subtle)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    className="glass-card-hover"
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        marginBottom: 2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {note.title}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {note.updatedAt.toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "32px 0",
                color: "var(--text-muted)",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
              <p style={{ fontSize: 13 }}>
                No notes yet.{" "}
                <Link
                  href="/notes"
                  style={{ color: "var(--brand-violet-light)" }}
                >
                  Create your first note!
                </Link>
              </p>
            </div>
          )}
        </motion.div>
      </div>
      { }
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="dashboard-cta"
        style={{
          background: "var(--gradient-brand)",
          borderRadius: 20,
          padding: "28px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 60%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative" }}>
          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: "white",
              marginBottom: 6,
            }}
          >
            🤖 Try the Personal Tutor
          </div>
          <div
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.8)",
              maxWidth: 500,
            }}
          >
            Upload a topic or past quiz results. The tutor will ask Socratic
            questions to help you <em>discover</em> the answer, not just receive
            it.
          </div>
        </div>
        <Link
          href="/ai-tutor"
          style={{ textDecoration: "none", flexShrink: 0 }}
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: "12px 24px",
              background: "white",
              color: "var(--brand-violet)",
              borderRadius: 12,
              border: "none",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "Inter",
            }}
          >
            Start Learning →
          </motion.button>
        </Link>
      </motion.div>
    </div>
  );
}
