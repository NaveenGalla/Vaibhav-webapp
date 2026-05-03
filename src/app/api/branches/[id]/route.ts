import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name:     z.string().min(1).optional(),
  code:     z.string().optional(),
  address:  z.string().optional(),
  city:     z.string().optional(),
  state:    z.string().optional(),
  phone:    z.string().optional(),
  email:    z.string().email().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

interface Ctx { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id }  = await params;
  const session = await auth();
  const user    = session?.user as any;
  if (!["Super Admin", "Admin"].includes(user?.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const branch = await db.branch.findUnique({ where: { id } });
  if (!branch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const d = parsed.data;
  const updated = await db.branch.update({
    where: { id },
    data: {
      ...(d.name     !== undefined && { name:     d.name }),
      ...(d.code     !== undefined && { code:     d.code }),
      ...(d.address  !== undefined && { address:  d.address }),
      ...(d.city     !== undefined && { city:     d.city }),
      ...(d.state    !== undefined && { state:    d.state }),
      ...(d.phone    !== undefined && { phone:    d.phone }),
      ...(d.email    !== undefined && { email:    d.email || null }),
      ...(d.isActive !== undefined && { isActive: d.isActive }),
    },
  });

  await db.auditLog.create({
    data: { userId: user.id, action: "UPDATE", module: "BRANCH",
      entityId: id, entityType: "Branch",
      oldValue: { name: branch.name, isActive: branch.isActive }, newValue: { name: updated.name, isActive: updated.isActive } },
  });

  return NextResponse.json({ id });
}
