import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyRoles } from "@/lib/notifications";
import { generateRefNumber } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  branchId: z.string().min(1),
  vehicleType: z.enum(["FOUR_WHEELER", "TWO_WHEELER", "VAN", "TRUCK", "OTHER"]),
  fuelType: z.enum(["PETROL", "DIESEL", "CNG", "EV", "HYBRID"]),
  purpose: z.enum(["ADMIN", "SRM", "BTL_BRANDING", "MARKETING_BRANDING", "MANAGEMENT", "CMD_HOUSE", "D2D_BRANDING", "V_SQUARE", "OTHER"]).optional().or(z.literal("")),
  preferredBrand: z.string().optional().nullable(),
  requiredByDate: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "SUBMITTED"]).default("SUBMITTED"),
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
  const count = await db.vehicleProcurementRequest.count();
  const request = await db.vehicleProcurementRequest.create({
    data: {
      requestNumber: generateRefNumber("PROC", count + 1),
      branchId: d.branchId,
      vehicleType: d.vehicleType,
      fuelType: d.fuelType,
      purpose: d.purpose || null,
      preferredBrand: d.preferredBrand ?? null,
      requiredByDate: d.requiredByDate ? new Date(d.requiredByDate) : null,
      status: d.status,
      remarks: d.remarks ?? null,
      requestedById: user.id,
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      module: "PROCUREMENT",
      action: "CREATE",
      entityId: request.id,
      entityType: "VehicleProcurementRequest",
      newValue: { requestNumber: request.requestNumber, status: request.status },
    },
  });

  if (request.status === "SUBMITTED") {
    await notifyRoles(["Super Admin", "Admin", "Vehicle Manager"], {
      type: "PROCUREMENT",
      title: "Procurement approval required",
      message: `${request.requestNumber} is waiting for approval.`,
      link: `/procurement/${request.id}`,
    });
  }

  return NextResponse.json({ id: request.id }, { status: 201 });
}
