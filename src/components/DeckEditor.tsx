"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import MermaidBlock from "@/components/MermaidBlock";
import { createSRSCard } from "@/lib/srs";
const MarkdownComponents = {
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || "");
    if (!inline && match && match[1] === "mermaid") {
      return <MermaidBlock chart={String(children).replace(/\n$/, "")} />;
    }
    return !inline ? (
      <div
        style={{
          background: "#1e1e2e",
          padding: 12,
          borderRadius: 8,
          overflowX: "auto",
          fontSize: 13,
          fontFamily: "monospace",
          color: "#e2e8f0",
          margin: "12px 0",
        }}
      >
        <code className={className} {...props}>
          {children}
        </code>
      </div>
    ) : (
      <code
        style={{
          background: "rgba(255,255,255,0.1)",
          padding: "2px 6px",
          borderRadius: 4,
          fontFamily: "monospace",
        }}
        className={className}
        {...props}
      >
        {children}
      </code>
    );
  },
};
export interface FlashcardStyle {
  background?: string;
  textColor?: string;
  fontFamily?: string;
  textAlign?: "left" | "center" | "right";
  borderStyle?: "none" | "solid" | "dashed" | "glowing";
  borderColor?: string;
}
export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  difficulty: "easy" | "medium" | "hard";
  isMarkedForReview: boolean;
  style?: FlashcardStyle;
  repetitions?: number;
  easeFactor?: number;
  interval?: number;
  nextReviewDate?: string;
}
export interface Deck {
  id: string;
  name: string;
  description: string;
  broadSubject?: string;
  cards: Flashcard[];
  createdAt: Date;
}
interface DeckEditorProps {
  initialDeck: Deck;
  onSave: (updatedDeck: Deck) => Promise<void>;
  onBack: () => void;
}
const FONTS = [
  { label: "Inter (Sans)", value: "Inter, sans-serif" },
  { label: "Lora (Serif)", value: "Lora, serif" },
  { label: "Fira Code (Mono)", value: '"Fira Code", monospace' },
  { label: "Comic Sans (Fun)", value: '"Comic Sans MS", cursive' },
];
const BG_THEMES = [
  {
    label: "Classic Slate",
    value: "var(--bg-card)",
    text: "var(--text-primary)",
  },
  { label: "Midnight Obsidian", value: "#0f172a", text: "#ffffff" },
  {
    label: "Violet Glow",
    value:
      "linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(6,182,212,0.1) 100%)",
    text: "var(--text-primary)",
  },
  {
    label: "Sunset Amber",
    value: "linear-gradient(135deg, #fef3c7 0%, #ffedd5 100%)",
    text: "#000000",
  },
  {
    label: "Emerald Forest",
    value: "linear-gradient(to bottom right, #f0fdf4, #dcfce7)",
    text: "#000000",
  },
  {
    label: "Ruby Velvet",
    value: "linear-gradient(to right, #fff1f2, #ffe4e6)",
    text: "#000000",
  },
];
const BORDER_STYLES = [
  { label: "Minimal None", value: "none" },
  { label: "Solid Border", value: "solid" },
  { label: "Dashed Outline", value: "dashed" },
  { label: "Neon Glow", value: "glowing" },
];
export default function DeckEditor({
  initialDeck,
  onSave,
  onBack,
}: DeckEditorProps) {
  const [deck, setDeck] = useState<Deck>(initialDeck);
  const [activeIndex, setActiveIndex] = useState(0);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(initialDeck.name);
  const [isSaving, setIsSaving] = useState(false);
  const [previewFlipped, setPreviewFlipped] = useState(false);
  const [tab, setTab] = useState<"content" | "design">("content");
  const handleSave = async () => {
    setIsSaving(true);
    const updated = { ...deck };
    await onSave(updated);
    setIsSaving(false);
  };
  const addCard = () => {
    const srsDefaults = createSRSCard(Date.now().toString());
    const newCard: Flashcard = {
      id: srsDefaults.id,
      question: "New Question",
      answer: "New Answer",
      difficulty: "medium",
      isMarkedForReview: true,
      style: {
        background: "var(--bg-card)",
        textColor: "var(--text-primary)",
        fontFamily: "Inter, sans-serif",
        textAlign: "center",
        borderStyle: "none",
        borderColor: "#cbd5e1",
      },
      repetitions: srsDefaults.repetitions,
      easeFactor: srsDefaults.easeFactor,
      interval: srsDefaults.interval,
      nextReviewDate: srsDefaults.dueDate.toISOString(),
    };
    setDeck((prev) => ({ ...prev, cards: [...(prev.cards || []), newCard] }));
    setActiveIndex(deck.cards?.length || 0);
  };
  const deleteCard = (index: number) => {
    setDeck((prev) => ({
      ...prev,
      cards: prev.cards.filter((_, i) => i !== index),
    }));
    if (activeIndex >= index) setActiveIndex(Math.max(0, activeIndex - 1));
  };
  const updateActiveCard = (updates: Partial<Flashcard>) => {
    setDeck((prev) => {
      const newCards = [...prev.cards];
      newCards[activeIndex] = { ...newCards[activeIndex], ...updates };
      return { ...prev, cards: newCards };
    });
  };
  const updateActiveStyle = (styleUpdates: Partial<FlashcardStyle>) => {
    setDeck((prev) => {
      const newCards = [...prev.cards];
      newCards[activeIndex] = {
        ...newCards[activeIndex],
        style: { ...newCards[activeIndex].style, ...styleUpdates },
      };
      return { ...prev, cards: newCards };
    });
  };
  const activeCard = deck.cards?.[activeIndex];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      {}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 24,
          flexShrink: 0,
        }}
      >
        <button
          onClick={onBack}
          className="btn-ghost"
          style={{ padding: "8px 12px" }}
        >
          ← Back
        </button>
        {editingTitle ? (
          <input
            autoFocus
            className="input-field"
            value={titleVal}
            onChange={(e) => setTitleVal(e.target.value)}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            style={{
              fontSize: 24,
              fontWeight: 800,
              padding: "4px 12px",
              width: 300,
              background: "rgba(255,255,255,0.05)",
              border: "none",
            }}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <h1
              onClick={() => setEditingTitle(true)}
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: "var(--text-primary)",
                cursor: "pointer",
                margin: 0,
              }}
              title="Click to edit"
            >
              ✏️ {titleVal}
            </h1>
            <input
              placeholder="Topic (e.g. Biology)"
              value={deck.broadSubject || ""}
              onChange={(e) =>
                setDeck((prev) => ({ ...prev, broadSubject: e.target.value }))
              }
              className="input-field"
              style={{
                fontSize: 12,
                padding: "2px 8px",
                height: 24,
                marginTop: 4,
                width: 200,
                background: "rgba(255,255,255,0.03)",
              }}
            />
          </div>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary"
            style={{ padding: "10px 24px" }}
          >
            {isSaving ? "⏳ Saving..." : "💾 Save Changes"}
          </button>
        </div>
      </div>
      {}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr 400px",
          gap: 24,
          flex: 1,
          minHeight: 600,
        }}
      >
        {}
        <div
          className="glass-card"
          style={{
            padding: "20px 0",
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <div
            style={{
              padding: "0 20px",
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              CARDS ({deck.cards?.length || 0})
            </h3>
            <button
              onClick={addCard}
              style={{
                background: "var(--brand-violet)",
                color: "white",
                border: "none",
                borderRadius: 6,
                width: 24,
                height: 24,
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              +
            </button>
          </div>
          <div style={{ overflowY: "auto", flex: 1, padding: "0 12px" }}>
            {deck.cards?.map((c, i) => (
              <div
                key={c.id}
                onClick={() => {
                  setActiveIndex(i);
                  setPreviewFlipped(false);
                }}
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  background:
                    activeIndex === i ? "rgba(124,58,237,0.15)" : "transparent",
                  border: `1px solid ${activeIndex === i ? "rgba(124,58,237,0.4)" : "transparent"}`,
                  cursor: "pointer",
                  marginBottom: 4,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color:
                        activeIndex === i
                          ? "var(--brand-violet-light)"
                          : "var(--text-muted)",
                    }}
                  >
                    CARD {i + 1}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCard(i);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#f43f5e",
                      cursor: "pointer",
                      opacity: activeIndex === i ? 1 : 0,
                    }}
                  >
                    🗑
                  </button>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {c.question || "Empty Question"}
                </div>
              </div>
            ))}
            {deck.cards?.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: 32,
                  fontSize: 13,
                  color: "var(--text-muted)",
                }}
              >
                No cards yet. Click + to add.
              </div>
            )}
          </div>
        </div>
        {}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "rgba(0,0,0,0.1)",
            borderRadius: 24,
            border: "2px dashed var(--border-subtle)",
          }}
        >
          {activeCard ? (
            <>
              <div style={{ marginBottom: 24, display: "flex", gap: 12 }}>
                <button
                  onClick={() => setPreviewFlipped(false)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 20,
                    border: "none",
                    background: !previewFlipped
                      ? "var(--text-primary)"
                      : "rgba(255,255,255,0.1)",
                    color: !previewFlipped
                      ? "var(--bg-base)"
                      : "var(--text-secondary)",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  FRONT
                </button>
                <button
                  onClick={() => setPreviewFlipped(true)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 20,
                    border: "none",
                    background: previewFlipped
                      ? "var(--text-primary)"
                      : "rgba(255,255,255,0.1)",
                    color: previewFlipped
                      ? "var(--bg-base)"
                      : "var(--text-secondary)",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  BACK
                </button>
              </div>
              <motion.div
                layout
                onClick={() => setPreviewFlipped(!previewFlipped)}
                style={{
                  width: 400,
                  height: 500,
                  background: activeCard.style?.background || "var(--bg-card)",
                  color: activeCard.style?.textColor || "var(--text-primary)",
                  fontFamily: activeCard.style?.fontFamily || "Inter",
                  textAlign: activeCard.style?.textAlign || "center",
                  border:
                    activeCard.style?.borderStyle !== "none" &&
                    activeCard.style?.borderStyle !== "glowing"
                      ? `4px ${activeCard.style?.borderStyle} ${activeCard.style?.borderColor}`
                      : "none",
                  boxSizing: "border-box",
                  boxShadow:
                    activeCard.style?.borderStyle === "glowing"
                      ? `0 0 20px ${activeCard.style?.borderColor}`
                      : "var(--shadow-elevated)",
                  borderRadius: 24,
                  padding: 32,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  cursor: "pointer",
                  overflowY: "auto",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    opacity: 0.5,
                    marginBottom: 16,
                  }}
                >
                  {previewFlipped ? "ANSWER" : "QUESTION"}
                </div>
                <div
                  style={{
                    fontSize: 20,
                    lineHeight: 1.6,
                    fontWeight: previewFlipped ? 500 : 700,
                  }}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={MarkdownComponents}
                  >
                    {previewFlipped ? activeCard.answer : activeCard.question}
                  </ReactMarkdown>
                </div>
              </motion.div>
              <div
                style={{
                  marginTop: 24,
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                Click card to flip live preview
              </div>
            </>
          ) : (
            <div style={{ color: "var(--text-muted)" }}>
              Select a card to edit.
            </div>
          )}
        </div>
        {}
        <div
          className="glass-card"
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "16px 16px 0 16px",
              borderBottom: "1px solid var(--border-subtle)",
              gap: 16,
            }}
          >
            <button
              onClick={() => setTab("content")}
              style={{
                padding: "8px 12px",
                borderBottom:
                  tab === "content"
                    ? "2px solid var(--brand-violet)"
                    : "2px solid transparent",
                background: "none",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                color:
                  tab === "content"
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              📝 Content
            </button>
            <button
              onClick={() => setTab("design")}
              style={{
                padding: "8px 12px",
                borderBottom:
                  tab === "design"
                    ? "2px solid var(--brand-violet)"
                    : "2px solid transparent",
                background: "none",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                color:
                  tab === "design"
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              🎨 Design
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
            {activeCard ? (
              <AnimatePresence mode="wait">
                {tab === "content" ? (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 20,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: "var(--text-secondary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: 8,
                          display: "block",
                        }}
                      >
                        Question (Front)
                      </label>
                      <textarea
                        className="input-field"
                        value={activeCard.question}
                        onChange={(e) =>
                          updateActiveCard({ question: e.target.value })
                        }
                        rows={5}
                        style={{
                          resize: "vertical",
                          fontFamily: "monospace",
                          fontSize: 13,
                        }}
                        placeholder="Supports Markdown and $\LaTeX$"
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: "var(--text-secondary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: 8,
                          display: "block",
                        }}
                      >
                        Answer (Back)
                      </label>
                      <textarea
                        className="input-field"
                        value={activeCard.answer}
                        onChange={(e) =>
                          updateActiveCard({ answer: e.target.value })
                        }
                        rows={5}
                        style={{
                          resize: "vertical",
                          fontFamily: "monospace",
                          fontSize: 13,
                        }}
                        placeholder="Supports Markdown and $\LaTeX$"
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: "var(--text-secondary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: 8,
                          display: "block",
                        }}
                      >
                        Difficulty Preset
                      </label>
                      <select
                        className="input-field"
                        value={activeCard.difficulty}
                        onChange={(e) =>
                          updateActiveCard({
                            difficulty: e.target.value as any,
                          })
                        }
                        style={{ fontSize: 13 }}
                      >
                        <option value="easy">Easy (Visual / Recall)</option>
                        <option value="medium">Medium (Application)</option>
                        <option value="hard">Hard (Synthesis / Code)</option>
                      </select>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="design"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 24,
                    }}
                  >
                    {}
                    <div>
                      <label
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: "var(--text-secondary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: 12,
                          display: "block",
                        }}
                      >
                        Card Backdrop
                      </label>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 8,
                        }}
                      >
                        {BG_THEMES.map((b) => (
                          <button
                            key={b.label}
                            onClick={() =>
                              updateActiveStyle({ background: b.value })
                            }
                            style={{
                              padding: "24px 8px",
                              borderRadius: 8,
                              border:
                                activeCard.style?.background === b.value
                                  ? "2px solid var(--brand-violet)"
                                  : "1px solid var(--border-subtle)",
                              background: b.value,
                              color: b.text,
                              fontWeight: 600,
                              fontSize: 11,
                              cursor: "pointer",
                            }}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 12,
                        }}
                      >
                        <input
                          type="color"
                          value={
                            activeCard.style?.background?.startsWith("#")
                              ? activeCard.style.background
                              : "#111827"
                          }
                          onChange={(e) =>
                            updateActiveStyle({ background: e.target.value })
                          }
                          style={{
                            width: 40,
                            height: 40,
                            padding: 0,
                            border: "none",
                            borderRadius: 8,
                            cursor: "pointer",
                          }}
                          title="Custom Custom Palette"
                        />
                        <span
                          style={{ fontSize: 12, color: "var(--text-muted)" }}
                        >
                          Custom Background Palette
                        </span>
                      </div>
                    </div>
                    {}
                    <div>
                      <label
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: "var(--text-secondary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: 8,
                          display: "block",
                        }}
                      >
                        Typography
                      </label>
                      <select
                        className="input-field"
                        value={activeCard.style?.fontFamily || "Inter"}
                        onChange={(e) =>
                          updateActiveStyle({ fontFamily: e.target.value })
                        }
                        style={{ fontSize: 13, marginBottom: 8, width: "100%" }}
                      >
                        {FONTS.map((f) => (
                          <option
                            key={f.label}
                            value={f.value}
                            style={{
                              background: "var(--bg-card)",
                              color: "var(--text-primary)",
                            }}
                          >
                            {f.label}
                          </option>
                        ))}
                      </select>
                      <div style={{ display: "flex", gap: 6 }}>
                        {(["left", "center", "right"] as const).map((align) => (
                          <button
                            key={align}
                            onClick={() =>
                              updateActiveStyle({ textAlign: align })
                            }
                            style={{
                              flex: 1,
                              padding: 8,
                              borderRadius: 8,
                              background:
                                activeCard.style?.textAlign === align
                                  ? "rgba(124,58,237,0.1)"
                                  : "rgba(255,255,255,0.03)",
                              border:
                                activeCard.style?.textAlign === align
                                  ? "1px solid var(--brand-violet)"
                                  : "1px solid var(--border-subtle)",
                              color:
                                activeCard.style?.textAlign === align
                                  ? "var(--brand-violet-light)"
                                  : "var(--text-muted)",
                              cursor: "pointer",
                            }}
                          >
                            {align === "left"
                              ? "Align Left"
                              : align === "center"
                                ? "Center"
                                : "Right"}
                          </button>
                        ))}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 12,
                        }}
                      >
                        <input
                          type="color"
                          value={activeCard.style?.textColor || "#ffffff"}
                          onChange={(e) =>
                            updateActiveStyle({ textColor: e.target.value })
                          }
                          style={{
                            width: 40,
                            height: 40,
                            padding: 0,
                            border: "none",
                            borderRadius: 8,
                            cursor: "pointer",
                          }}
                          title="Custom Font Color Palette"
                        />
                        <span
                          style={{ fontSize: 12, color: "var(--text-muted)" }}
                        >
                          Custom Font Color Palette
                        </span>
                      </div>
                    </div>
                    {}
                    <div>
                      <label
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: "var(--text-secondary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: 8,
                          display: "block",
                        }}
                      >
                        Card Border
                      </label>
                      <select
                        className="input-field"
                        value={activeCard.style?.borderStyle || "none"}
                        onChange={(e) =>
                          updateActiveStyle({
                            borderStyle: e.target.value as any,
                          })
                        }
                        style={{ fontSize: 13, width: "100%", marginBottom: 8 }}
                      >
                        {BORDER_STYLES.map((b) => (
                          <option
                            key={b.label}
                            value={b.value}
                            style={{
                              background: "var(--bg-card)",
                              color: "var(--text-primary)",
                            }}
                          >
                            {b.label}
                          </option>
                        ))}
                      </select>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <input
                          type="color"
                          value={activeCard.style?.borderColor || "#cbd5e1"}
                          onChange={(e) =>
                            updateActiveStyle({ borderColor: e.target.value })
                          }
                          style={{
                            width: 40,
                            height: 40,
                            padding: 0,
                            border: "none",
                            borderRadius: 8,
                            cursor: "pointer",
                          }}
                        />
                        <span
                          style={{ fontSize: 12, color: "var(--text-muted)" }}
                        >
                          Border Color
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                No card selected.
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
