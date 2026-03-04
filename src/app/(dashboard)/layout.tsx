"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Sidebar from "@/components/layout/Sidebar";
import ThemeToggle from "@/components/ThemeToggle";
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-primary)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <img
            src="/icon.png"
            alt="Synapse Logo"
            style={{
              width: 56,
              height: 56,
              marginBottom: 16,
              animation: "float 2s ease-in-out infinite",
              objectFit: "contain",
            }}
          />
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Loading Synapse...
          </p>
        </div>
      </div>
    );
  }
  if (!user) return null;
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--bg-primary)",
      }}
    >
      <Sidebar />
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{
            padding: "16px 32px",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--bg-glass)",
            backdropFilter: "blur(20px)",
            position: "sticky",
            top: 0,
            zIndex: 40,
          }}
        >
          <ThemeToggle />
        </header>
        <div style={{ flex: 1 }}>{children}</div>
      </main>
    </div>
  );
}
