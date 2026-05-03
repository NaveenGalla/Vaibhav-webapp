// ─────────────────────────────────────────────────────────────────────────────
// Fuel Consumption Report — vehicle-wise aggregated summary
// ─────────────────────────────────────────────────────────────────────────────
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string; branch?: string; vehicle?: string }>;
}

export default async function FuelReportPage({ searchParams }: PageProps) {
  const session = await auth();
  const user    = session?.user as any;
  const params  = await searchParams;

  const isAdmin      = ["Super Admin", "Admin"].includes(user?.role);
  const branchFilter = isAdmin ? {} : { branchId: user?.branchId ?? undefined };

  // Date range defaults to current month
  const now   = new Date();
  const from  = params.from ? new Date(params.from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to    = params.to   ? new Date(params.to + "T23:59:59") : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const where: Record<string, unknown> = {
    ...branchFilter,
    approvalStatus: "APPROVED",
    date: { gte: from, lte: to },
  };
  if (params.vehicle) where.vehicleId = params.vehicle;

  // Vehicle-wise aggregation
  const entries = await db.fuelEntry.findMany({
    where,
    include: {
      vehicle: {
        select: {
          vehicleNumber: true, vehicleName: true, fuelType: true,
          branch: { select: { name: true } },
        },
      },
    },
    orderBy: [{ vehicleId: "asc" }, { date: "asc" }],
  });

  // Aggregate per vehicle
  type VehicleStat = {
    vehicleNumber: string; vehicleName: string | null;
    fuelType: string; branch: string;
    totalLitres: number; totalCost: number;
    entries: number; kmTravelled: number | null;
    avgKmPerLitre: number | null;
  };

  const vehicleMap = new Map<string, VehicleStat>();
  for (const e of entries) {
    const key = e.vehicleId;
    if (!vehicleMap.has(key)) {
      vehicleMap.set(key, {
        vehicleNumber: e.vehicle.vehicleNumber,
        vehicleName:   e.vehicle.vehicleName,
        fuelType:      e.vehicle.fuelType,
        branch:        (e.vehicle as any).branch?.name ?? "—",
        totalLitres:   0, totalCost: 0, entries: 0,
        kmTravelled:   null, avgKmPerLitre: null,
      });
    }
    const stat = vehicleMap.get(key)!;
    stat.totalLitres += Number(e.quantityLitres);
    stat.totalCost   += Number(e.totalAmount);
    stat.entries     += 1;
    if (e.openingKm != null && e.closingKm != null) {
      const km = Number(e.closingKm) - Number(e.openingKm);
      stat.kmTravelled = (stat.kmTravelled ?? 0) + km;
    }
  }

  // Compute avg km/L
  for (const stat of vehicleMap.values()) {
    if (stat.kmTravelled && stat.totalLitres > 0) {
      stat.avgKmPerLitre = stat.kmTravelled / stat.totalLitres;
    }
  }

  const stats = Array.from(vehicleMap.values())
    .sort((a, b) => b.totalCost - a.totalCost);

  const totalCost   = stats.reduce((s, v) => s + v.totalCost,   0);
  const totalLitres = stats.reduce((s, v) => s + v.totalLitres, 0);

  const branches = isAdmin
    ? await db.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
    : [];

  const vehicles = await db.vehicle.findMany({
    where: branchFilter,
    select: { id: true, vehicleNumber: true },
    orderBy: { vehicleNumber: "asc" },
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/reports" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <IconMark label="<" tone="gray" /> Reports
        </Link>
        <div className="flex-1">
          <h1 className="page-title">Fuel Consumption Report</h1>
          <p className="page-subtitle">{stats.length} vehicles — {entries.length} entries (approved)</p>
        </div>
        <a href={`/api/reports/fuel/export?${new URLSearchParams(params as any)}`}
          className="btn-secondary flex items-center gap-2 text-sm">
          <IconMark label="X" /> Export Excel
        </a>
      </div>

      {/* Filters */}
      <div className="card mb-4 py-3">
        <form method="GET" className="flex gap-3 flex-wrap">
          <input type="date" name="from" defaultValue={params.from ?? from.toISOString().split("T")[0]}
            className="form-input w-auto" title="From" />
          <input type="date" name="to"   defaultValue={params.to ?? to.toISOString().split("T")[0]}
            className="form-input w-auto" title="To" />
          {isAdmin && branches.length > 0 && (
            <select name="branch" defaultValue={params.branch ?? ""} className="form-input w-auto">
              <option value="">All Branches</option>
              {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <select name="vehicle" defaultValue={params.vehicle ?? ""} className="form-input w-auto">
            <option value="">All Vehicles</option>
            {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}
          </select>
          <button type="submit" className="btn-primary px-5">Apply</button>
          <Link href="/reports/fuel" className="btn-ghost px-4">Reset</Link>
        </form>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div className="card py-3">
          <p className="kpi-label">Total Cost</p>
          <p className="kpi-value text-xl mt-1">{formatCurrency(totalCost)}</p>
        </div>
        <div className="card py-3">
          <p className="kpi-label">Total Litres</p>
          <p className="kpi-value text-xl mt-1">{totalLitres.toFixed(1)} L</p>
        </div>
        <div className="card py-3">
          <p className="kpi-label">Vehicles</p>
          <p className="kpi-value text-xl mt-1">{stats.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Branch</th>
                <th>Fuel Type</th>
                <th>Entries</th>
                <th>Total Litres</th>
                <th>Total Cost</th>
                <th>Avg Rate/L</th>
                <th>Km Travelled</th>
                <th>Avg km/L</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s, i) => (
                <tr key={i}>
                  <td>
                    <p className="font-semibold text-sm text-slate-950">{s.vehicleNumber}</p>
                    {s.vehicleName && <p className="text-xs text-gray-400">{s.vehicleName}</p>}
                  </td>
                  <td className="text-sm text-gray-600">{s.branch}</td>
                  <td><span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{s.fuelType}</span></td>
                  <td className="tabular-nums text-sm">{s.entries}</td>
                  <td className="tabular-nums text-sm">{s.totalLitres.toFixed(2)} L</td>
                  <td className="tabular-nums font-semibold text-sm text-slate-950">
                    {formatCurrency(s.totalCost)}
                  </td>
                  <td className="tabular-nums text-sm text-gray-500">
                    {s.totalLitres > 0 ? `₹${(s.totalCost / s.totalLitres).toFixed(2)}` : "—"}
                  </td>
                  <td className="tabular-nums text-sm text-gray-500">
                    {s.kmTravelled != null ? `${s.kmTravelled.toLocaleString("en-IN")} km` : "—"}
                  </td>
                  <td className="tabular-nums text-sm font-medium">
                    {s.avgKmPerLitre != null ? (
                      <span style={{ color: s.avgKmPerLitre < 8 ? "#dc2626" : s.avgKmPerLitre < 12 ? "#d97706" : "#16a34a" }}>
                        {s.avgKmPerLitre.toFixed(2)}
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={4} className="text-right text-sm pr-3">Total</td>
                <td className="tabular-nums text-sm">{totalLitres.toFixed(2)} L</td>
                <td className="tabular-nums text-sm text-slate-950">{formatCurrency(totalCost)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
