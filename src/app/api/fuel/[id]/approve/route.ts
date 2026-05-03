// ─────────────────────────────────────────────────────────────────────────────
// POST /api/fuel/[id]/approve — approve or reject a fuel entry
// Allowed roles: Super Admin, Admin, Accounts User, Branch Manager, Approver
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { canSeeBranch, requireRole } from "@/lib/rbac";
import { z } from "zod";

const schema = z.object({
  action:  z.enum(["APPROVE", "REJECT"]),
  remarks: z.string().optional(),
});

interface Ctx { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id }  = await params;
  const session = await auth();
  const user    = session?.user as any;

  if (!requireRole(user, "accountsApprover")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entry = await db.fuelEntry.findUnique({ where: { id } });
  if (!entry) return NextResponse.json({ error: "Fuel entry not found." }, { status: 404 });
  if (!canSeeBranch(user, entry.branchId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (entry.approvalStatus !== "PENDING")
    return NextResponse.json({ error: "Only PENDING entries can be approved or rejected." }, { status: 400 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const { action, remarks } = parsed.data;
  const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

  await db.fuelEntry.update({
    where: { id },
    data: {
      approvalStatus: newStatus,
      approvedById:   user.id,
      approvedAt:     new Date(),
      remarks:        remarks ? `${entry.remarks ? entry.remarks + "\n" : ""}Approver: ${remarks}` : entry.remarks,
    },
  });

  await db.auditLog.create({
    data: {
      userId:     user.id,
      action:     action,
      module:     "FUEL_ENTRY",
      entityId:   id,
      entityType: "FuelEntry",
      oldValue: { approvalStatus: "PENDING" },
      newValue: { approvalStatus: newStatus, remarks },
    },
  });

  await createNotification({
    userId: entry.enteredById,
    type: newStatus === "APPROVED" ? "APPROVAL" : "REJECTION",
    title: `Fuel entry ${newStatus.toLowerCase()}`,
    message: `Fuel bill ${entry.billNumber ?? id.slice(0, 8)} was ${newStatus.toLowerCase()}.`,
    link: "/fuel",
  });

  return NextResponse.json({ id, approvalStatus: newStatus });
}
