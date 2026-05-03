// ─────────────────────────────────────────────────────────────────────────────
// Edit Driver
// ─────────────────────────────────────────────────────────────────────────────
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import DriverForm from "@/components/drivers/DriverForm";

export const dynamic = "force-dynamic";

interface PageProps { params: Promise<{ id: string }> }

export default async function EditDriverPage({ params }: PageProps) {
  const { id }  = await params;
  const session = await auth();
  const user    = session?.user as any;

  if (!["Super Admin", "Admin"].includes(user?.role)) redirect("/drivers");

  const [driver, branches] = await Promise.all([
    db.driver.findUnique({ where: { id } }),
    db.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!driver) notFound();

  const defaultValues = {
    name:          driver.name,
    employeeId:    driver.employeeId ?? undefined,
    phone:         driver.phone      ?? undefined,
    email:         driver.email      ?? undefined,
    licenseNumber: driver.licenseNumber ?? undefined,
    licenseExpiry: driver.licenseExpiry
      ? driver.licenseExpiry.toISOString().split("T")[0] : undefined,
    licenseType:   driver.licenseType ?? undefined,
    address:       driver.address ?? undefined,
    branchId:      driver.branchId ?? undefined,
    isActive:      driver.isActive,
    remarks:       driver.remarks ?? undefined,
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/drivers" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <IconMark label="<" tone="gray" /> Back
        </Link>
        <div>
          <h1 className="page-title">Edit Driver</h1>
          <p className="page-subtitle">{driver.name}</p>
        </div>
      </div>
      <DriverForm branches={branches} defaultValues={defaultValues} driverId={id} />
    </div>
  );
}
