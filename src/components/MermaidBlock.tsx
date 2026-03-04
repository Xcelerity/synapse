"use client";
import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
});
let idCounter = 0;
export default function MermaidBlock({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!chart) return;
    const renderChart = async () => {
      try {
        const id = `mermaid-canvas-${Date.now()}-${idCounter++}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
        setError(false);
      } catch (err) {
        console.error("Mermaid rendering failed", err);
        setError(true);
      }
    };
    renderChart();
  }, [chart]);
  if (error) {
    return (
      <div
        style={{
          padding: 16,
          background: "rgba(244,63,94,0.1)",
          color: "#f43f5e",
          borderRadius: 8,
          fontSize: 13,
          fontFamily: "monospace",
        }}
      >
        Syntax Error in Mermaid Chart
      </div>
    );
  }
  return (
    <div
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{
        display: "flex",
        justifyContent: "center",
        background: "rgba(0,0,0,0.2)",
        padding: 16,
        borderRadius: 12,
        margin: "12px 0",
      }}
    />
  );
}
