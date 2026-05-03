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
  if (url.searchParams.get("status") === "active") where.isActive = true;
  if (url.searchParams.get("status") === "inactive") where.isActive = false;

  const drivers = await db.driver.findMany({
    where,
    include: { branch: { select: { name: true } }, indentsAssigned: true, fuelEntries: true, accidentRecords: true },
    orderBy: { name: "asc" },
  });

  return csvResponse("driver-usage-report.csv", ["Driver", "Branch", "Trips", "Completed", "KM Travelled", "Fuel Litres", "Fuel Amount", "Accidents"], drivers.map((d) => {
    const km = d.indentsAssigned.reduce((sum, i) => sum + Math.max(0, (i.actualEndKm ?? 0) - (i.actualStartKm ?? 0)), 0);
    return [
      d.name,
      d.branch?.name,
      d.indentsAssigned.length,
      d.indentsAssigned.filter((i) => ["COMPLETED", "CLOSED"].includes(i.status)).length,
      km,
      d.fuelEntries.reduce((sum, f) => sum + Number(f.quantityLitres ?? 0), 0),
      d.fuelEntries.reduce((sum, f) => sum + Number(f.totalAmount ?? 0), 0),
      d.accidentRecords.length,
    ];
  }));
}
