import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["APPROVE", "REJECT", "COMPLETE"]),
  remarks: z.string().optional(),
});

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["Super Admin", "Admin", "Vehicle Manager"].includes(user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const request = await db.vehicleDisposalRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Request not found." }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const transitions: Record<string, Record<string, "APPROVED" | "REJECTED" | "COMPLETED">> = {
    REQUESTED: { APPROVE: "APPROVED", REJECT: "REJECTED" },
    APPROVED: { COMPLETE: "COMPLETED" },
  };
  const nextStatus = transitions[request.status]?.[parsed.data.action];
  if (!nextStatus) return NextResponse.json({ error: `Cannot ${parsed.data.action.toLowerCase()} a ${request.status} request.` }, { status: 400 });

  const updated = await db.$transaction(async (tx) => {
    const disposal = await tx.vehicleDisposalRequest.update({
      where: { id },
      data: {
        status: nextStatus,
        approvedById: ["APPROVED", "REJECTED"].includes(nextStatus) ? user.id : request.approvedById,
        remarks: parsed.data.remarks ? `${request.remarks ? `${request.remarks}\n` : ""}${parsed.data.action}: ${parsed.data.remarks}` : request.remarks,
      },
    });
    if (nextStatus === "COMPLETED") {
      await tx.vehicle.update({
        where: { id: request.vehicleId },
        data: { status: request.reason === "SCRAPPED" ? "SCRAPPED" : "SOLD" },
      });
    }
    return disposal;
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      module: "DISPOSAL",
      action: parsed.data.action,
      entityId: id,
      entityType: "VehicleDisposalRequest",
      oldValue: { status: request.status },
      newValue: { status: updated.status, remarks: parsed.data.remarks },
    },
  });

  await createNotification({
    userId: request.requestedById,
    type: nextStatus === "REJECTED" ? "REJECTION" : "DISPOSAL",
    title: `Disposal ${nextStatus.toLowerCase()}`,
    message: `${request.requestNumber} is now ${nextStatus.toLowerCase()}.`,
    link: `/disposal/${id}`,
  });

  return NextResponse.json({ id, status: updated.status });
}
