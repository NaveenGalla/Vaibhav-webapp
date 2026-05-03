import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification, notifyRoles } from "@/lib/notifications";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["SUBMIT", "APPROVE", "REJECT", "FULFILL"]),
  remarks: z.string().optional(),
});

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["Super Admin", "Admin", "Branch Manager", "Vehicle Manager"].includes(user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const request = await db.vehicleProcurementRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Request not found." }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const transitions: Record<string, Record<string, "SUBMITTED" | "APPROVED" | "REJECTED" | "FULFILLED">> = {
    DRAFT: { SUBMIT: "SUBMITTED" },
    SUBMITTED: { APPROVE: "APPROVED", REJECT: "REJECTED" },
    APPROVED: { FULFILL: "FULFILLED" },
  };
  const nextStatus = transitions[request.status]?.[parsed.data.action];
  if (!nextStatus) return NextResponse.json({ error: `Cannot ${parsed.data.action.toLowerCase()} a ${request.status} request.` }, { status: 400 });

  const updated = await db.vehicleProcurementRequest.update({
    where: { id },
    data: {
      status: nextStatus,
      approvedById: ["APPROVED", "REJECTED"].includes(nextStatus) ? user.id : request.approvedById,
      remarks: parsed.data.remarks ? `${request.remarks ? `${request.remarks}\n` : ""}${parsed.data.action}: ${parsed.data.remarks}` : request.remarks,
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      module: "PROCUREMENT",
      action: parsed.data.action,
      entityId: id,
      entityType: "VehicleProcurementRequest",
      oldValue: { status: request.status },
      newValue: { status: updated.status, remarks: parsed.data.remarks },
    },
  });

  await createNotification({
    userId: request.requestedById,
    type: nextStatus === "REJECTED" ? "REJECTION" : "PROCUREMENT",
    title: `Procurement ${nextStatus.toLowerCase()}`,
    message: `${request.requestNumber} is now ${nextStatus.toLowerCase()}.`,
    link: `/procurement/${id}`,
  });
  if (nextStatus === "SUBMITTED") {
    await notifyRoles(["Super Admin", "Admin", "Vehicle Manager"], {
      type: "PROCUREMENT",
      title: "Procurement approval required",
      message: `${request.requestNumber} is waiting for approval.`,
      link: `/procurement/${id}`,
    });
  }

  return NextResponse.json({ id, status: updated.status });
}
