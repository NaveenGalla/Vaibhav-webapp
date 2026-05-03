import { db } from "@/lib/db";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import OperationForm from "@/components/operations/OperationForm";

export const dynamic = "force-dynamic";

export default async function NewAccidentPage() {
  const [vehicles, drivers] = await Promise.all([
    db.vehicle.findMany({ select: { id: true, vehicleNumber: true, vehicleName: true }, orderBy: { vehicleNumber: "asc" } }),
    db.driver.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return <NewShell back="/accidents" title="Add Accident Record"><OperationForm kind="accidents" vehicles={vehicles.map(v => ({ id: v.id, name: v.vehicleNumber, extra: v.vehicleName }))} drivers={drivers} /></NewShell>;
}

function NewShell({ back, title, children }: { back: string; title: string; children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl"><div className="mb-6 flex items-center gap-3"><Link href={back} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"><IconMark label="<" tone="gray" /> Back</Link><div><h1 className="page-title">{title}</h1><p className="page-subtitle">Create a new operational record</p></div></div>{children}</div>;
}
