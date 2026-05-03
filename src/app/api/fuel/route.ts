// ─────────────────────────────────────────────────────────────────────────────
// POST /api/fuel — create a new fuel entry
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  vehicleId:           z.string().min(1),
  date:                z.string().min(1),
  fuelType:            z.enum(["PETROL", "DIESEL", "CNG", "EV", "HYBRID"]),
  quantityLitres:      z.coerce.number().positive(),
  ratePerLitre:        z.coerce.number().positive(),
  totalAmount:         z.coerce.number().positive(),
  fuelStation:         z.string().optional().nullable(),
  billNumber:          z.string().optional().nullable(),
  odometer:            z.coerce.number().min(0),
  openingKm:           z.coerce.number().optional().nullable(),
  closingKm:           z.coerce.number().optional().nullable(),
  driverName:          z.string().optional().nullable(),
  indentId:            z.string().optional().nullable(),
  officialOrPersonal:  z.enum(["OFFICIAL", "PERSONAL"]).default("OFFICIAL"),
  remarks:             z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const user    = session?.user as any;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  // Verify vehicle exists
  const vehicle = await db.vehicle.findUnique({ where: { id: d.vehicleId } });
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });

  // Odometer guard — new reading must be ≥ vehicle's last recorded odometer
  // (unless admin overrides — for now we enforce it strictly)
  if (d.odometer < vehicle.odometer) {
    return NextResponse.json(
      { error: `Odometer (${d.odometer} km) cannot be less than vehicle's last recorded odometer (${vehicle.odometer} km).` },
      { status: 400 }
    );
  }

  // Verify indent if provided
  if (d.indentId) {
    const indent = await db.indent.findUnique({ where: { id: d.indentId } });
    if (!indent) return NextResponse.json({ error: "Indent not found." }, { status: 404 });
  }

  // Determine branch from vehicle (fall back to user's branch)
  const branchId = vehicle.branchId ?? user.branchId ?? null;

  const entry = await db.fuelEntry.create({
    data: {
      vehicleId:          d.vehicleId,
      branchId:           branchId,
      date:               new Date(d.date),
      fuelType:           d.fuelType,
      quantityLitres:     d.quantityLitres,
      ratePerLitre:       d.ratePerLitre,
      totalAmount:        d.totalAmount,
      fuelStation:        d.fuelStation ?? null,
      billNumber:         d.billNumber  ?? null,
      odometer:           d.odometer,
      openingKm:          d.openingKm   ?? null,
      closingKm:          d.closingKm   ?? null,
      driverName:         d.driverName  ?? null,
      indentId:           d.indentId    ?? null,
      officialOrPersonal: d.officialOrPersonal,
      remarks:            d.remarks     ?? null,
      enteredById:        user.id,
      approvalStatus:     "PENDING",
    },
  });

  // Update vehicle odometer to latest reading
  await db.vehicle.update({
    where: { id: d.vehicleId },
    data:  { odometer: d.odometer },
  });

  await db.auditLog.create({
    data: {
      userId:     user.id,
      action:     "CREATE",
      module:     "FUEL_ENTRY",
      entityId:   entry.id,
      entityType: "FuelEntry",
      newValue: { vehicleId: d.vehicleId, quantityLitres: d.quantityLitres, totalAmount: d.totalAmount, odometer: d.odometer },
    },
  });

  return NextResponse.json({ id: entry.id }, { status: 201 });
}
