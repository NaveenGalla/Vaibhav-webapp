// ─────────────────────────────────────────────────────────────────────────────
// Add Vehicle — server-rendered wrapper, renders the client form component
// ─────────────────────────────────────────────────────────────────────────────
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import VehicleForm from "@/components/vehicles/VehicleForm";

export const dynamic = "force-dynamic";

export default async function NewVehiclePage() {
  const session = await auth();
  const user = session?.user as any;

  // Guard — only authorised roles may add vehicles
  if (!["Super Admin", "Admin", "Vehicle Manager"].includes(user?.role)) {
    redirect("/vehicles");
  }

  const [branches, drivers] = await Promise.all([
    db.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.driver.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/vehicles" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <IconMark label="<" tone="gray" /> Back
        </Link>
        <div>
          <h1 className="page-title">Add New Vehicle</h1>
          <p className="page-subtitle">Enter vehicle master details</p>
        </div>
      </div>

      <VehicleForm branches={branches} drivers={drivers} />
    </div>
  );
}
