"use client";
import { useAuthStore } from "@/store/authStore";
import {
  getXPProgress,
  getLevelTitle,
  BADGES,
  getArchetypes,
} from "@/lib/gamification";
import { motion } from "motion/react";
export default function SkillTreePage() {
  const { gamification } = useAuthStore();
  const { level, percent } = getXPProgress(gamification.xp);
  const levelInfo = getLevelTitle(level);
  return (
    <div style={{ padding: "32px 40px", maxWidth: 1400, margin: "0 auto" }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          marginBottom: 32,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: "var(--text-primary)",
              marginBottom: 8,
            }}
          >
            🌟 Mastery Archetypes
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
            Your action-based learning profile. Progress through different study
            behaviors to reach ultimate mastery.
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
              style={{ fontSize: 24, fontWeight: 900, color: levelInfo.color }}
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
            style={{ width: 1, height: 40, background: "var(--border-subtle)" }}
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
      </motion.div>
      {}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          marginBottom: 40,
          background: "var(--bg-card)",
          padding: "24px",
          borderRadius: "16px",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Progress to Level {level + 1}
          </span>
          <span
            style={{ fontSize: 14, fontWeight: 700, color: levelInfo.color }}
          >
            {percent}%
          </span>
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            borderRadius: 99,
            height: 12,
            overflow: "hidden",
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 1, delay: 0.3 }}
            style={{
              background: `linear-gradient(90deg, ${levelInfo.color}40, ${levelInfo.color})`,
              height: "100%",
              borderRadius: 99,
            }}
          />
        </div>
      </motion.div>
      {}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 48,
        }}
      >
        {getArchetypes(gamification).map((archetype, i) => (
          <motion.div
            key={archetype.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="glass-card"
            style={{ padding: 24, borderTop: `3px solid ${archetype.color}` }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 40,
                  filter: `drop-shadow(0 0 12px ${archetype.color}40)`,
                }}
              >
                {archetype.icon}
              </div>
              <div
                style={{
                  background: `${archetype.color}15`,
                  color: archetype.color,
                  padding: "4px 12px",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 900,
                }}
              >
                Lv. {archetype.level}
              </div>
            </div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: "var(--text-primary)",
                marginBottom: 6,
              }}
            >
              {archetype.name}
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                marginBottom: 20,
                lineHeight: 1.5,
                minHeight: 40,
              }}
            >
              {archetype.description}
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                }}
              >
                {archetype.xp.toLocaleString()} XP
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: archetype.color,
                }}
              >
                {archetype.progress}%
              </span>
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.05)",
                borderRadius: 6,
                height: 8,
                overflow: "hidden",
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${archetype.progress}%` }}
                transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                style={{
                  background: archetype.color,
                  height: "100%",
                  borderRadius: 6,
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>
      {}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card"
        style={{
          padding: "32px",
          border: "1px solid rgba(244, 63, 94, 0.2)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(244, 63, 94, 0.02) 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 32,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: "var(--text-primary)",
                marginBottom: 6,
              }}
            >
              🏆 The Trophy Room
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
              Collect iconic badges by mastering your study workflow and hitting
              milestones.
            </p>
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "var(--brand-rose)",
              background: "rgba(244, 63, 94, 0.1)",
              padding: "6px 16px",
              borderRadius: "12px",
            }}
          >
            {gamification.badges.length} / {Object.keys(BADGES).length} Unlocked
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: 20,
          }}
        >
          {Object.values(BADGES).map((badge) => {
            const isUnlocked = gamification.badges.includes(badge.id);
            return (
              <motion.div
                key={badge.id}
                whileHover={{ scale: isUnlocked ? 1.05 : 1 }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  padding: "20px 16px",
                  background: isUnlocked
                    ? `linear-gradient(180deg, ${badge.color}15 0%, rgba(255,255,255,0.02) 100%)`
                    : "rgba(255,255,255,0.01)",
                  border: isUnlocked
                    ? `1px solid ${badge.color}40`
                    : "1px solid var(--border-subtle)",
                  borderRadius: 20,
                  cursor: isUnlocked ? "pointer" : "default",
                  opacity: isUnlocked ? 1 : 0.4,
                  filter: isUnlocked ? "none" : "grayscale(100%)",
                  boxShadow: isUnlocked
                    ? `0 8px 24px -12px ${badge.color}60`
                    : "none",
                }}
                title={badge.description}
              >
                <div
                  style={{
                    fontSize: 42,
                    filter: isUnlocked
                      ? `drop-shadow(0 0 16px ${badge.color}80)`
                      : "none",
                    marginBottom: 4,
                  }}
                >
                  {badge.icon}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    color: isUnlocked ? badge.color : "var(--text-muted)",
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  {badge.name}
                </div>
                {isUnlocked ? (
                  <div
                    className={`badge badge-${badge.rarity === "legendary" ? "rose" : badge.rarity === "epic" ? "violet" : badge.rarity === "rare" ? "amber" : "emerald"}`}
                    style={{ fontSize: 11, padding: "2px 10px" }}
                  >
                    {badge.rarity}
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "var(--text-muted)",
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                    }}
                  >
                    Locked
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
