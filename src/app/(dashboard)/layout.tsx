"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
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
      {/* Sidebar — hidden on mobile via CSS */}
      <div className="sidebar-wrapper" style={{ flexShrink: 0 }}>
        <Sidebar />
      </div>

      <main
        className="dashboard-main"
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <header
          style={{
            padding: "16px 24px",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--bg-glass)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            position: "sticky",
            top: 0,
            zIndex: 40,
          }}
        >
          <ThemeToggle />
        </header>
        <div style={{ flex: 1 }}>{children}</div>
      </main>

      {/* Bottom nav — only shown on mobile via CSS */}
      <div className="bottom-nav-wrapper">
        <BottomNav />
      </div>

      <style>{`
        .sidebar-wrapper { display: flex; }
        .bottom-nav-wrapper { display: none; }

        @media (max-width: 768px) {
          .sidebar-wrapper { display: none !important; }
          .bottom-nav-wrapper { display: block; }
        }

        @media (max-width: 1024px) and (min-width: 769px) {
          .sidebar-wrapper aside {
            width: 72px !important;
          }
        }
      `}</style>
    </div>
  );
}
