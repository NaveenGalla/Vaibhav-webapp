import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  vehicleId: z.string().min(1),
  recordDate: z.string().min(1),
  changeDate: z.string().optional().nullable(),
  odometer: z.coerce.number().optional().nullable(),
  tyrePosition: z.string().optional().nullable(),
  tyreBrand: z.string().optional().nullable(),
  tyreSize: z.string().optional().nullable(),
  quantity: z.coerce.number().optional().nullable(),
  cost: z.coerce.number().optional().nullable(),
  vendor: z.string().optional().nullable(),
  invoiceUrl: z.string().optional().nullable(),
  nextChangeKm: z.coerce.number().optional().nullable(),
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

  const entry = await db.tyreRecord.create({
    data: {
      vehicleId: d.vehicleId,
      recordDate: new Date(d.recordDate),
      changeDate: d.changeDate ? new Date(d.changeDate) : null,
      odometer: d.odometer ?? null,
      tyrePosition: d.tyrePosition ?? null,
      tyreBrand: d.tyreBrand ?? null,
      tyreSize: d.tyreSize ?? null,
      quantity: d.quantity ?? null,
      cost: d.cost ?? null,
      vendor: d.vendor ?? null,
      invoiceUrl: d.invoiceUrl ?? null,
      nextChangeKm: d.nextChangeKm ?? null,
      remarks: d.remarks ?? null,
      enteredById: user.id,
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      module: "TYRE_RECORD",
      action: "CREATE",
      entityId: entry.id,
      entityType: "TyreRecord",
      newValue: { vehicleId: d.vehicleId, tyrePosition: d.tyrePosition, cost: d.cost },
    },
  });

  return NextResponse.json({ id: entry.id }, { status: 201 });
}
