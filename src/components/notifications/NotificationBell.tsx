"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

type NotificationItem = {
  id: string;
  title: string;
  message: string | null;
  type: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadNotifications();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadNotifications() {
    const res = await fetch("/api/notifications", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.items ?? []);
    setUnreadCount(data.unreadCount ?? 0);
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setItems((current) => current.map((item) => item.id === id ? { ...item, isRead: true } : item));
    setUnreadCount((count) => Math.max(0, count - 1));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white bg-red-600">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border bg-white p-2 shadow-xl z-50"
          style={{ borderColor: "rgba(17,24,39,0.08)" }}>
          <div className="flex items-center justify-between px-2 py-2">
            <p className="text-sm font-semibold text-slate-950">Notifications</p>
            <Link href="/notifications" onClick={() => setOpen(false)} className="text-xs font-medium text-gray-500 hover:text-slate-950">
              View all
            </Link>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-gray-400">No notifications yet.</p>
            ) : items.map((item) => {
              const body = (
                <div className={`rounded-xl px-3 py-2 hover:bg-gray-50 ${item.isRead ? "" : "bg-blue-50/70"}`}>
                  <div className="flex items-start gap-2">
                    <span className={`mt-1 h-2 w-2 rounded-full ${item.isRead ? "bg-gray-200" : "bg-blue-600"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-950">{item.title}</p>
                      {item.message && <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{item.message}</p>}
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-400">{item.type}</p>
                    </div>
                  </div>
                </div>
              );
              return item.link ? (
                <Link key={item.id} href={item.link} onClick={() => { setOpen(false); void markRead(item.id); }}>
                  {body}
                </Link>
              ) : (
                <button key={item.id} type="button" onClick={() => void markRead(item.id)} className="block w-full text-left">
                  {body}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
