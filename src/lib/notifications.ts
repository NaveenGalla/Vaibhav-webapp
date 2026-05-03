import { db } from "@/lib/db";

type NotificationInput = {
  userId: string;
  title: string;
  message?: string | null;
  type?: "REMINDER" | "APPROVAL" | "REJECTION" | "DISPOSAL" | "PROCUREMENT" | "SYSTEM";
  link?: string | null;
};

export async function createNotification(input: NotificationInput) {
  const recentDuplicate = await db.notification.findFirst({
    where: {
      userId: input.userId,
      title: input.title,
      link: input.link ?? null,
      createdAt: { gte: new Date(Date.now() - 60_000) },
    },
    select: { id: true },
  });
  if (recentDuplicate) return recentDuplicate;

  return db.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message ?? null,
      type: input.type ?? "SYSTEM",
      link: input.link ?? null,
    },
    select: { id: true },
  });
}

export async function notifyRoles(roles: string[], input: Omit<NotificationInput, "userId">) {
  const users = await db.user.findMany({
    where: { role: { in: roles }, isActive: true },
    select: { id: true },
  });

  await Promise.all(users.map((user) => createNotification({ ...input, userId: user.id })));
}

export async function syncDueReminderNotifications(userId: string) {
  const dueReminders = await db.reminder.findMany({
    where: {
      status: { in: ["PENDING", "OVERDUE"] },
      OR: [
        { dueDate: { lte: new Date() } },
        { isAcknowledged: false, dueDate: { lte: new Date(Date.now() + 7 * 86_400_000) } },
      ],
    },
    include: { vehicle: { select: { vehicleNumber: true } } },
    take: 25,
    orderBy: { dueDate: "asc" },
  });

  await Promise.all(dueReminders.map((reminder) => createNotification({
    userId,
    type: "REMINDER",
    title: reminder.title,
    message: reminder.message ?? `${reminder.vehicle?.vehicleNumber ?? "Vehicle"} reminder is due.`,
    link: reminder.vehicleId ? `/vehicles/${reminder.vehicleId}` : "/renewals",
  })));
}
