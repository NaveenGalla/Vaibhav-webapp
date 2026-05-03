"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Car, Users, MapPin, UserCheck, Fuel,
  Wrench, FileText, Bell, BarChart2, ClipboardList, Shield,
  ChevronRight, LogOut, Settings, Truck, AlertTriangle,
  PackagePlus, Trash2, CircleDot, X,
} from "lucide-react";
import { signOut } from "next-auth/react";

interface SidebarProps {
  userRole: string;
  userName: string;
  onClose?: () => void; // mobile close handler
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavSection {
  section: string;
  items: NavItem[];
  roles?: string[]; // if set, only show to these roles
}

// ── Navigation config ────────────────────────────────────────────────────────
const NAV: NavSection[] = [
  {
    section: "Overview",
    items: [
      { label: "Dashboard",    href: "/dashboard",   icon: <LayoutDashboard size={17} /> },
    ],
  },
  {
    section: "Fleet",
    items: [
      { label: "Vehicles",     href: "/vehicles",    icon: <Car size={17} /> },
      { label: "Drivers",      href: "/drivers",     icon: <UserCheck size={17} /> },
      { label: "Branches",     href: "/branches",    icon: <MapPin size={17} /> },
    ],
  },
  {
    section: "Lifecycle",
    items: [
      { label: "Procurement",  href: "/procurement", icon: <PackagePlus size={17} /> },
      { label: "Disposal",     href: "/disposal",    icon: <Trash2 size={17} /> },
    ],
  },
  {
    section: "Operations",
    items: [
      { label: "My Indents",   href: "/indents",     icon: <ClipboardList size={17} /> },
      { label: "Approvals",    href: "/approvals",   icon: <Shield size={17} /> },
      { label: "Fuel Entries", href: "/fuel",        icon: <Fuel size={17} /> },
    ],
  },
  {
    section: "Maintenance",
    items: [
      { label: "Service",      href: "/service",     icon: <Wrench size={17} /> },
      { label: "Repairs",      href: "/repairs",     icon: <Truck size={17} /> },
      { label: "Tyres",        href: "/tyres",       icon: <CircleDot size={17} /> },
      { label: "Accidents",    href: "/accidents",   icon: <AlertTriangle size={17} /> },
    ],
  },
  {
    section: "Documents",
    items: [
      { label: "Documents",    href: "/documents",   icon: <FileText size={17} /> },
      { label: "Renewals",     href: "/renewals",    icon: <Bell size={17} /> },
    ],
  },
  {
    section: "Insights",
    items: [
      { label: "Reports",      href: "/reports",     icon: <BarChart2 size={17} /> },
    ],
    roles: ["Super Admin", "Admin", "Branch Manager", "Accounts User", "Auditor / Read-only User"],
  },
  {
    section: "System",
    items: [
      { label: "Users",        href: "/users",       icon: <Users size={17} /> },
      { label: "Audit Logs",   href: "/audit-logs",  icon: <Shield size={17} /> },
      { label: "Settings",     href: "/settings",    icon: <Settings size={17} /> },
    ],
    roles: ["Super Admin", "Admin"],
  },
];

export default function Sidebar({ userRole, userName, onClose }: SidebarProps) {
  const pathname = usePathname();

  // Check if a link is active (exact or starts with for sub-routes)
  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  return (
    <aside className="sidebar flex flex-col h-full w-[17rem] min-h-screen">
      {/* ── Logo area ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-slate-200/70">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "#111827", color: "#fff" }}>
            <Car size={18} />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-slate-950">
              Vaibhav VFM
            </p>
            <p className="text-[10px] leading-tight text-slate-400">
              Vehicle Management
            </p>
          </div>
        </div>
        {/* Mobile close button */}
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-900 p-1">
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map((section) => {
          // Hide section if role not in allowed list
          if (section.roles && !section.roles.includes(userRole)) return null;

          return (
            <div key={section.section}>
              <p className="sidebar-section-label">{section.section}</p>
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`sidebar-link mx-2 ${isActive(item.href) ? "active" : ""}`}
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className="ml-auto text-xs font-bold rounded-full px-1.5 py-0.5"
                      style={{ background: "#111827", color: "#fff" }}>
                      {item.badge}
                    </span>
                  ) : null}
                  {isActive(item.href) && (
                    <ChevronRight size={14} className="ml-auto opacity-50" />
                  )}
                </Link>
              ))}
            </div>
          );
        })}
      </nav>

      {/* ── User footer ───────────────────────────────────────────────────────── */}
      <div className="border-t border-slate-200/70 p-3">
        <div className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-slate-50">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
            style={{ background: "#f3f4f6", color: "#111827" }}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-950 truncate">{userName}</p>
            <p className="text-[10px] truncate text-slate-400">
              {userRole}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-slate-400 hover:text-slate-950 transition-colors p-1"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
