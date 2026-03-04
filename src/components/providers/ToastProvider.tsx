"use client";
import { Toaster } from "react-hot-toast";
export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "var(--bg-card)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "12px",
          padding: "12px 16px",
          fontSize: "14px",
          fontFamily: "Inter, sans-serif",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        },
        success: {
          iconTheme: { primary: "#10b981", secondary: "white" },
          style: {
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#f1f5f9",
          },
        },
        error: {
          iconTheme: { primary: "#f43f5e", secondary: "white" },
          style: {
            background: "rgba(244, 63, 94, 0.1)",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            color: "#f1f5f9",
          },
        },
      }}
    />
  );
}
