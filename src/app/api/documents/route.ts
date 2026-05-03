import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  vehicleId: z.string().min(1),
  documentType: z.enum(["INSURANCE", "POLLUTION", "FITNESS", "PERMIT", "ROAD_TAX", "DRIVER_LICENSE", "AMC", "OTHER"]),
  fileUrl: z.string().optional().nullable(),
  fileName: z.string().optional().nullable(),
  issueDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  amount: z.coerce.number().optional().nullable(),
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

  const document = await db.vehicleDocument.create({
    data: {
      vehicleId: d.vehicleId,
      documentType: d.documentType,
      fileUrl: d.fileUrl ?? null,
      fileName: d.fileName ?? null,
      issueDate: d.issueDate ? new Date(d.issueDate) : null,
      expiryDate: d.expiryDate ? new Date(d.expiryDate) : null,
      amount: d.amount ?? null,
      remarks: d.remarks ?? null,
      uploadedById: user.id,
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      module: "DOCUMENT",
      action: "CREATE",
      entityId: document.id,
      entityType: "VehicleDocument",
      newValue: { vehicleId: d.vehicleId, documentType: d.documentType, expiryDate: d.expiryDate },
    },
  });

  return NextResponse.json({ id: document.id }, { status: 201 });
}
