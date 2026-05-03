// ─────────────────────────────────────────────────────────────────────────────
// Dashboard shell layout — sidebar + topbar + main content
// All /dashboard/* routes use this layout
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect to login if unauthenticated (double-check beyond middleware)
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f5f5f7" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 animate-spin"
            style={{ borderColor: "#111827", borderTopColor: "transparent" }} />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (!session?.user) return null;

  const user = session.user as any;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#f5f5f7" }}>
      {/* ── Mobile sidebar overlay ─────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar — desktop: static, mobile: slide-in ─────────────────────── */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 lg:static lg:translate-x-0
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <Sidebar
          userRole={user.role ?? "User"}
          userName={user.name ?? "User"}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* ── Main content area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          userName={user.name ?? "User"}
          userRole={user.role ?? "User"}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Page content with scroll */}
        <main className="flex-1 overflow-y-auto px-4 py-5 md:px-6 lg:px-8">
          <div className="mx-auto max-w-[1440px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
