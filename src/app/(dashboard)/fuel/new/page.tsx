import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import FuelEntryForm from "@/components/fuel/FuelEntryForm";

export default async function NewFuelEntryPage() {
  const session = await auth();
  const user    = session?.user as any;

  const branchFilter = ["Super Admin", "Admin"].includes(user?.role)
    ? {} : { branchId: user?.branchId ?? undefined };

  const [vehicles, drivers, indents] = await Promise.all([
    db.vehicle.findMany({
      where: { ...branchFilter, status: { in: ["ACTIVE", "IN_SERVICE"] } },
      select: { id: true, vehicleNumber: true, vehicleName: true, odometer: true, fuelType: true },
      orderBy: { vehicleNumber: "asc" },
    }),
    db.driver.findMany({
      where: { ...branchFilter, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.indent.findMany({
      where: { ...branchFilter, status: { in: ["ASSIGNED", "IN_USE"] } },
      select: { id: true, indentNumber: true, purpose: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/fuel" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <IconMark label="<" tone="gray" /> Back
        </Link>
        <div>
          <h1 className="page-title">Add Fuel Entry</h1>
          <p className="page-subtitle">Record a vehicle fuel fill-up</p>
        </div>
      </div>
      <FuelEntryForm vehicles={vehicles} drivers={drivers} indents={indents} />
    </div>
  );
}
