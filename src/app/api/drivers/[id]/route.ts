// PATCH /api/drivers/[id] — update driver
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name:          z.string().min(1).optional(),
  employeeId:    z.string().optional(),
  phone:         z.string().optional(),
  email:         z.string().email().optional().or(z.literal("")),
  licenseNumber: z.string().optional(),
  licenseExpiry: z.string().optional(),
  licenseType:   z.string().optional(),
  address:       z.string().optional(),
  branchId:      z.string().optional(),
  isActive:      z.boolean().optional(),
  remarks:       z.string().optional(),
});

interface Ctx { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id }  = await params;
  const session = await auth();
  const user    = session?.user as any;
  if (!["Super Admin", "Admin"].includes(user?.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const driver = await db.driver.findUnique({ where: { id } });
  if (!driver) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const d = parsed.data;
  const updated = await db.driver.update({
    where: { id },
    data: {
      ...(d.name          !== undefined && { name:          d.name }),
      ...(d.employeeId    !== undefined && { employeeId:    d.employeeId }),
      ...(d.phone         !== undefined && { phone:         d.phone }),
      ...(d.email         !== undefined && { email:         d.email || null }),
      ...(d.licenseNumber !== undefined && { licenseNumber: d.licenseNumber }),
      ...(d.licenseExpiry !== undefined && { licenseExpiry: new Date(d.licenseExpiry!) }),
      ...(d.licenseType   !== undefined && { licenseType:   d.licenseType }),
      ...(d.address       !== undefined && { address:       d.address }),
      ...(d.branchId      !== undefined && { branchId:      d.branchId }),
      ...(d.isActive      !== undefined && { isActive:      d.isActive }),
      ...(d.remarks       !== undefined && { remarks:       d.remarks }),
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id, action: "UPDATE", module: "DRIVER",
      entityId: id, entityType: "Driver",
      oldValue: { name: driver.name, phone: driver.phone, status: driver.status }, newValue: { name: updated.name, phone: updated.phone, status: updated.status },
    },
  });

  return NextResponse.json({ id });
}
