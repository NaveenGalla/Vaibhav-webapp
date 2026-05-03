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
  const branchFilter = branch ? { branchId: branch } : {};
  const dateFilter = from || to ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(`${to}T23:59:59`) : undefined } : undefined;

  const [services, repairs] = await Promise.all([
    db.serviceEntry.findMany({
      where: { ...branchFilter, ...(vehicle ? { vehicleId: vehicle } : {}), ...(dateFilter ? { serviceDate: dateFilter } : {}) },
      include: { vehicle: { select: { vehicleNumber: true, branch: { select: { name: true } } } } },
      orderBy: { serviceDate: "desc" },
    }),
    db.repairEntry.findMany({
      where: { ...(vehicle ? { vehicleId: vehicle } : {}), ...(dateFilter ? { repairDate: dateFilter } : {}), vehicle: branchFilter },
      include: { vehicle: { select: { vehicleNumber: true, branch: { select: { name: true } } } } },
      orderBy: { repairDate: "desc" },
    }),
  ]);

  const rows = [
    ...services.map((s) => ["Service", s.serviceDate, s.vehicle.vehicleNumber, s.vehicle.branch?.name, s.serviceType, s.odometer, s.vendor, s.invoiceNumber, Number(s.cost ?? 0)]),
    ...repairs.map((r) => ["Repair", r.repairDate, r.vehicle.vehicleNumber, r.vehicle.branch?.name, r.repairType, r.odometer, r.vendor, r.invoiceNumber, Number(r.cost ?? 0)]),
  ];

  return csvResponse("service-repair-report.csv", ["Kind", "Date", "Vehicle", "Branch", "Type", "Odometer", "Vendor", "Invoice", "Cost"], rows);
}
