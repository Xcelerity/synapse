"use client";
import { useState, useEffect, useCallback } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  deleteDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { motion } from "motion/react";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";
const FullCalendar = dynamic(() => import("@fullcalendar/react"), {
  ssr: false,
});
interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: "low" | "medium" | "high";
  category: "assignment" | "exam" | "class" | "study" | "other";
  completed: boolean;
  color: string;
}
const CATEGORY_COLORS: Record<string, string> = {
  assignment: "var(--brand-violet)",
  exam: "#f43f5e",
  class: "var(--brand-cyan)",
  study: "#10b981",
  other: "#94a3b8",
};
const PRIORITY_COLORS = { low: "#10b981", medium: "#f59e0b", high: "#f43f5e" };
export default function TasksPage() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [calendarPlugins, setCalendarPlugins] = useState<unknown[]>([]);
  const [form, setForm] = useState<{
    title: string;
    description: string;
    dueDate: string;
    priority: Task["priority"];
    category: Task["category"];
  }>({
    title: "",
    description: "",
    dueDate: "",
    priority: "medium",
    category: "assignment",
  });
  useEffect(() => {
    Promise.all([
      import("@fullcalendar/daygrid").then((m) => m.default),
      import("@fullcalendar/timegrid").then((m) => m.default),
      import("@fullcalendar/interaction").then((m) => m.default),
    ]).then((plugins) => setCalendarPlugins(plugins));
  }, []);
  const fetchTasks = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "tasks"), where("userId", "==", user.uid));
      const snap = await getDocs(q);
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Task));
    } catch { }
    setLoading(false);
  }, [user]);
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);
  async function addTask() {
    if (!user || !form.title.trim()) return;
    const color = CATEGORY_COLORS[form.category];
    try {
      const ref = await addDoc(collection(db, "tasks"), {
        userId: user.uid,
        ...form,
        color,
        completed: false,
        createdAt: serverTimestamp(),
      });
      setTasks((prev) => [
        { id: ref.id, ...form, color, completed: false },
        ...prev,
      ]);
      setForm({
        title: "",
        description: "",
        dueDate: "",
        priority: "medium",
        category: "assignment",
      });
      setShowForm(false);
      toast.success("📅 Task added!");
    } catch {
      toast.error("Failed to add task");
    }
  }
  async function toggleTask(id: string, completed: boolean) {
    try {
      await updateDoc(doc(db, "tasks", id), { completed: !completed });
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t)),
      );
    } catch {
      toast.error("Update failed");
    }
  }
  async function deleteTask(id: string) {
    try {
      await deleteDoc(doc(db, "tasks", id));
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
    }
  }
  const pending = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);
  const calendarEvents = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    date: t.dueDate,
    backgroundColor: t.color,
    borderColor: t.color,
  }));
  return (
    <div className="page-container" style={{ padding: isMobile ? "16px 20px" : "32px 40px", minHeight: "100vh" }}>
      <div className="page-container" style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: isMobile ? "flex-start" : "center",
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? 16 : 0,
        marginBottom: 24,
      }}
      >
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: "var(--text-primary)",
              marginBottom: 4,
            }}
          >
            📅 Tasks & Calendar
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            {pending.length} pending • {done.length} completed
          </p>
        </div>
        <div className="page-container" style={{ display: "flex", gap: 10 }}>
          <div className="page-container" style={{
            display: "flex",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 10,
            padding: 4,
            border: "1px solid var(--border-subtle)",
          }}
          >
            {(["list", "calendar"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: "7px 16px",
                  borderRadius: 7,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "Inter",
                  background:
                    view === v ? "var(--gradient-brand)" : "transparent",
                  color: view === v ? "white" : "var(--text-muted)",
                  transition: "all 0.2s",
                }}
              >
                {v === "list" ? "📋 List" : "📅 Calendar"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="btn-primary"
          >
            + Add Task
          </button>
        </div>
      </div>
      { }
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card"
          style={{ padding: isMobile ? 16 : 24, marginBottom: 24 }}
        >
          <div className="page-container" style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr auto",
            gap: 12,
            marginBottom: 12,
          }}
          >
            <input
              className="input-field"
              placeholder="Task title..."
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
            />
            <input
              className="input-field"
              type="date"
              value={form.dueDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, dueDate: e.target.value }))
              }
              style={{ colorScheme: "dark" }}
            />
            <select
              className="input-field"
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  category: e.target.value as Task["category"],
                }))
              }
            >
              <option value="assignment">📝 Assignment</option>
              <option value="exam">📋 Exam</option>
              <option value="class">🏫 Class</option>
              <option value="study">📚 Study</option>
              <option value="other">📌 Other</option>
            </select>
          </div>
          <div className="page-container" style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr auto auto",
            gap: 12,
          }}
          >
            <input
              className="input-field"
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
            <select
              className="input-field"
              value={form.priority}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  priority: e.target.value as Task["priority"],
                }))
              }
            >
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🔴 High</option>
            </select>
            <button onClick={addTask} className="btn-primary">
              Add Task
            </button>
          </div>
        </motion.div>
      )}
      {view === "calendar" ? (
        <div className="glass-card" style={{ padding: 24 }}>
          {calendarPlugins.length > 0 ? (
            <FullCalendar
              plugins={calendarPlugins as any}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,listWeek",
              }}
              events={calendarEvents}
              height={600}
            />
          ) : (
            <div className="page-container" style={{
              height: 400,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
            }}
            >
              Loading calendar...
            </div>
          )}
        </div>
      ) : (
        <div className="page-container" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 24 }}
        >
          {[
            { title: "📋 Pending", items: pending },
            { title: "✅ Completed", items: done },
          ].map((section) => (
            <div key={section.title}>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  marginBottom: 12,
                }}
              >
                {section.title} ({section.items.length})
              </h2>
              {loading ? (
                [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="shimmer"
                    style={{ height: 70, borderRadius: 12, marginBottom: 8 }}
                  />
                ))
              ) : section.items.length === 0 ? (
                <div className="page-container" style={{
                  color: "var(--text-muted)",
                  fontSize: 13,
                  padding: "24px 0",
                  textAlign: "center",
                }}
                >
                  Nothing here yet
                </div>
              ) : (
                section.items.map((task, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card"
                    style={{
                      padding: "14px 16px",
                      marginBottom: 8,
                      opacity: task.completed ? 0.6 : 1,
                      borderLeft: `3px solid ${task.color}`,
                    }}
                  >
                    <div className="page-container" style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                    >
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTask(task.id, task.completed)}
                        style={{
                          marginTop: 2,
                          accentColor: task.color,
                          cursor: "pointer",
                          width: 16,
                          height: 16,
                        }}
                      />
                      <div className="page-container" style={{ flex: 1, minWidth: 0 }}>
                        <div className="page-container" style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: task.completed
                            ? "var(--text-muted)"
                            : "var(--text-primary)",
                          textDecoration: task.completed
                            ? "line-through"
                            : "none",
                        }}
                        >
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="page-container" style={{
                            fontSize: 12,
                            color: "var(--text-muted)",
                            marginTop: 2,
                          }}
                          >
                            {task.description}
                          </div>
                        )}
                        <div className="page-container" style={{
                          display: "flex",
                          gap: 8,
                          marginTop: 6,
                          flexWrap: "wrap",
                        }}
                        >
                          {task.dueDate && (
                            <span
                              style={{
                                fontSize: 11,
                                color: "var(--text-muted)",
                              }}
                            >
                              📅 {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: 11,
                              color: PRIORITY_COLORS[task.priority],
                              background: `${PRIORITY_COLORS[task.priority]}15`,
                              padding: "2px 7px",
                              borderRadius: 99,
                              fontWeight: 600,
                            }}
                          >
                            {task.priority}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteTask(task.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-muted)",
                          fontSize: 15,
                          padding: 2,
                          opacity: 0.6,
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

