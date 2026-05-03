import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import { notFound } from "next/navigation";
import RenewalForm from "@/components/renewals/RenewalForm";

interface Ctx { params: Promise<{ id: string }> }

export default async function EditRenewalPage({ params }: Ctx) {
  const { id }  = await params;
  const session = await auth();
  const user    = session?.user as any;

  if (!["Super Admin", "Admin"].includes(user?.role)) {
    return (
      <div className="card text-center py-16 max-w-md mx-auto">
        <p className="text-gray-500">Only Admins can edit renewal records.</p>
      </div>
    );
  }

  const [renewal, vehicles] = await Promise.all([
    db.renewal.findUnique({ where: { id } }),
    db.vehicle.findMany({
      select: { id: true, vehicleNumber: true, vehicleName: true },
      orderBy: { vehicleNumber: "asc" },
    }),
  ]);

  if (!renewal) notFound();

  const defaultValues = {
    id:             renewal.id,
    vehicleId:      renewal.vehicleId,
    renewalType:    renewal.renewalType as any,
    issueDate:      renewal.issueDate   ? renewal.issueDate.toISOString().split("T")[0]   : undefined,
    expiryDate:     renewal.expiryDate  ? renewal.expiryDate.toISOString().split("T")[0]  : "",
    policyOrCertNo: renewal.policyOrCertNo ?? undefined,
    insuredValue:   renewal.insuredValue ? Number(renewal.insuredValue) : undefined,
    premium:        renewal.premium      ? Number(renewal.premium)      : undefined,
    provider:       renewal.provider     ?? undefined,
    remarks:        renewal.remarks      ?? undefined,
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/renewals" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <IconMark label="<" tone="gray" /> Back
        </Link>
        <div>
          <h1 className="page-title">Update Document</h1>
          <p className="page-subtitle">Renew or update document details</p>
        </div>
      </div>
      <RenewalForm vehicles={vehicles} defaultValues={defaultValues} isEdit />
    </div>
  );
}
