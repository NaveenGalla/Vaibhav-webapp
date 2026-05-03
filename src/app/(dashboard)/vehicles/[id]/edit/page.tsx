// ─────────────────────────────────────────────────────────────────────────────
// Edit Vehicle — loads existing data then renders VehicleForm in edit mode
// ─────────────────────────────────────────────────────────────────────────────
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import VehicleForm from "@/components/vehicles/VehicleForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditVehiclePage({ params }: PageProps) {
  const { id }  = await params;
  const session = await auth();
  const user    = session?.user as any;

  if (!["Super Admin", "Admin", "Vehicle Manager"].includes(user?.role)) {
    redirect(`/vehicles/${id}`);
  }

  const [vehicle, branches, drivers] = await Promise.all([
    db.vehicle.findUnique({ where: { id } }),
    db.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.driver.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!vehicle) notFound();

  const defaultValues = {
    vehicleNumber:      vehicle.vehicleNumber,
    vehicleName:        vehicle.vehicleName ?? undefined,
    make:               vehicle.make ?? "",
    model:              vehicle.model ?? "",
    vehicleType:        vehicle.vehicleType as any,
    fuelType:           vehicle.fuelType as any,
    ownershipType:      vehicle.ownershipType as any,
    yearOfManufacture:  vehicle.yearOfManufacture ?? undefined,
    engineNumber:       vehicle.engineNumber ?? undefined,
    chassisNumber:      vehicle.chassisNumber ?? undefined,
    registrationDate:   vehicle.registrationDate
      ? vehicle.registrationDate.toISOString().split("T")[0]
      : undefined,
    registrationExpiry: vehicle.registrationExpiry
      ? vehicle.registrationExpiry.toISOString().split("T")[0]
      : undefined,
    odometer:           vehicle.odometer,
    seatingCapacity:    vehicle.seatingCapacity ?? undefined,
    loadCapacity:       vehicle.loadCapacity ?? undefined,
    colour:             vehicle.colour ?? undefined,
    fastagNumber:       vehicle.fastagNumber ?? undefined,
    purposeOfUsage:     vehicle.purposeOfUsage ?? undefined,
    branchId:           vehicle.branchId ?? undefined,
    driverId:           vehicle.driverId ?? undefined,
    remarks:            vehicle.remarks ?? undefined,
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/vehicles/${id}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <IconMark label="<" tone="gray" /> Back
        </Link>
        <div>
          <h1 className="page-title">Edit Vehicle</h1>
          <p className="page-subtitle">{vehicle.vehicleNumber}</p>
        </div>
      </div>

      <VehicleForm
        branches={branches}
        drivers={drivers}
        defaultValues={defaultValues}
        vehicleId={id}
      />
    </div>
  );
}
