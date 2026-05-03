import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyRoles } from "@/lib/notifications";
import { generateRefNumber } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  vehicleId: z.string().min(1),
  branchId: z.string().optional().nullable(),
  reason: z.enum(["REGULAR_MAINTENANCE_SOLD", "BREAKDOWN", "SCRAPPED", "OTHER"]),
  odometerAtDisposal: z.coerce.number().optional().nullable(),
  saleAmount: z.coerce.number().optional().nullable(),
  buyerDetails: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["Super Admin", "Admin", "Vehicle Manager"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const vehicle = await db.vehicle.findUnique({ where: { id: d.vehicleId } });
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });

  const count = await db.vehicleDisposalRequest.count();
  const request = await db.vehicleDisposalRequest.create({
    data: {
      requestNumber: generateRefNumber("DISP", count + 1),
      vehicleId: d.vehicleId,
      branchId: d.branchId || vehicle.branchId,
      reason: d.reason,
      odometerAtDisposal: d.odometerAtDisposal ?? null,
      saleAmount: d.saleAmount ?? null,
      buyerDetails: d.buyerDetails ?? null,
      remarks: d.remarks ?? null,
      requestedById: user.id,
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      module: "DISPOSAL",
      action: "CREATE",
      entityId: request.id,
      entityType: "VehicleDisposalRequest",
      newValue: { requestNumber: request.requestNumber, reason: d.reason, vehicleId: d.vehicleId },
    },
  });

  await notifyRoles(["Super Admin", "Admin", "Vehicle Manager"], {
    type: "DISPOSAL",
    title: "Disposal approval required",
    message: `${request.requestNumber} is waiting for approval.`,
    link: `/disposal/${request.id}`,
  });

  return NextResponse.json({ id: request.id }, { status: 201 });
}
