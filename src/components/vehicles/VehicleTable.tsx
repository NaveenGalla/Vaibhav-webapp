// ─────────────────────────────────────────────────────────────────────────────
// VehicleTable — renders the vehicle list in a branded data table
// ─────────────────────────────────────────────────────────────────────────────
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";

type VehicleRow = {
  id: string;
  vehicleNumber: string;
  vehicleName: string | null;
  make: string | null;
  model: string | null;
  vehicleType: string;
  ownershipType: string;
  status: string;
  fuelType: string;
  odometer: number;
  branch: { id: string; name: string } | null;
  driver: { id: string; name: string } | null;
  _count: { fuelEntries: number; serviceEntries: number; documents: number };
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:     "badge-green",
  IN_SERVICE: "badge-amber",
  INACTIVE:   "badge-gray",
  DISPOSED:   "badge-red",
};

const TYPE_LABEL: Record<string, string> = {
  FOUR_WHEELER: "4W",
  TWO_WHEELER:  "2W",
  VAN:          "Van",
  TRUCK:        "Truck",
  OTHER:        "Other",
};

export default function VehicleTable({ vehicles }: { vehicles: VehicleRow[] }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Make / Model</th>
              <th>Type</th>
              <th>Branch</th>
              <th>Driver</th>
              <th>Odometer (km)</th>
              <th>Status</th>
              <th>Records</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.id}>
                <td>
                  <Link
                    href={`/vehicles/${v.id}`}
                    className="font-semibold text-slate-950 hover:text-slate-700"
                  >
                    {v.vehicleNumber}
                  </Link>
                  {v.vehicleName && (
                    <p className="text-xs text-gray-400">{v.vehicleName}</p>
                  )}
                </td>
                <td className="text-gray-700">
                  {v.make ?? "—"} {v.model ?? ""}
                </td>
                <td>
                  <span className="badge badge-blue text-[11px]">
                    {TYPE_LABEL[v.vehicleType] ?? v.vehicleType}
                  </span>
                </td>
                <td className="text-gray-600 text-[13px]">
                  {v.branch?.name ?? "—"}
                </td>
                <td className="text-gray-600 text-[13px]">
                  {v.driver?.name ?? <span className="text-gray-400 italic">Unassigned</span>}
                </td>
                <td className="text-gray-700 tabular-nums">
                  {v.odometer.toLocaleString("en-IN")}
                </td>
                <td>
                  <span className={`badge ${STATUS_BADGE[v.status] ?? "badge-gray"}`}>
                    {v.status.replace("_", " ")}
                  </span>
                </td>
                <td className="text-xs text-gray-500">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-slate-100 px-2 py-1" title="Fuel entries">F {v._count.fuelEntries}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1" title="Service entries">S {v._count.serviceEntries}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1" title="Documents">D {v._count.documents}</span>
                  </div>
                </td>
                <td>
                  <Link
                    href={`/vehicles/${v.id}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
                  >
                    <IconMark label=">" tone="gray" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
