import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { csvResponse } from "@/lib/reports/csv";

export async function GET(req: Request) {
  const session = await auth();
  const user = session?.user as { role?: string; branchId?: string } | undefined;
  if (!user) return new Response("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const isAdmin = ["Super Admin", "Admin"].includes(user.role ?? "");
  const where: Record<string, unknown> = isAdmin ? {} : { branchId: user.branchId ?? undefined };
  if (isAdmin && url.searchParams.get("branch")) where.branchId = url.searchParams.get("branch")!;
  if (url.searchParams.get("status")) where.status = url.searchParams.get("status")!;
  if (url.searchParams.get("type")) where.vehicleType = url.searchParams.get("type")!;

  const vehicles = await db.vehicle.findMany({
    where,
    include: { branch: { select: { name: true } }, driver: { select: { name: true } }, renewals: true },
    orderBy: { vehicleNumber: "asc" },
  });

  return csvResponse("vehicle-master-report.csv", [
    "Vehicle No", "Name", "Branch", "Driver", "Type", "Fuel", "Ownership", "Status", "Odometer", "Insurance Expiry", "Fitness Expiry",
  ], vehicles.map((v) => [
    v.vehicleNumber,
    v.vehicleName,
    v.branch?.name,
    v.driver?.name,
    v.vehicleType,
    v.fuelType,
    v.ownershipType,
    v.status,
    v.odometer,
    v.renewals.find((r) => r.renewalType === "INSURANCE")?.expiryDate,
    v.renewals.find((r) => r.renewalType === "FITNESS")?.expiryDate,
  ]));
}
