"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { XP_REWARDS } from "@/lib/gamification";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";
import Link from "next/link";
const FullCalendar = dynamic(() => import("@fullcalendar/react"), {
  ssr: false,
});
const DEFAULT_TASKS = [
  { title: "Read Chapter 4", color: "var(--brand-violet)", duration: "01:00" },
  { title: "Calculus Pset", color: "#f43f5e", duration: "02:00" },
  { title: "Deep Work Session", color: "var(--brand-cyan)", duration: "01:30" },
];
interface TimeBlock {
  id: string;
  title: string;
  start: string;
  end: string;
  color: string;
  completed: boolean;
}
export default function TimetablePage() {
  const { user, gamification, addXP, addStudyMinutes } = useAuthStore();
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarPlugins, setCalendarPlugins] = useState<any[]>([]);
  const [draggableInitialized, setDraggableInitialized] = useState(false);
  const [customTasks, setCustomTasks] = useState(DEFAULT_TASKS);
  const [newTaskForm, setNewTaskForm] = useState({
    title: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "08:00:00",
    endTime: "09:00:00",
    color: "var(--brand-violet)",
  });
  const externalEventsRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: "",
    color: "",
    start: "",
    end: "",
  });
  useEffect(() => {
    Promise.all([
      import("@fullcalendar/daygrid").then((m) => m.default),
      import("@fullcalendar/timegrid").then((m) => m.default),
      import("@fullcalendar/interaction").then((m) => m.default),
      import("@fullcalendar/interaction").then((m) => m.Draggable),
    ]).then(([dg, tg, interact, Draggable]) => {
      setCalendarPlugins([dg, tg, interact]);
      if (externalEventsRef.current && !draggableInitialized) {
        new Draggable(externalEventsRef.current, {
          itemSelector: ".fc-event",
          eventData: function (eventEl) {
            return {
              title: eventEl.innerText,
              backgroundColor: eventEl.style.backgroundColor,
              borderColor: eventEl.style.backgroundColor,
              duration: eventEl.getAttribute("data-duration") || "01:00",
            };
          },
        });
        setDraggableInitialized(true);
      }
    });
  }, [draggableInitialized]);
  const fetchBlocks = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, "timetable_blocks"),
        where("userId", "==", user.uid),
      );
      const snap = await getDocs(q);
      setBlocks(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TimeBlock));
    } catch { }
    setLoading(false);
  }, [user]);
  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);
  async function handleEventReceive(info: any) {
    if (!user) return;
    const event = info.event;
    event.remove();
    const tempId = "temp-" + Date.now();
    const newBlock = {
      userId: user.uid,
      title: event.title,
      start: event.startStr,
      end:
        event.endStr ||
        new Date(event.start.getTime() + 60 * 60 * 1000).toISOString(),
      color: event.backgroundColor,
      completed: false,
    };
    setBlocks((prev) => [...prev, { id: tempId, ...newBlock }]);
    try {
      const ref = await addDoc(collection(db, "timetable_blocks"), newBlock);
      setBlocks((prev) =>
        prev.map((b) => (b.id === tempId ? { ...b, id: ref.id } : b)),
      );
      toast.success("Block scheduled!");
    } catch {
      toast.error("Failed to schedule block");
      setBlocks((prev) => prev.filter((b) => b.id !== tempId));
    }
  }
  async function handleEventChange(info: any) {
    const event = info.event;
    try {
      await updateDoc(doc(db, "timetable_blocks", event.id), {
        start: event.startStr,
        end: event.endStr,
      });
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === event.id
            ? { ...b, start: event.startStr, end: event.endStr }
            : b,
        ),
      );
    } catch {
      toast.error("Update failed");
      info.revert();
    }
  }
  async function markCompleted() {
    if (!selectedEvent) return;
    try {
      await updateDoc(doc(db, "timetable_blocks", selectedEvent.id), {
        completed: true,
      });
      const ms =
        new Date(selectedEvent.endStr).getTime() -
        new Date(selectedEvent.startStr).getTime();
      const minutes = Math.floor(ms / 60000);
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === selectedEvent.id ? { ...b, completed: true } : b,
        ),
      );
      setSelectedEvent(null);
      setIsEditingEvent(false);
      addXP(XP_REWARDS.COMPLETE_POMODORO);
      addStudyMinutes(minutes);
      toast.success(`Block completed! +${minutes} mins deep work.`);
    } catch {
      toast.error("Failed to complete block");
    }
  }
  async function deleteBlock() {
    if (!selectedEvent) return;
    try {
      await deleteDoc(doc(db, "timetable_blocks", selectedEvent.id));
      setBlocks((prev) => prev.filter((b) => b.id !== selectedEvent.id));
      setSelectedEvent(null);
      setIsEditingEvent(false);
      toast.success("Block deleted");
    } catch {
      toast.error("Delete failed");
    }
  }
  async function handleDateSelect(selectInfo: any) {
    if (!user) return;
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect();
    const newBlock = {
      userId: user.uid,
      title: "New Task Block",
      start: selectInfo.startStr,
      end: selectInfo.endStr,
      color: "var(--brand-violet)",
      completed: false,
    };
    try {
      const ref = await addDoc(collection(db, "timetable_blocks"), newBlock);
      const blockWithId = { id: ref.id, ...newBlock };
      setBlocks((prev) => [...prev, blockWithId]);
      const mockEvent = {
        id: ref.id,
        title: blockWithId.title,
        startStr: blockWithId.start,
        endStr: blockWithId.end,
        backgroundColor: blockWithId.color,
        extendedProps: { originalColor: blockWithId.color, completed: false },
      };
      openEditModal(mockEvent);
      setIsEditingEvent(true);
      toast.success("Block created! Edit details.");
    } catch {
      toast.error("Failed to create block");
    }
  }
  async function handleAddDirectBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!newTaskForm.title) return toast.error("Check task title");
    const startDate = new Date(`${newTaskForm.date}T${newTaskForm.startTime}`);
    const endDate = new Date(`${newTaskForm.date}T${newTaskForm.endTime}`);
    if (endDate <= startDate)
      return toast.error("End time must be after start time");
    const tempId = "temp-" + Date.now();
    const newBlock = {
      userId: user.uid,
      title: newTaskForm.title,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      color: newTaskForm.color,
      completed: false,
    };
    setBlocks((prev) => [...prev, { id: tempId, ...newBlock }]);
    try {
      const ref = await addDoc(collection(db, "timetable_blocks"), newBlock);
      setBlocks((prev) =>
        prev.map((b) => (b.id === tempId ? { ...b, id: ref.id } : b)),
      );
      toast.success("Block added to timetable!");
      setNewTaskForm((prev) => ({ ...prev, title: "" }));
    } catch {
      setBlocks((prev) => prev.filter((b) => b.id !== tempId));
      toast.error("Failed to add block");
    }
  }
  function deleteTaskFromBank(index: number) {
    setCustomTasks((prev) => prev.filter((_, i) => i !== index));
  }
  function openEditModal(event: any) {
    const startStr = new Date(event.startStr).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const endStr = new Date(event.endStr).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setEditFormData({
      title: event.title.replace(" âœ…", ""),
      color: event.extendedProps.originalColor || event.backgroundColor,
      start: startStr,
      end: endStr,
    });
    setSelectedEvent(event);
    setIsEditingEvent(false);
  }
  async function saveEventEdit() {
    if (!selectedEvent) return;
    try {
      const startDate = new Date(selectedEvent.startStr);
      const [sh, sm, ss] = editFormData.start.split(":");
      startDate.setHours(parseInt(sh), parseInt(sm), parseInt(ss || "0"));
      const endDate = new Date(selectedEvent.endStr);
      const [eh, em, es] = editFormData.end.split(":");
      endDate.setHours(parseInt(eh), parseInt(em), parseInt(es || "0"));
      await updateDoc(doc(db, "timetable_blocks", selectedEvent.id), {
        title: editFormData.title,
        color: editFormData.color,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      });
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === selectedEvent.id
            ? {
              ...b,
              title: editFormData.title,
              color: editFormData.color,
              start: startDate.toISOString(),
              end: endDate.toISOString(),
            }
            : b,
        ),
      );
      setSelectedEvent(null);
      setIsEditingEvent(false);
      toast.success("Event updated");
    } catch {
      toast.error("Failed to update event");
    }
  }
  const calendarEvents = blocks.map((b) => ({
    id: b.id,
    title: b.title + (b.completed ? " âœ…" : ""),
    start: b.start,
    end: b.end,
    backgroundColor: b.completed ? "var(--bg-secondary)" : b.color,
    borderColor: b.color,
    textColor: b.completed ? "var(--text-muted)" : "#ffffff",
    extendedProps: { completed: b.completed, originalColor: b.color },
  }));
  const progress =
    blocks.length > 0
      ? (blocks.filter((b) => b.completed).length / blocks.length) * 100
      : 0;
  return (
    <div className="page-container" style={{
        padding: "32px 40px",
        display: "flex",
        gap: 32,
        height: "100%",
        minHeight: "100vh",
        overflow: "hidden",
      }}
    >
      { }
      <div className="page-container" style={{
          width: 340,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          overflowY: "auto",
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: "var(--text-primary)",
              marginBottom: 6,
            }}
          >
            Daily Timetable
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: 13,
              lineHeight: 1.5,
              marginBottom: 12,
            }}
          >
            Drag tasks directly onto the grid, or click and highlight a
            timeframe to auto-create blocks.
          </p>
          <div className="page-container" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
              }}
            >
              Jump To Date:
            </label>
            <input
              type="date"
              className="input-field"
              style={{ padding: "6px 12px", fontSize: 13, flex: 1 }}
              onChange={(e) => {
                if (e.target.value && calendarRef.current) {
                  calendarRef.current.getApi().gotoDate(e.target.value);
                }
              }}
            />
          </div>
        </motion.div>
        { }
        <div className="glass-card" style={{ padding: 20 }}>
          <div className="page-container" style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <span>Daily Progress</span>
            <span style={{ color: "var(--brand-emerald)" }}>
              {Math.round(progress)}%
            </span>
          </div>
          <div
            className="progress-bar"
            style={{ background: "var(--bg-primary)", height: 8 }}
          >
            <div
              className="progress-fill"
              style={{
                width: progress + "%",
                background: "var(--gradient-emerald)",
              }}
            />
          </div>
        </div>
        { }
        <div
          className="glass-card"
          style={{
            padding: 20,
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div className="page-container" style={{
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
              Task Bank
            </h3>
            <span
              style={{
                fontSize: 11,
                background: "var(--bg-primary)",
                padding: "2px 8px",
                borderRadius: 12,
                color: "var(--text-muted)",
              }}
            >
              Drag me
            </span>
          </div>
          <div
            ref={externalEventsRef}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              minHeight: 150,
            }}
          >
            {customTasks.map((task, i) => (
              <div
                key={i}
                className="fc-event glass-card-hover"
                data-duration={task.duration}
                style={{
                  padding: "12px 16px",
                  background: task.color,
                  color: "#fff",
                  borderRadius: 12,
                  cursor: "grab",
                  fontSize: 14,
                  fontWeight: 600,
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>{task.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTaskFromBank(i);
                  }}
                  style={{
                    background: "rgba(0,0,0,0.2)",
                    border: "none",
                    color: "white",
                    borderRadius: "50%",
                    width: 24,
                    height: 24,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Remove from Bank"
                >
                  âœ•
                </button>
              </div>
            ))}
          </div>
          { }
          <form
            onSubmit={handleAddDirectBlock}
            style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <h4
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
              }}
            >
              Direct Add Block
            </h4>
            <input
              required
              className="input-field"
              placeholder="Block Title"
              value={newTaskForm.title}
              onChange={(e) =>
                setNewTaskForm({ ...newTaskForm, title: e.target.value })
              }
              style={{ padding: "10px 14px", fontSize: 13 }}
            />
            <div className="page-container" style={{ display: "flex", gap: 12 }}>
              <input
                required
                type="date"
                className="input-field"
                value={newTaskForm.date}
                onChange={(e) =>
                  setNewTaskForm({ ...newTaskForm, date: e.target.value })
                }
                style={{ padding: "10px 14px", fontSize: 13, flex: 2 }}
              />
              <input
                type="color"
                value={newTaskForm.color}
                onChange={(e) =>
                  setNewTaskForm({ ...newTaskForm, color: e.target.value })
                }
                style={{
                  width: 42,
                  height: 42,
                  padding: 0,
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: "transparent",
                }}
              />
            </div>
            <div className="page-container" style={{ display: "flex", gap: 12 }}>
              <div className="page-container" style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  Start
                </label>
                <input
                  type="time"
                  step="1"
                  required
                  className="input-field"
                  value={newTaskForm.startTime}
                  onChange={(e) =>
                    setNewTaskForm({
                      ...newTaskForm,
                      startTime: e.target.value,
                    })
                  }
                  style={{ padding: "8px 10px", fontSize: 12, width: "100%" }}
                />
              </div>
              <div className="page-container" style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  End
                </label>
                <input
                  type="time"
                  step="1"
                  required
                  className="input-field"
                  value={newTaskForm.endTime}
                  onChange={(e) =>
                    setNewTaskForm({ ...newTaskForm, endTime: e.target.value })
                  }
                  style={{ padding: "8px 10px", fontSize: 12, width: "100%" }}
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn-secondary"
              style={{ padding: "10px", fontSize: 13, fontWeight: 700 }}
            >
              + Add to Grid
            </button>
          </form>
          <div className="page-container" style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <h3
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-muted)",
                marginBottom: 12,
              }}
            >
              Routines
            </h3>
            <div className="page-container" style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <button
                className="btn-secondary"
                onClick={() => toast.success("Weekend routine loaded!")}
                style={{ fontSize: 12 }}
              >
                ðŸ–ï¸ Weekend
              </button>
              <button
                className="btn-secondary"
                onClick={() =>
                  toast.success("Saved current blocks as template!")
                }
                style={{ fontSize: 12 }}
              >
                ðŸ’¾ Save
              </button>
            </div>
          </div>
        </div>
      </div>
      { }
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-card fc-dark-theme"
        style={{
          flex: 1,
          padding: 24,
          borderRadius: 24,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
                    .fc-dark-theme .fc-theme-standard td, .fc-dark-theme .fc-theme-standard th { border-color: var(--border-subtle); }
                    .fc-dark-theme .fc-col-header-cell { padding: 12px; background: rgba(0,0,0,0.2); }
                    .fc-dark-theme .fc-timegrid-slot { height: 40px; }
                    .fc-dark-theme .fc-event { border-radius: 8px; border: none; padding: 2px 6px; cursor: pointer; transition: transform 0.2s; }
                    .fc-dark-theme .fc-event:hover { transform: scale(1.02); z-index: 10 !important; }
                    .fc-button-primary { background: var(--bg-secondary) !important; border: 1px solid var(--border-subtle) !important; text-transform: capitalize !important; font-family: Inter !important; }
                    .fc-button-active { background: var(--brand-violet) !important; color: white !important; border-color: var(--brand-violet) !important; }
                `,
          }}
        />
        {calendarPlugins.length > 0 ? (
          <div className="page-container" style={{ flex: 1, minHeight: 0 }}>
            <FullCalendar
              {...({ ref: calendarRef } as any)}
              plugins={calendarPlugins}
              initialView="timeGridDay"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "timeGridDay,timeGridWeek,dayGridMonth",
              }}
              slotMinTime="00:00:00"
              slotMaxTime="24:00:00"
              slotEventOverlap={false}
              allDaySlot={false}
              editable={true}
              droppable={true}
              selectable={true}
              selectMirror={true}
              select={handleDateSelect}
              events={calendarEvents}
              eventReceive={handleEventReceive}
              eventChange={handleEventChange}
              eventClick={(info) => {
                openEditModal(info.event);
              }}
              height="100%"
            />
          </div>
        ) : (
          <div className="page-container" style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              className="shimmer"
              style={{ width: "100%", height: "100%", borderRadius: 16 }}
            />
          </div>
        )}
      </motion.div>
      { }
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => {
              setSelectedEvent(null);
              setIsEditingEvent(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card"
              style={{
                width: 440,
                padding: 32,
                display: "flex",
                flexDirection: "column",
                gap: 24,
              }}
            >
              {isEditingEvent ? (
                <div className="page-container" style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <h2
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: "var(--text-primary)",
                      marginBottom: 8,
                    }}
                  >
                    Edit Block Details
                  </h2>
                  <div>
                    <label
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        marginBottom: 6,
                        display: "block",
                      }}
                    >
                      Title
                    </label>
                    <input
                      className="input-field"
                      value={editFormData.title}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          title: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="page-container" style={{ display: "flex", gap: 16 }}>
                    <div className="page-container" style={{ flex: 1 }}>
                      <label
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          marginBottom: 6,
                          display: "block",
                        }}
                      >
                        Start Time
                      </label>
                      <input
                        type="time"
                        step="1"
                        className="input-field"
                        value={editFormData.start}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            start: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="page-container" style={{ flex: 1 }}>
                      <label
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          marginBottom: 6,
                          display: "block",
                        }}
                      >
                        End Time
                      </label>
                      <input
                        type="time"
                        step="1"
                        className="input-field"
                        value={editFormData.end}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            end: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        marginBottom: 6,
                        display: "block",
                      }}
                    >
                      Color
                    </label>
                    <div className="page-container" style={{ display: "flex", gap: 8 }}>
                      {[
                        "var(--brand-violet)",
                        "#f43f5e",
                        "#10b981",
                        "var(--brand-amber)",
                        "var(--brand-cyan)",
                      ].map((c) => (
                        <div
                          key={c}
                          onClick={() =>
                            setEditFormData({ ...editFormData, color: c })
                          }
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: c,
                            cursor: "pointer",
                            border:
                              editFormData.color === c
                                ? "2px solid white"
                                : "none",
                            opacity: editFormData.color === c ? 1 : 0.6,
                          }}
                        />
                      ))}
                      { }
                      <input
                        type="color"
                        value={
                          editFormData.color.startsWith("#")
                            ? editFormData.color
                            : "#ffffff"
                        }
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            color: e.target.value,
                          })
                        }
                        style={{
                          width: 32,
                          height: 32,
                          padding: 0,
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "50%",
                          cursor: "pointer",
                          background: "transparent",
                        }}
                        title="Custom Color"
                      />
                    </div>
                  </div>
                  <div className="page-container" style={{ display: "flex", gap: 12, marginTop: 16 }}>
                    <button
                      onClick={saveEventEdit}
                      className="btn-primary"
                      style={{ flex: 1 }}
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setIsEditingEvent(false)}
                      className="btn-secondary"
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="page-container" style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div className="page-container" style={{
                          display: "inline-block",
                          padding: "4px 12px",
                          background: selectedEvent.extendedProps.originalColor,
                          color: "white",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 800,
                          marginBottom: 12,
                        }}
                      >
                        Time Block
                      </div>
                      <h2
                        style={{
                          fontSize: 24,
                          fontWeight: 800,
                          color: "var(--text-primary)",
                        }}
                      >
                        {selectedEvent.title.replace(" âœ…", "")}
                      </h2>
                      <div className="page-container" style={{
                          fontSize: 14,
                          color: "var(--text-muted)",
                          marginTop: 4,
                        }}
                      >
                        {new Date(selectedEvent.startStr).toLocaleTimeString(
                          [],
                          { hour: "2-digit", minute: "2-digit" },
                        )}{" "}
                        -{" "}
                        {new Date(selectedEvent.endStr).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <button
                      onClick={() => setIsEditingEvent(true)}
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-primary)",
                        padding: "6px 12px",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      âœï¸ Edit
                    </button>
                  </div>
                  <div className="page-container" style={{ display: "flex", gap: 12, marginTop: 32 }}>
                    {!selectedEvent.extendedProps.completed && (
                      <button
                        onClick={markCompleted}
                        className="btn-primary"
                        style={{
                          flex: 1,
                          justifyContent: "center",
                          background: "var(--brand-emerald)",
                        }}
                      >
                        âœ“ Mark Completed
                      </button>
                    )}
                    <button
                      onClick={deleteBlock}
                      className="btn-ghost"
                      style={{
                        flex: selectedEvent.extendedProps.completed
                          ? 1
                          : "none",
                        color: "#f43f5e",
                      }}
                    >
                      ðŸ—‘ï¸ Delete
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

