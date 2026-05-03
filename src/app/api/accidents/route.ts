import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  vehicleId: z.string().min(1),
  driverId: z.string().optional().nullable(),
  accidentDate: z.string().min(1),
  location: z.string().optional().nullable(),
  description: z.string().min(1),
  damageEstimate: z.coerce.number().optional().nullable(),
  repairCost: z.coerce.number().optional().nullable(),
  repairStatus: z.enum(["PENDING", "IN_REPAIR", "REPAIRED"]).default("PENDING"),
  fileUrl: z.string().optional().nullable(),
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

  const entry = await db.accidentRecord.create({
    data: {
      vehicleId: d.vehicleId,
      driverId: d.driverId || null,
      accidentDate: new Date(d.accidentDate),
      location: d.location ?? null,
      description: d.description,
      damageEstimate: d.damageEstimate ?? null,
      repairCost: d.repairCost ?? null,
      repairStatus: d.repairStatus,
      fileUrl: d.fileUrl ?? null,
      enteredById: user.id,
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      module: "ACCIDENT_RECORD",
      action: "CREATE",
      entityId: entry.id,
      entityType: "AccidentRecord",
      newValue: { vehicleId: d.vehicleId, repairStatus: d.repairStatus },
    },
  });

  return NextResponse.json({ id: entry.id }, { status: 201 });
}
