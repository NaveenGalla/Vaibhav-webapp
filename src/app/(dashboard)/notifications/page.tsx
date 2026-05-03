import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncDueReminderNotifications } from "@/lib/notifications";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function NotificationsPage() {
  const session = await auth();
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id) return null;

  await syncDueReminderNotifications(user.id);

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Notifications</h1>
        <p className="page-subtitle">{notifications.filter((n) => !n.isRead).length} unread of {notifications.length}</p>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {notifications.map((n) => (
            <Link key={n.id} href={n.link ?? "#"} className={`block px-5 py-4 hover:bg-gray-50 ${n.isRead ? "" : "bg-blue-50/60"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{n.title}</p>
                  {n.message && <p className="mt-1 text-sm text-gray-500">{n.message}</p>}
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">{n.type}</p>
                </div>
                <p className="whitespace-nowrap text-xs text-gray-400">{formatDate(n.createdAt)}</p>
              </div>
            </Link>
          ))}
          {notifications.length === 0 && <p className="px-5 py-12 text-center text-sm text-gray-400">No notifications yet.</p>}
        </div>
      </div>
    </div>
  );
}
