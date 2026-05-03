// ─────────────────────────────────────────────────────────────────────────────
// POST /api/indents/[id] — status transitions: submit, start, complete
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canSeeBranch, hasRole, nextIndentApprovalLevel } from "@/lib/rbac";
import { z } from "zod";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("submit") }),
  z.object({ action: z.literal("start"),    actualStartKm: z.coerce.number() }),
  z.object({ action: z.literal("complete"), actualEndKm:   z.coerce.number() }),
]);

interface Ctx { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id }  = await params;
  const session = await auth();
  const user    = session?.user as any;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const indent = await db.indent.findUnique({ where: { id } });
  if (!indent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const d = parsed.data;
  const canRunTrip = hasRole(user, "indentApprover");
  const isOwner    = indent.requestedById === user.id;
  if (!isOwner && !canSeeBranch(user, indent.branchId))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let updateData: Record<string, unknown> = {};
  let auditAction = "";

  if (d.action === "submit") {
    if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!["DRAFT", "CORRECTION"].includes(indent.status))
      return NextResponse.json({ error: "Cannot submit in current status." }, { status: 400 });
    updateData = { status: "SUBMITTED" };
    auditAction = "SUBMIT";

    // Ensure a pending approval record exists
    const existing = await db.indentApproval.findFirst({
      where: { indentId: id, status: "PENDING" },
    });
    if (!existing) {
      await db.indentApproval.create({
        data: { indentId: id, approverId: user.id, level: nextIndentApprovalLevel(0), status: "PENDING" },
      });
    }
  }

  else if (d.action === "start") {
    if (!canRunTrip)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (indent.status !== "ASSIGNED")
      return NextResponse.json({ error: "Vehicle must be assigned first." }, { status: 400 });
    updateData = { status: "IN_USE", actualStartKm: d.actualStartKm };
    auditAction = "START_TRIP";
  }

  else if (d.action === "complete") {
    if (!canRunTrip)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (indent.status !== "IN_USE")
      return NextResponse.json({ error: "Trip must be in-use." }, { status: 400 });
    if (indent.actualStartKm && d.actualEndKm < indent.actualStartKm)
      return NextResponse.json({ error: "End KM cannot be less than start KM." }, { status: 400 });

    updateData = { status: "COMPLETED", actualEndKm: d.actualEndKm };
    auditAction = "COMPLETE_TRIP";

    // Update vehicle odometer
    if (indent.assignedVehicleId) {
      await db.vehicle.update({
        where: { id: indent.assignedVehicleId },
        data:  { odometer: d.actualEndKm, status: "ACTIVE" },
      });
    }
  }

  const updated = await db.indent.update({ where: { id }, data: updateData });

  await db.auditLog.create({
    data: {
      userId: user.id, action: auditAction, module: "INDENT",
      entityId: id, entityType: "Indent",
      oldValue: { status: indent.status },
      newValue: { status: updated.status },
    },
  });

  return NextResponse.json({ id, status: updated.status });
}
