"use client";
import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Line,
  LineChart,
  Legend,
} from "recharts";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  updateDoc,
} from "firebase/firestore";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
interface KnowledgeNode {
  id: string;
  topic: string;
  easeFactor: number;
  interval: number;
  lastReviewed: any;
  repetitions: number;
}
export default function ForgettingCurve({
  daysPredicted = 7,
  currentEaseMultiplier = 1,
}: {
  daysPredicted?: number;
  currentEaseMultiplier?: number;
}) {
  const { user } = useAuthStore();
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  useEffect(() => {
    async function fetchNodes() {
      if (!user) return;
      try {
        const q = query(
          collection(db, "knowledge_nodes"),
          where("userId", "==", user.uid),
          orderBy("lastReviewed", "desc"),
          limit(5),
        );
        const snap = await getDocs(q);
        const fetched = snap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as KnowledgeNode,
        );
        setNodes(fetched);
      } catch (err) {
        console.error("Error fetching knowledge nodes:", err);
      }
      setLoading(false);
    }
    fetchNodes();
  }, [user]);
  const saveTopic = async (nodeId: string) => {
    const oldTopic = nodes.find((n) => n.id === nodeId)?.topic;
    if (!editValue.trim() || editValue === oldTopic) {
      setEditingNodeId(null);
      return;
    }
    try {
      const newTopic = editValue.trim();
      await updateDoc(doc(db, "knowledge_nodes", nodeId), { topic: newTopic });
      if (user && oldTopic) {
        const decksRef = collection(db, "flashcard_decks");
        const q = query(
          decksRef,
          where("userId", "==", user.uid),
          where("broadSubject", "==", oldTopic),
        );
        const deckSnap = await getDocs(q);
        const updatePromises = deckSnap.docs.map((d) =>
          updateDoc(doc(db, "flashcard_decks", d.id), {
            broadSubject: newTopic,
          }),
        );
        await Promise.all(updatePromises);
      }
      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, topic: newTopic } : n)),
      );
      setEditingNodeId(null);
      toast.success("Topic renamed everywhere!");
    } catch (err) {
      console.error("Error updating topic:", err);
      toast.error("Failed to update topic");
    }
  };
  const generateMultiData = () => {
    const fullData: any[] = [];
    for (let day = 0; day <= daysPredicted; day++) {
      const entry: any = { day: `Day ${day}`, name: `Day ${day}` };
      nodes.forEach((node) => {
        const lastDate = node.lastReviewed?.toDate
          ? node.lastReviewed.toDate()
          : new Date(node.lastReviewed);
        const daysSinceReview =
          Math.max(
            0,
            (new Date().getTime() - lastDate.getTime()) / (1000 * 3600 * 24),
          ) + day;
        const retention = Math.max(
          5,
          100 *
            Math.exp(
              -(daysSinceReview * (1 / (1.5 * (node.easeFactor || 2.5)))),
            ),
        );
        entry[node.topic] = Math.round(retention);
      });
      fullData.push(entry);
    }
    return fullData;
  };
  const chartData = generateMultiData();
  const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e"];
  const overallAverageRetention =
    nodes.length > 0
      ? Math.round(
          nodes.reduce((acc, node) => {
            const lastDate = node.lastReviewed?.toDate
              ? node.lastReviewed.toDate()
              : new Date(node.lastReviewed);
            const daysSinceReview = Math.max(
              0,
              (new Date().getTime() - lastDate.getTime()) / (1000 * 3600 * 24),
            );
            return (
              acc +
              100 *
                Math.exp(
                  -(daysSinceReview * (1 / (1.5 * (node.easeFactor || 2.5)))),
                )
            );
          }, 0) / nodes.length,
        )
      : 0;
  const predictedGrade =
    overallAverageRetention > 90
      ? "A"
      : overallAverageRetention > 80
        ? "B"
        : overallAverageRetention > 70
          ? "C"
          : "D";
  if (loading)
    return (
      <div className="shimmer" style={{ height: 320, borderRadius: 20 }} />
    );
  if (nodes.length === 0) {
    return (
      <div
        style={{
          padding: 24,
          background: "var(--bg-card)",
          borderRadius: 20,
          border: "1px solid var(--border-subtle)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>📈</div>
        <h2
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          Your Learning Graph
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Start studying to see your forgetting curves and exam predictions
          here!
        </p>
      </div>
    );
  }
  return (
    <div
      style={{
        padding: 24,
        background: "var(--bg-card)",
        borderRadius: 20,
        border: "1px solid var(--border-subtle)",
        minHeight: 400,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: 4,
            }}
          >
            🧠 Multi-Topic Forgetting Curve
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Retention predicted across {nodes.length} active subjects
          </p>
        </div>
        <div
          style={{
            textAlign: "right",
            background: "rgba(124,58,237,0.1)",
            padding: "10px 16px",
            borderRadius: 12,
            border: "1px solid rgba(124,58,237,0.3)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--brand-violet-light)",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            Predicted Exam Readiness
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: "var(--brand-violet-light)",
              lineHeight: 1,
            }}
          >
            {predictedGrade}
          </div>
          <div
            style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}
          >
            Avg. Retention: {overallAverageRetention}%
          </div>
        </div>
      </div>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              stroke="var(--text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 8,
                fontSize: 12,
              }}
              itemStyle={{ padding: "0px" }}
              labelStyle={{
                fontWeight: 600,
                marginBottom: 4,
                color: "var(--text-secondary)",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
            <ReferenceLine
              y={50}
              stroke="#f43f5e"
              strokeDasharray="3 3"
              strokeOpacity={0.4}
            />
            {nodes.map((node, i) => (
              <Line
                key={node.id}
                type="monotone"
                dataKey={node.topic}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4 }}
                animationDuration={1000}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
        }}
      >
        {nodes.map((node, i) => (
          <div
            key={node.id}
            style={{
              padding: "8px 12px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: 10,
              borderLeft: `4px solid ${COLORS[i % COLORS.length]}`,
              cursor: "default",
            }}
          >
            {editingNodeId === node.id ? (
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => saveTopic(node.id)}
                onKeyDown={(e) => e.key === "Enter" && saveTopic(node.id)}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--brand-violet)",
                  borderRadius: 4,
                  color: "var(--text-primary)",
                  fontSize: 11,
                  padding: "2px 4px",
                  outline: "none",
                }}
              />
            ) : (
              <div
                onClick={() => {
                  setEditingNodeId(node.id);
                  setEditValue(node.topic);
                }}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  cursor: "pointer",
                }}
                title="Click to rename"
              >
                {node.topic} ✏️
              </div>
            )}
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
              EF: {node.easeFactor.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
