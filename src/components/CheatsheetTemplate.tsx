import React, { useEffect, useRef } from "react";
export interface CheatsheetData {
  title: string;
  subtitle: string;
  colorTheme: "blue" | "red" | "green" | "purple" | "orange";
  heroConcept: { title: string; explanation: string };
  contentBlocks: Array<{
    type: "rule" | "diagram" | "table";
    title: string;
    content?: string;
    icon?: string;
    shape?: "square" | "rounded" | "pill" | "outline";
    mermaidCode?: string;
    tableData?: { headers: string[]; rows: string[][] };
  }>;
  warningOrTip?: string;
}
const THEMES = {
  blue: {
    primary: "#2563eb",
    secondary: "#dbeafe",
    accent: "#3b82f6",
    bg: "#f0f9ff",
  },
  red: {
    primary: "#dc2626",
    secondary: "#fee2e2",
    accent: "#ef4444",
    bg: "#fef2f2",
  },
  green: {
    primary: "#16a34a",
    secondary: "#dcfce7",
    accent: "#22c55e",
    bg: "#f0fdf4",
  },
  purple: {
    primary: "#9333ea",
    secondary: "#f3e8ff",
    accent: "#a855f7",
    bg: "#faf5ff",
  },
  orange: {
    primary: "#ea580c",
    secondary: "#ffedd5",
    accent: "#f97316",
    bg: "#fff7ed",
  },
};
const MermaidRenderer = ({ code, theme }: { code: string; theme: any }) => {
  const mermaidRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let isMounted = true;
    import("mermaid").then((m) => {
      if (!isMounted) return;
      const mermaidInstance = m.default;
      mermaidInstance.initialize({
        startOnLoad: false,
        theme: "base",
        themeVariables: {
          primaryColor: theme.secondary,
          primaryTextColor: "#1e293b",
          primaryBorderColor: theme.primary,
          lineColor: theme.accent,
          secondaryColor: theme.bg,
          tertiaryColor: "#ffffff",
        },
      });
      try {
        const id = "mermaid-" + Math.random().toString(36).substr(2, 9);
        mermaidInstance
          .render(id, code)
          .then(({ svg }) => {
            if (mermaidRef.current) mermaidRef.current.innerHTML = svg;
          })
          .catch((e) => {
            console.error("Mermaid async render error", e);
            if (mermaidRef.current)
              mermaidRef.current.innerHTML =
                '<div style="padding: 20px; color: #dc2626; text-align: center; border: 1px dashed #fca5a5; border-radius: 8px;">Diagram generation failed due to complex syntax.</div>';
          });
      } catch (err) {
        console.error("Mermaid sync error", err);
        if (mermaidRef.current)
          mermaidRef.current.innerHTML =
            '<div style="padding: 20px; color: #dc2626; text-align: center; border: 1px dashed #fca5a5; border-radius: 8px;">Diagram syntax error.</div>';
      }
    });
    return () => {
      isMounted = false;
    };
  }, [code, theme]);
  return (
    <div
      ref={mermaidRef}
      style={{
        display: "flex",
        justifyContent: "center",
        width: "100%",
        overflowX: "auto",
      }}
    />
  );
};
export default function CheatsheetTemplate({ data }: { data: CheatsheetData }) {
  const theme = THEMES[data.colorTheme] || THEMES.blue;
  const getShapeStyle = (shape: string) => {
    switch (shape) {
      case "rounded":
        return {
          borderRadius: 16,
          background: "#ffffff",
          border: "1px solid " + theme.secondary,
          padding: 16,
        };
      case "pill":
        return {
          borderRadius: 32,
          background: theme.bg,
          border: "none",
          padding: "16px 24px",
        };
      case "outline":
        return {
          borderRadius: 8,
          background: "transparent",
          border: "2px dashed " + theme.primary,
          padding: 16,
        };
      case "square":
      default:
        return {
          borderRadius: 0,
          background: "#ffffff",
          borderLeft: "6px solid " + theme.accent,
          borderTop: "1px solid " + theme.secondary,
          borderRight: "1px solid " + theme.secondary,
          borderBottom: "1px solid " + theme.secondary,
          padding: 16,
        };
    }
  };
  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        width: "210mm",
        minHeight: "297mm",
        boxSizing: "border-box",
        background: "#ffffff",
        color: "#0f172a",
        position: "relative",
        overflow: "hidden",
        pageBreakInside: "avoid",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -100,
          right: -100,
          opacity: 0.1,
          pointerEvents: "none",
        }}
      >
        <svg
          width="400"
          height="400"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill={theme.primary}
            d="M42.4,-57.8C54.8,-46.5,64.6,-32.1,69.5,-16.1C74.3,-0.1,74.1,17.4,66.3,31.6C58.5,45.8,43,56.7,26.4,63C9.8,69.3,-7.9,71,-24.1,66.6C-40.3,62.2,-55.1,51.8,-63.9,37.3C-72.7,22.8,-75.6,4.3,-71.4,-12.3C-67.2,-28.9,-55.9,-43.6,-42.2,-54.6C-28.5,-65.6,-14.2,-72.9,0.9,-74C16,-75.1,30,-70.1,42.4,-57.8Z"
            transform="translate(100 100)"
          />
        </svg>
      </div>
      <div style={{ padding: "12mm 15mm", position: "relative", zIndex: 10 }}>
        {}
        <div
          style={{
            borderBottom: "4px solid " + theme.primary,
            paddingBottom: 16,
            marginBottom: 24,
          }}
        >
          <h1
            style={{
              fontSize: "36pt",
              fontWeight: 900,
              color: theme.primary,
              margin: 0,
              letterSpacing: "-1px",
              lineHeight: 1.1,
            }}
          >
            {data.title}
          </h1>
          <p
            style={{
              fontSize: "14pt",
              color: "#64748b",
              margin: "8px 0 0 0",
              fontWeight: 500,
            }}
          >
            {data.subtitle}
          </p>
        </div>
        {}
        <div
          style={{
            background: theme.bg,
            borderLeft: "8px solid " + theme.accent,
            padding: "20px 24px",
            borderRadius: "0 16px 16px 0",
            marginBottom: 32,
          }}
        >
          <h2
            style={{
              fontSize: "18pt",
              fontWeight: 800,
              margin: "0 0 8px 0",
              color: theme.primary,
            }}
          >
            🎯 {data.heroConcept.title}
          </h2>
          <p
            style={{
              fontSize: "12pt",
              lineHeight: 1.6,
              margin: 0,
              color: "#334155",
            }}
          >
            {data.heroConcept.explanation}
          </p>
        </div>
        {}
        <div style={{ columnCount: 2, columnGap: "24px" }}>
          {data.contentBlocks &&
            data.contentBlocks.map((block, idx) => (
              <div
                key={idx}
                style={{
                  breakInside: "avoid",
                  marginBottom: "24px",
                  pageBreakInside: "avoid",
                }}
              >
                {block.type === "rule" && block.content && (
                  <div
                    style={{
                      ...getShapeStyle(block.shape || "rounded"),
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "13pt",
                        fontWeight: 800,
                        margin: "0 0 10px 0",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        color: "#0f172a",
                      }}
                    >
                      {block.icon && (
                        <span
                          style={{
                            background: theme.secondary,
                            width: 28,
                            height: 28,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 8,
                            fontSize: "12pt",
                          }}
                        >
                          {block.icon}
                        </span>
                      )}
                      {block.title}
                    </h4>
                    <p
                      style={{
                        fontSize: "11pt",
                        margin: 0,
                        color: "#334155",
                        lineHeight: 1.5,
                      }}
                    >
                      {block.content}
                    </p>
                  </div>
                )}
                {block.type === "diagram" && block.mermaidCode && (
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid " + theme.secondary,
                      borderRadius: 16,
                      padding: "20px",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "14pt",
                        fontWeight: 800,
                        margin: "0 0 16px 0",
                        color: theme.primary,
                        borderBottom: "2px solid " + theme.secondary,
                        paddingBottom: 8,
                      }}
                    >
                      🔄 {block.title}
                    </h3>
                    <MermaidRenderer code={block.mermaidCode} theme={theme} />
                  </div>
                )}
                {block.type === "table" && block.tableData && (
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid " + theme.secondary,
                      borderRadius: 12,
                      overflow: "hidden",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div
                      style={{
                        background: theme.primary,
                        padding: "12px 16px",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "13pt",
                          fontWeight: 700,
                          margin: 0,
                          color: "#ffffff",
                        }}
                      >
                        📊 {block.title}
                      </h3>
                    </div>
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr
                          style={{
                            background: theme.secondary,
                            color: "#0f172a",
                          }}
                        >
                          {block.tableData.headers.map((h, i) => (
                            <th
                              key={i}
                              style={{
                                padding: "10px 14px",
                                textAlign: "left",
                                fontSize: "10pt",
                                fontWeight: 700,
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {block.tableData.rows.map((row, i) => (
                          <tr
                            key={i}
                            style={{
                              borderBottom:
                                i === block.tableData!.rows.length - 1
                                  ? "none"
                                  : "1px solid " + theme.secondary,
                            }}
                          >
                            {row.map((cell, j) => (
                              <td
                                key={j}
                                style={{
                                  padding: "10px 14px",
                                  fontSize: "10pt",
                                  color: "#334155",
                                }}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
        </div>
        {}
        {data.warningOrTip && (
          <div
            style={{
              background: "#fffbeb",
              borderLeft: "6px solid #f59e0b",
              padding: "20px",
              borderRadius: "0 12px 12px 0",
              marginTop: 32,
              pageBreakInside: "avoid",
            }}
          >
            <h4
              style={{
                fontSize: "14pt",
                fontWeight: 800,
                color: "#b45309",
                margin: "0 0 8px 0",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              ⚠️ Critical Tip
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: "12pt",
                color: "#92400e",
                lineHeight: 1.5,
              }}
            >
              {data.warningOrTip}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
