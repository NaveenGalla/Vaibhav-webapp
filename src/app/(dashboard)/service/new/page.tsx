import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import ServiceEntryForm from "@/components/service/ServiceEntryForm";

export const dynamic = "force-dynamic";

export default async function NewServiceEntryPage() {
  const session = await auth();
  const user    = session?.user as any;

  const canCreate = ["Super Admin", "Admin", "Branch Manager", "Vehicle Manager"].includes(user?.role);
  if (!canCreate) {
    return (
      <div className="card text-center py-16 max-w-md mx-auto">
        <p className="text-gray-500">You do not have permission to add service entries.</p>
      </div>
    );
  }

  const branchFilter = ["Super Admin", "Admin"].includes(user?.role)
    ? {} : { branchId: user?.branchId ?? undefined };

  const vehicles = await db.vehicle.findMany({
    where: { ...branchFilter },
    select: { id: true, vehicleNumber: true, vehicleName: true, odometer: true },
    orderBy: { vehicleNumber: "asc" },
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/service" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <IconMark label="<" tone="gray" /> Back
        </Link>
        <div>
          <h1 className="page-title">Add Service Entry</h1>
          <p className="page-subtitle">Record a vehicle service or maintenance event</p>
        </div>
      </div>
      <ServiceEntryForm vehicles={vehicles} />
    </div>
  );
}
