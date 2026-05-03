// PATCH /api/users/[id] — update user (optionally re-hash password)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";

const VALID_ROLES = [
  "Super Admin","Admin","Branch Manager","Department Head",
  "Approver","Vehicle Manager","Driver","Normal User","Accounts User","Auditor",
] as const;

const schema = z.object({
  name:       z.string().min(1).optional(),
  email:      z.string().email().optional(),
  employeeId: z.string().optional(),
  phone:      z.string().optional(),
  role:       z.enum(VALID_ROLES).optional(),
  branchId:   z.string().optional(),
  isActive:   z.boolean().optional(),
  password:   z.string().min(6).optional(),
});

interface Ctx { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id }  = await params;
  const session = await auth();
  const caller  = session?.user as any;
  if (!["Super Admin", "Admin"].includes(caller?.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const target = await db.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const d = parsed.data;
  const updateData: Record<string, unknown> = {};

  if (d.name       !== undefined) updateData.name       = d.name;
  if (d.email      !== undefined) updateData.email      = d.email;
  if (d.employeeId !== undefined) updateData.employeeId = d.employeeId;
  if (d.phone      !== undefined) updateData.phone      = d.phone;
  if (d.role       !== undefined) updateData.role       = d.role;
  if (d.branchId   !== undefined) updateData.branchId   = d.branchId;
  if (d.isActive   !== undefined) updateData.isActive   = d.isActive;
  if (d.password)                  updateData.password   = await bcrypt.hash(d.password, 12);

  const updated = await db.user.update({ where: { id }, data: updateData });

  await db.auditLog.create({
    data: {
      userId: caller.id, action: "UPDATE", module: "USER",
      entityId: id, entityType: "User",
      oldValue: { email: target.email, role: target.role },
      newValue: { email: updated.email, role: updated.role },
    },
  });

  return NextResponse.json({ id });
}
