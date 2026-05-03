// ─────────────────────────────────────────────────────────────────────────────
// POST /api/indents/[id]/assign — assign vehicle (and optionally driver)
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canSeeBranch, requireRole } from "@/lib/rbac";
import { z } from "zod";

const schema = z.object({
  vehicleId: z.string().min(1),
  driverId:  z.string().nullable().optional(),
});

interface Ctx { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id }  = await params;
  const session = await auth();
  const user    = session?.user as any;

  if (!requireRole(user, "assignmentManager")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const indent = await db.indent.findUnique({ where: { id } });
  if (!indent) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canSeeBranch(user, indent.branchId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (indent.status !== "APPROVED")
    return NextResponse.json({ error: "Indent must be APPROVED before assignment." }, { status: 400 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const { vehicleId, driverId } = parsed.data;

  // Verify vehicle exists and is active
  const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
  if (!canSeeBranch(user, vehicle.branchId) || vehicle.branchId !== indent.branchId)
    return NextResponse.json({ error: "Vehicle must belong to the indent branch." }, { status: 400 });
  if (vehicle.status !== "ACTIVE")
    return NextResponse.json({ error: "Vehicle is not available (not ACTIVE)." }, { status: 400 });

  if (driverId) {
    const driver = await db.driver.findUnique({ where: { id: driverId }, select: { branchId: true, isActive: true } });
    if (!driver || !driver.isActive || driver.branchId !== indent.branchId)
      return NextResponse.json({ error: "Driver must be active and belong to the indent branch." }, { status: 400 });
  }

  // Update indent + set vehicle status to IN_SERVICE
  await Promise.all([
    db.indent.update({
      where: { id },
      data: {
        status:           "ASSIGNED",
        assignedVehicleId: vehicleId,
        assignedDriverId:  driverId ?? null,
      },
    }),
    db.vehicle.update({
      where: { id: vehicleId },
      data:  { status: "IN_SERVICE" },
    }),
  ]);

  await db.auditLog.create({
    data: {
      userId: user.id, action: "ASSIGN_VEHICLE", module: "INDENT",
      entityId: id, entityType: "Indent",
      oldValue: { status: "APPROVED" },
      newValue: { status: "ASSIGNED", vehicleId, driverId },
    },
  });

  return NextResponse.json({ id, status: "ASSIGNED" });
}
