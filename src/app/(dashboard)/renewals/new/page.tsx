import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import RenewalForm from "@/components/renewals/RenewalForm";

export default async function NewRenewalPage() {
  const session = await auth();
  const user    = session?.user as any;

  if (!["Super Admin", "Admin"].includes(user?.role)) {
    return (
      <div className="card text-center py-16 max-w-md mx-auto">
        <p className="text-gray-500">Only Admins can add renewal records.</p>
      </div>
    );
  }

  const vehicles = await db.vehicle.findMany({
    select: { id: true, vehicleNumber: true, vehicleName: true },
    orderBy: { vehicleNumber: "asc" },
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/renewals" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <IconMark label="<" tone="gray" /> Back
        </Link>
        <div>
          <h1 className="page-title">Add Renewal / Document</h1>
          <p className="page-subtitle">Track insurance, PUC, fitness, permit and other renewals</p>
        </div>
      </div>
      <RenewalForm vehicles={vehicles} />
    </div>
  );
}
