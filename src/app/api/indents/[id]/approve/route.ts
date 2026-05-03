// ─────────────────────────────────────────────────────────────────────────────
// POST /api/indents/[id]/approve — approve / reject / send for correction
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { canSeeBranch, hasRole, nextIndentApprovalLevel, requireRole } from "@/lib/rbac";
import { z } from "zod";

const schema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "CORRECTION"]),
  remarks:  z.string().optional(),
});

interface Ctx { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id }  = await params;
  const session = await auth();
  const user    = session?.user as any;

  if (!requireRole(user, "indentApprover"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const indent = await db.indent.findUnique({
    where: { id },
    include: {
      approvals: { orderBy: { level: "desc" }, take: 1 },
      requestedBy: { select: { id: true } },
    },
  });
  if (!indent) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canSeeBranch(user, indent.branchId))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (indent.status !== "SUBMITTED")
    return NextResponse.json({ error: "Indent is not in SUBMITTED status." }, { status: 400 });
  if (indent.requestedById === user.id && !hasRole(user, "platformAdmin"))
    return NextResponse.json({ error: "Requesters cannot approve their own indent." }, { status: 400 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const { decision, remarks } = parsed.data;

  const statusMap = {
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    CORRECTION: "CORRECTION",
  } as const;

  const updated = await db.$transaction(async (tx) => {
    await tx.indentApproval.updateMany({
      where: { indentId: id, status: "PENDING" },
      data: { status: decision, remarks: remarks ?? null, action: decision, actionedAt: new Date() },
    });
    await tx.indentApproval.create({
      data: {
        indentId: id,
        approverId: user.id,
        level: nextIndentApprovalLevel(indent.approvals[0]?.level ?? 0),
        status: decision,
        action: decision,
        actionedAt: new Date(),
        remarks: remarks ?? null,
      },
    });
    return tx.indent.update({
      where: { id },
      data: { status: statusMap[decision] },
    });
  });

  await db.auditLog.create({
    data: {
      userId: user.id, action: decision, module: "INDENT",
      entityId: id, entityType: "Indent",
      oldValue: { status: "SUBMITTED" },
      newValue: { status: updated.status, remarks },
    },
  });

  await createNotification({
    userId: indent.requestedById,
    type: decision === "APPROVED" ? "APPROVAL" : decision === "REJECTED" ? "REJECTION" : "SYSTEM",
    title: `Indent ${updated.status.toLowerCase().replace("_", " ")}`,
    message: `${indent.indentNumber} was ${updated.status.toLowerCase().replace("_", " ")}.`,
    link: `/indents/${id}`,
  });

  return NextResponse.json({ id, status: updated.status });
}
