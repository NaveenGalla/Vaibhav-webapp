import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { csvResponse } from "@/lib/reports/csv";

export async function GET(req: Request) {
  const session = await auth();
  const user = session?.user as { role?: string; branchId?: string } | undefined;
  if (!user) return new Response("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const isAdmin = ["Super Admin", "Admin"].includes(user.role ?? "");
  const branch = isAdmin ? url.searchParams.get("branch") : user.branchId;
  const vehicle = url.searchParams.get("vehicle");
  const where: Record<string, unknown> = branch ? { branchId: branch } : {};
  if (from || to) where.vehicleReqDate = { gte: from ? new Date(from) : undefined, lte: to ? new Date(`${to}T23:59:59`) : undefined };
  if (vehicle) where.assignedVehicleId = vehicle;

  const indents = await db.indent.findMany({
    where,
    include: { branch: { select: { name: true } }, requestedBy: { select: { name: true } }, assignedVehicle: { select: { vehicleNumber: true } }, assignedDriver: { select: { name: true } }, approvals: true },
    orderBy: { vehicleReqDate: "desc" },
  });

  return csvResponse("indent-approval-report.csv", ["Indent", "Date", "Branch", "Requested By", "Purpose", "Destination", "Status", "Vehicle", "Driver", "Estimated KM", "Actual KM", "Approvals"], indents.map((i) => [
    i.indentNumber,
    i.vehicleReqDate,
    i.branch.name,
    i.requestedBy.name,
    i.purpose,
    i.destination,
    i.status,
    i.assignedVehicle?.vehicleNumber,
    i.assignedDriver?.name,
    i.estimatedKm,
    i.actualStartKm != null && i.actualEndKm != null ? i.actualEndKm - i.actualStartKm : null,
    `${i.approvals.filter((a) => a.status === "APPROVED").length}/${i.approvals.length}`,
  ]));
}
