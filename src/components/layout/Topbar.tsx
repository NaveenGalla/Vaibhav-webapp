"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu, Search, ChevronDown, LogOut, User } from "lucide-react";
import { signOut } from "next-auth/react";
import NotificationBell from "@/components/notifications/NotificationBell";

interface TopbarProps {
  userName: string;
  userRole: string;
  onMenuClick: () => void;
}

export default function Topbar({
  userName,
  userRole,
  onMenuClick,
}: TopbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header
      className="sticky top-0 z-30 mx-4 mt-4 flex h-16 items-center justify-between rounded-[1.5rem] border bg-white/80 px-4 shadow-sm backdrop-blur-xl md:mx-6 lg:mx-8"
      style={{ borderColor: "rgba(17,24,39,0.08)" }}
    >
      {/* ── Left: hamburger (mobile) + search ───────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <Menu size={20} />
        </button>

        {/* Search bar */}
        <div className="hidden sm:flex items-center gap-2 rounded-full border px-4 py-2 bg-gray-50/80 focus-within:bg-white"
          style={{ borderColor: "rgba(17,24,39,0.08)", minWidth: "18rem" }}>
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            type="search"
            placeholder="Search vehicle, indent, driver…"
            className="bg-transparent text-sm outline-none w-full placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* ── Right: notifications + user dropdown ───────────────────────────── */}
      <div className="flex items-center gap-2">
        <NotificationBell />

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full py-1.5 pl-2 pr-3 hover:bg-gray-100 transition-colors"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: "#111827", color: "#fff" }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold leading-tight text-gray-800">{userName}</p>
              <p className="text-[10px] leading-tight text-gray-500">{userRole}</p>
            </div>
            <ChevronDown size={13} className="text-gray-400 ml-1" />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-56 rounded-2xl border bg-white p-1 shadow-xl z-50"
              style={{ borderColor: "rgba(17,24,39,0.08)" }}
            >
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setDropdownOpen(false)}
              >
                <User size={14} /> My Profile
              </Link>
              <div className="my-1 h-px bg-gray-100" />
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
