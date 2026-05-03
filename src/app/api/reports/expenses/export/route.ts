import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { csvResponse } from "@/lib/reports/csv";

export async function GET(req: Request) {
  const session = await auth();
  const user = session?.user as { role?: string; branchId?: string } | undefined;
  if (!user) return new Response("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const month = url.searchParams.get("month");
  const vehicle = url.searchParams.get("vehicle");
  const base = month ? new Date(`${month}-01`) : new Date();
  const from = new Date(base.getFullYear(), base.getMonth(), 1);
  const to = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59);
  const isAdmin = ["Super Admin", "Admin"].includes(user.role ?? "");
  const branch = isAdmin ? url.searchParams.get("branch") : user.branchId;
  const branchFilter = branch ? { branchId: branch } : {};

  const [fuel, services, repairs, tyres] = await Promise.all([
    db.fuelEntry.findMany({ where: { ...branchFilter, ...(vehicle ? { vehicleId: vehicle } : {}), date: { gte: from, lte: to } }, include: { vehicle: { select: { vehicleNumber: true, branch: { select: { name: true } } } } } }),
    db.serviceEntry.findMany({ where: { ...branchFilter, ...(vehicle ? { vehicleId: vehicle } : {}), serviceDate: { gte: from, lte: to } }, include: { vehicle: { select: { vehicleNumber: true, branch: { select: { name: true } } } } } }),
    db.repairEntry.findMany({ where: { ...(vehicle ? { vehicleId: vehicle } : {}), repairDate: { gte: from, lte: to }, vehicle: branchFilter }, include: { vehicle: { select: { vehicleNumber: true, branch: { select: { name: true } } } } } }),
    db.tyreRecord.findMany({ where: { ...(vehicle ? { vehicleId: vehicle } : {}), recordDate: { gte: from, lte: to }, vehicle: branchFilter }, include: { vehicle: { select: { vehicleNumber: true, branch: { select: { name: true } } } } } }),
  ]);

  const rows = new Map<string, { branch: string; fuel: number; service: number; repair: number; tyres: number }>();
  const ensure = (vehicle: string, branch: string) => rows.get(vehicle) ?? rows.set(vehicle, { branch, fuel: 0, service: 0, repair: 0, tyres: 0 }).get(vehicle)!;
  fuel.forEach((e) => ensure(e.vehicle.vehicleNumber, e.vehicle.branch?.name ?? "").fuel += Number(e.totalAmount ?? 0));
  services.forEach((e) => ensure(e.vehicle.vehicleNumber, e.vehicle.branch?.name ?? "").service += Number(e.cost ?? 0));
  repairs.forEach((e) => ensure(e.vehicle.vehicleNumber, e.vehicle.branch?.name ?? "").repair += Number(e.cost ?? 0));
  tyres.forEach((e) => ensure(e.vehicle.vehicleNumber, e.vehicle.branch?.name ?? "").tyres += Number(e.cost ?? 0));

  return csvResponse("monthly-expense-report.csv", ["Vehicle", "Branch", "Fuel", "Service", "Repair", "Tyres", "Total"], Array.from(rows.entries()).map(([vehicle, r]) => [
    vehicle, r.branch, r.fuel, r.service, r.repair, r.tyres, r.fuel + r.service + r.repair + r.tyres,
  ]));
}
