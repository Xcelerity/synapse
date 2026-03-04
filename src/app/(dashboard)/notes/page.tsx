"use client";
import { useState, useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import UnderlineExt from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Link from "@tiptap/extension-link";
import { useAuthStore } from "@/store/authStore";
import { XP_REWARDS } from "@/lib/gamification";
import { summarizeContent, generateFlashcards, eli5Content } from "@/lib/ai";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { db } from "@/lib/firebase";
interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  userId?: string;
}
const TOOL_BUTTONS = [
  { cmd: "toggleBold", icon: "B", title: "Bold", style: { fontWeight: 800 } },
  {
    cmd: "toggleItalic",
    icon: "I",
    title: "Italic",
    style: { fontStyle: "italic" },
  },
  {
    cmd: "toggleUnderline",
    icon: "U",
    title: "Underline",
    style: { textDecoration: "underline" },
  },
  { cmd: "toggleStrike", icon: "S̶", title: "Strike", style: {} },
  { cmd: "toggleHighlight", icon: "🖊", title: "Highlight", style: {} },
  {
    cmd: "toggleCode",
    icon: "<>",
    title: "Code",
    style: { fontFamily: "monospace" },
  },
];
export default function NotesPage() {
  const { user, addXP, updateStats, gamification } = useAuthStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  useActivityTracker();
  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      UnderlineExt,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Start writing your note..." }),
      CharacterCount,
      Link.configure({ openOnClick: false }),
    ],
    editorProps: { attributes: { class: "tiptap-editor" } },
    immediatelyRender: false,
  });
  useEffect(() => {
    setMounted(true);
    if (!user) return;
    async function fetchNotes() {
      try {
        const q = query(
          collection(db, "notes"),
          where("userId", "==", user!.uid),
        );
        const snap = await getDocs(q);
        const fetched = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Note,
        );
        fetched.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        setNotes(fetched);
      } catch (err) {
        console.error("Error fetching notes:", err);
        toast.error("Failed to load notes from cloud");
      }
    }
    fetchNotes();
  }, [user]);
  const selectedNote = notes.find((n) => n.id === selectedId) || null;
  function openNote(note: Note) {
    setSelectedId(note.id);
    setTitle(note.title);
    editor?.commands.setContent(note.content || "");
    setAiResult("");
    setShowAiPanel(false);
    setEditingTitle(false);
  }
  async function createNote() {
    if (!user) return;
    const id = `note-${Date.now()}`;
    const newNote: Note = {
      id,
      title: "Untitled Note",
      content: "",
      wordCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: user.uid,
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    try {
      await setDoc(doc(db, "notes", id), newNote);
    } catch (e) {
      toast.error("Failed to sync new note");
    }
    openNote(newNote);
    addXP(XP_REWARDS.CREATE_NOTE);
    updateStats({ notesCreated: gamification.notesCreated + 1 });
    toast.success("📝 Note created! +20 XP");
  }
  async function saveNote() {
    if (!selectedId || !user) return;
    const content = editor?.getHTML() || "";
    const wordCount = editor?.storage.characterCount?.words() || 0;
    const updatedAt = new Date().toISOString();
    const updated = notes.map((n) =>
      n.id === selectedId ? { ...n, title, content, wordCount, updatedAt } : n,
    );
    setNotes(updated);
    try {
      await setDoc(
        doc(db, "notes", selectedId),
        { title, content, wordCount, updatedAt },
        { merge: true },
      );
      toast.success("💾 Saved to cloud!");
    } catch (e) {
      toast.error("Failed to sync changes");
    }
  }
  async function deleteNote(id: string) {
    if (!user) return;
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    try {
      await deleteDoc(doc(db, "notes", id));
      toast.success("Deleted from cloud");
    } catch (e) {
      toast.error("Failed to delete from cloud");
    }
    if (selectedId === id) {
      setSelectedId(null);
      editor?.commands.setContent("");
      setTitle("");
    }
  }
  async function commitTitle() {
    setEditingTitle(false);
    if (selectedId && user) {
      const updatedAt = new Date().toISOString();
      const updated = notes.map((n) =>
        n.id === selectedId ? { ...n, title, updatedAt } : n,
      );
      setNotes(updated);
      try {
        await setDoc(
          doc(db, "notes", selectedId),
          { title, updatedAt },
          { merge: true },
        );
      } catch (e) { }
    }
  }
  async function handleAI(action: "summarize" | "flashcards" | "eli5") {
    const content = editor?.getText() || "";
    if (content.length < 2) {
      toast.error("Write some content first!");
      return;
    }
    setAiLoading(true);
    setShowAiPanel(true);
    setAiResult("");
    try {
      if (action === "summarize") {
        setAiResult(await summarizeContent(content, "bullets"));
        toast.success("✨ Summarized!");
      } else if (action === "eli5") {
        setAiResult(await eli5Content(content, user?.gradeLevel));
        toast.success("🧒 Simplified!");
      } else {
        const cards = await generateFlashcards(content, 8);
        setAiResult(
          cards
            .map((c, i) => `Q${i + 1}: ${c.question}\nA: ${c.answer}`)
            .join("\n\n---\n\n"),
        );
        addXP(XP_REWARDS.CREATE_FLASHCARD_DECK);
        updateStats({
          flashcardDecksCreated: (gamification.flashcardDecksCreated || 0) + 1,
        });
        toast.success("🃏 Flashcards generated! +40 XP");
      }
    } catch {
      toast.error(
        "AI request failed. Check your Gemini API key configuration.",
      );
    }
    setAiLoading(false);
  }
  const filteredNotes = notes.filter((n) =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  return (
    <div className="page-split" style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      { }
      <div
        className="page-split-sidebar"
        style={{
          width: 280,
          flexShrink: 0,
          borderRight: "1px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-secondary)",
        }}
      >
        <div
          style={{
            padding: "20px 16px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              📝 Notes ({notes.length})
            </h2>
            <button
              onClick={createNote}
              className="btn-primary"
              style={{ padding: "6px 14px", fontSize: 12 }}
            >
              + New
            </button>
          </div>
          <input
            className="input-field"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: 13 }}
          />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {!mounted ? (
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="shimmer"
                style={{ height: 64, borderRadius: 10, marginBottom: 8 }}
              />
            ))
          ) : filteredNotes.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 16px",
                color: "var(--text-muted)",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
              <p style={{ fontSize: 13 }}>No notes yet. Click + New!</p>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <motion.div
                key={note.id}
                whileHover={{ x: 2 }}
                onClick={() => openNote(note)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  marginBottom: 6,
                  cursor: "pointer",
                  position: "relative",
                  border: `1px solid ${selectedId === note.id ? "rgba(124,58,237,0.4)" : "transparent"}`,
                  background:
                    selectedId === note.id
                      ? "rgba(124,58,237,0.08)"
                      : "rgba(255,255,255,0.02)",
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: 4,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {note.title || "Untitled"}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {new Date(note.updatedAt).toLocaleDateString()} ·{" "}
                  {note.wordCount || 0} words
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNote(note.id);
                  }}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 14,
                    color: "var(--text-muted)",
                    opacity: 0,
                    transition: "opacity 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
                >
                  🗑
                </button>
              </motion.div>
            ))
          )}
        </div>
      </div>
      { }
      <div
        className="page-split-main"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {selectedNote ? (
          <>
            { }
            <div
              style={{
                padding: "16px 32px",
                borderBottom: "1px solid var(--border-subtle)",
                background: "var(--bg-secondary)",
              }}
            >
              {editingTitle ? (
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={(e) => e.key === "Enter" && commitTitle()}
                  style={{
                    width: "100%",
                    background: "rgba(124,58,237,0.06)",
                    border: "2px solid rgba(124,58,237,0.5)",
                    borderRadius: 10,
                    outline: "none",
                    fontSize: 22,
                    fontWeight: 800,
                    color: "var(--text-primary)",
                    fontFamily: "Inter",
                    padding: "8px 14px",
                  }}
                />
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <h1
                    onClick={() => setEditingTitle(true)}
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: title
                        ? "var(--text-primary)"
                        : "var(--text-muted)",
                      cursor: "text",
                      flex: 1,
                      padding: "6px 0",
                    }}
                  >
                    {title || "Untitled Note"}
                  </h1>
                  <button
                    onClick={() => setEditingTitle(true)}
                    style={{
                      border: "1px solid var(--border-subtle)",
                      background: "none",
                      borderRadius: 8,
                      padding: "5px 11px",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      fontSize: 12,
                      fontFamily: "Inter",
                    }}
                  >
                    ✏️ Rename
                  </button>
                </div>
              )}
            </div>
            { }
            <div
              style={{
                padding: "10px 24px",
                borderBottom: "1px solid var(--border-subtle)",
                background: "var(--bg-secondary)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              {TOOL_BUTTONS.map((btn) => (
                <button
                  key={btn.cmd}
                  title={btn.title}
                  onClick={() => {
                    const c = editor?.chain().focus() as unknown as Record<
                      string,
                      () => { run: () => void }
                    >;
                    c?.[btn.cmd]?.()?.run();
                  }}
                  style={{
                    ...btn.style,
                    padding: "5px 9px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 7,
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: 13,
                    fontFamily: "inherit",
                  }}
                >
                  {btn.icon}
                </button>
              ))}
              <select
                onChange={(e) => {
                  const lvl = parseInt(e.target.value);
                  if (lvl)
                    editor
                      ?.chain()
                      .focus()
                      .toggleHeading({ level: lvl as 1 | 2 | 3 })
                      .run();
                  else editor?.chain().focus().setParagraph().run();
                }}
                style={{
                  padding: "5px 8px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 7,
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: "Inter",
                  outline: "none",
                }}
              >
                <option value="">Paragraph</option>
                <option value="1">H1</option>
                <option value="2">H2</option>
                <option value="3">H3</option>
              </select>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <button
                  onClick={() => handleAI("summarize")}
                  disabled={aiLoading}
                  className="btn-secondary"
                  style={{ padding: "6px 11px", fontSize: 12 }}
                >
                  ✨ Summarize
                </button>
                <button
                  onClick={() => handleAI("eli5")}
                  disabled={aiLoading}
                  className="btn-secondary"
                  style={{ padding: "6px 11px", fontSize: 12 }}
                >
                  🧒 ELI5
                </button>
                <button
                  onClick={() => handleAI("flashcards")}
                  disabled={aiLoading}
                  className="btn-secondary"
                  style={{ padding: "6px 11px", fontSize: 12 }}
                >
                  🃏 Cards
                </button>
                <button
                  onClick={saveNote}
                  className="btn-primary"
                  style={{ padding: "7px 16px", fontSize: 13 }}
                >
                  💾 Save
                </button>
              </div>
            </div>
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              <div style={{ flex: 1, padding: "32px 48px", overflowY: "auto" }}>
                <EditorContent editor={editor} />
                {editor && (
                  <div
                    style={{
                      marginTop: 16,
                      fontSize: 11,
                      color: "var(--text-muted)",
                      display: "flex",
                      gap: 16,
                    }}
                  >
                    <span>
                      {editor.storage.characterCount?.words() || 0} words
                    </span>
                    <span>
                      {editor.storage.characterCount?.characters() || 0} chars
                    </span>
                  </div>
                )}
              </div>
              <AnimatePresence>
                {showAiPanel && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 340, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      borderLeft: "1px solid var(--border-subtle)",
                      background: "var(--bg-secondary)",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ padding: 24, width: 340 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 16,
                        }}
                      >
                        <h3
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                          }}
                        >
                          🤖 AI Result
                        </h3>
                        <button
                          onClick={() => setShowAiPanel(false)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--text-muted)",
                            fontSize: 20,
                          }}
                        >
                          ×
                        </button>
                      </div>
                      {aiLoading ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                          }}
                        >
                          {[100, 80, 90, 70].map((w, i) => (
                            <div
                              key={i}
                              className="shimmer"
                              style={{
                                height: 20,
                                borderRadius: 6,
                                width: `${w}%`,
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: 14,
                            color: "var(--text-secondary)",
                            lineHeight: 1.7,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {aiResult}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 16,
              color: "var(--text-muted)",
            }}
          >
            <div style={{ fontSize: 64 }}>📝</div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "var(--text-secondary)",
              }}
            >
              Select a note to edit
            </div>
            <p style={{ fontSize: 14 }}>Or create a new note to get started</p>
            <button onClick={createNote} className="btn-primary">
              + Create New Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
