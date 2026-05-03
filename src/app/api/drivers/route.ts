// POST /api/drivers — create driver
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name:          z.string().min(1),
  employeeId:    z.string().optional(),
  phone:         z.string().optional(),
  email:         z.string().email().optional().or(z.literal("")),
  licenseNumber: z.string().optional(),
  licenseExpiry: z.string().optional(),
  licenseType:   z.string().optional(),
  address:       z.string().optional(),
  branchId:      z.string().min(1),
  isActive:      z.boolean().default(true),
  remarks:       z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const user    = session?.user as any;
  if (!["Super Admin", "Admin"].includes(user?.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const driver = await db.driver.create({
    data: {
      name:          d.name,
      employeeId:    d.employeeId    ?? null,
      phone:         d.phone         ?? null,
      email:         d.email         || null,
      licenseNumber: d.licenseNumber ?? null,
      licenseExpiry: d.licenseExpiry ? new Date(d.licenseExpiry) : null,
      licenseType:   d.licenseType   ?? null,
      address:       d.address       ?? null,
      branchId:      d.branchId,
      isActive:      d.isActive,
      remarks:       d.remarks       ?? null,
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id, action: "CREATE", module: "DRIVER",
      entityId: driver.id, entityType: "Driver",
      newValue: { name: driver.name },
    },
  });

  return NextResponse.json({ id: driver.id }, { status: 201 });
}
