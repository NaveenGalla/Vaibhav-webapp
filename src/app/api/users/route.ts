// POST /api/users — create user with hashed password
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
  name:       z.string().min(1),
  email:      z.string().email(),
  employeeId: z.string().optional(),
  phone:      z.string().optional(),
  role:       z.enum(VALID_ROLES),
  branchId:   z.string().min(1),
  isActive:   z.boolean().default(true),
  password:   z.string().min(6),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const caller  = session?.user as any;
  if (!["Super Admin", "Admin"].includes(caller?.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  const existing = await db.user.findUnique({ where: { email: d.email } });
  if (existing)
    return NextResponse.json({ error: "Email already registered." }, { status: 409 });

  const hashed = await bcrypt.hash(d.password, 12);

  const newUser = await db.user.create({
    data: {
      name:       d.name,
      email:      d.email,
      employeeId: d.employeeId ?? null,
      phone:      d.phone      ?? null,
      role:       d.role,
      branchId:   d.branchId,
      isActive:   d.isActive,
      password:   hashed,
    },
  });

  await db.auditLog.create({
    data: {
      userId: caller.id, action: "CREATE", module: "USER",
      entityId: newUser.id, entityType: "User",
      newValue: { email: newUser.email, role: newUser.role },
    },
  });

  return NextResponse.json({ id: newUser.id }, { status: 201 });
}
