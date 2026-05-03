// POST /api/service — create a new service entry
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  vehicleId:       z.string().min(1),
  serviceDate:     z.string().min(1),
  serviceType:     z.string().min(1),
  description:     z.string().optional().nullable(),
  odometer:        z.coerce.number().min(0),
  vendor:          z.string().optional().nullable(),
  invoiceNumber:   z.string().optional().nullable(),
  cost:            z.coerce.number().min(0).optional().nullable(),
  nextServiceDate: z.string().optional().nullable(),
  nextServiceKm:   z.coerce.number().optional().nullable(),
  remarks:         z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const user    = session?.user as any;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canCreate = ["Super Admin", "Admin", "Branch Manager", "Vehicle Manager"].includes(user?.role);
  if (!canCreate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  const vehicle = await db.vehicle.findUnique({ where: { id: d.vehicleId } });
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });

  const branchId = vehicle.branchId ?? user.branchId ?? null;

  const entry = await db.serviceEntry.create({
    data: {
      vehicleId:       d.vehicleId,
      branchId:        branchId,
      serviceDate:     new Date(d.serviceDate),
      serviceType:     d.serviceType,
      description:     d.description     ?? null,
      odometer:        d.odometer,
      vendor:          d.vendor          ?? null,
      invoiceNumber:   d.invoiceNumber   ?? null,
      cost:            d.cost            ?? null,
      nextServiceDate: d.nextServiceDate ? new Date(d.nextServiceDate) : null,
      nextServiceKm:   d.nextServiceKm   ?? null,
      remarks:         d.remarks         ?? null,
      createdById:     user.id,
      enteredById:     user.id,
    },
  });

  // Update vehicle odometer if this service reading is higher
  if (d.odometer > vehicle.odometer) {
    await db.vehicle.update({
      where: { id: d.vehicleId },
      data:  { odometer: d.odometer },
    });
  }

  // Create service reminder if nextServiceDate or nextServiceKm provided
  if (d.nextServiceDate || d.nextServiceKm) {
    await db.reminder.create({
      data: {
        vehicleId:   d.vehicleId,
        type:        "SERVICE",
        title:       `Next Service Due — ${d.serviceType}`,
        dueDate:     d.nextServiceDate ? new Date(d.nextServiceDate) : null,
        dueKm:       d.nextServiceKm   ?? null,
        status:      "PENDING",
        createdById: user.id,
      },
    });
  }

  await db.auditLog.create({
    data: {
      userId:     user.id,
      action:     "CREATE",
      module:     "SERVICE_ENTRY",
      entityId:   entry.id,
      entityType: "ServiceEntry",
      newValue: { vehicleId: d.vehicleId, serviceType: d.serviceType, cost: d.cost, odometer: d.odometer },
    },
  });

  return NextResponse.json({ id: entry.id }, { status: 201 });
}
