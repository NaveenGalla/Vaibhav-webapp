import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  vehicleId: z.string().min(1),
  repairDate: z.string().min(1),
  repairType: z.string().optional().nullable(),
  description: z.string().min(1),
  odometer: z.coerce.number().optional().nullable(),
  vendor: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  invoiceUrl: z.string().optional().nullable(),
  cost: z.coerce.number().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["Super Admin", "Admin", "Branch Manager", "Vehicle Manager"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const vehicle = await db.vehicle.findUnique({ where: { id: d.vehicleId } });
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });

  const entry = await db.repairEntry.create({
    data: {
      vehicleId: d.vehicleId,
      repairDate: new Date(d.repairDate),
      repairType: d.repairType ?? null,
      description: d.description,
      odometer: d.odometer ?? null,
      vendor: d.vendor ?? null,
      invoiceNumber: d.invoiceNumber ?? null,
      invoiceUrl: d.invoiceUrl ?? null,
      cost: d.cost ?? null,
      remarks: d.remarks ?? null,
      createdById: user.id,
    },
  });

  if (d.odometer != null && d.odometer > vehicle.odometer) {
    await db.vehicle.update({ where: { id: d.vehicleId }, data: { odometer: d.odometer } });
  }

  await db.auditLog.create({
    data: {
      userId: user.id,
      module: "REPAIR_ENTRY",
      action: "CREATE",
      entityId: entry.id,
      entityType: "RepairEntry",
      newValue: { vehicleId: d.vehicleId, repairType: d.repairType, cost: d.cost },
    },
  });

  return NextResponse.json({ id: entry.id }, { status: 201 });
}
