// ─────────────────────────────────────────────────────────────────────────────
// Fuel Entry — list page with approval status filter
// ─────────────────────────────────────────────────────────────────────────────
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import { formatCurrency, formatDate, formatKm } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{
    q?: string; status?: string; branch?: string;
    vehicle?: string; from?: string; to?: string; page?: string;
  }>;
}

const PAGE_SIZE = 30;

export default async function FuelPage({ searchParams }: PageProps) {
  const session = await auth();
  const user    = session?.user as any;
  const params  = await searchParams;

  const isAdmin    = ["Super Admin", "Admin", "Accounts User"].includes(user?.role);
  const isApprover = ["Branch Manager", "Approver"].includes(user?.role);
  const branchFilter = isAdmin ? {} : { branchId: user?.branchId ?? undefined };

  const page   = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.q?.trim() ?? "";
  const where: Record<string, unknown> = { ...branchFilter };

  if (search) {
    where.OR = [
      { vehicle:     { vehicleNumber: { contains: search, mode: "insensitive" } } },
      { billNumber:  { contains: search, mode: "insensitive" } },
      { fuelStation: { contains: search, mode: "insensitive" } },
      { driverName:  { contains: search, mode: "insensitive" } },
    ];
  }
  if (params.status) where.approvalStatus = params.status;
  if (params.vehicle) where.vehicleId     = params.vehicle;
  if (params.from || params.to) {
    where.date = {
      ...(params.from ? { gte: new Date(params.from) } : {}),
      ...(params.to   ? { lte: new Date(params.to)   } : {}),
    };
  }

  const [total, entries, branches] = await Promise.all([
    db.fuelEntry.count({ where }),
    db.fuelEntry.findMany({
      where,
      include: {
        vehicle:    { select: { vehicleNumber: true, vehicleName: true } },
        enteredBy:  { select: { name: true } },
        approvedBy: { select: { name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip:  (page - 1) * PAGE_SIZE,
      take:  PAGE_SIZE,
    }),
    db.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Month totals for summary row
  const now       = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthTotals = await db.fuelEntry.aggregate({
    where: { ...branchFilter, date: { gte: monthStart }, approvalStatus: "APPROVED" },
    _sum:  { totalAmount: true, quantityLitres: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="page-title">Fuel Entries</h1>
          <p className="page-subtitle">{total} entr{total !== 1 ? "ies" : "y"}</p>
        </div>
        <Link href="/fuel/new" className="btn-primary">
          <IconMark label="+" /> Add Fuel Entry
        </Link>
      </div>

      {/* Month summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div className="card py-3">
          <p className="kpi-label">This Month — Cost</p>
          <p className="kpi-value text-xl mt-1">
            {formatCurrency(Number(monthTotals._sum.totalAmount ?? 0))}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Approved entries only</p>
        </div>
        <div className="card py-3">
          <p className="kpi-label">This Month — Litres</p>
          <p className="kpi-value text-xl mt-1">
            {Number(monthTotals._sum.quantityLitres ?? 0).toFixed(1)} L
          </p>
        </div>
        <div className="card py-3">
          <p className="kpi-label">Pending Approval</p>
          <p className="kpi-value text-xl mt-1" style={{ color: "#b45309" }}>
            {entries.filter((e: any) => e.approvalStatus === "PENDING").length}
          </p>
        </div>
      </div>

      {/* Quick status pills */}
      <div className="flex gap-2 flex-wrap mb-4">
        {["", "PENDING", "APPROVED", "REJECTED"].map((s: any) => (
          <Link key={s}
            href={`/fuel?${new URLSearchParams({ ...params, status: s, page: "1" })}`}
            className="px-3 py-1 rounded-full text-xs font-semibold border transition-colors"
            style={{
              background:  params.status === s || (!params.status && s === "") ? "#111827" : "#fff",
              color:       params.status === s || (!params.status && s === "") ? "#fff" : "#6b7280",
              borderColor: "rgba(107,29,29,0.3)",
            }}>
            {s === "" ? "All" : s}
          </Link>
        ))}
      </div>

      {/* Search + filters */}
      <div className="card mb-4 py-3">
        <form method="GET" className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <IconMark label="S" tone="gray" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input type="text" name="q" defaultValue={search}
              placeholder="Search vehicle, bill no., station, driver…"
              className="form-input pl-9" />
          </div>
          <input type="date" name="from" defaultValue={params.from ?? ""} className="form-input w-auto" title="From date" />
          <input type="date" name="to"   defaultValue={params.to   ?? ""} className="form-input w-auto" title="To date" />
          <input type="hidden" name="status" value={params.status ?? ""} />
          <button type="submit" className="btn-primary px-5">Search</button>
          {(search || params.from || params.to) && (
            <Link href={`/fuel?status=${params.status ?? ""}`} className="btn-ghost px-4">Clear</Link>
          )}
        </form>
      </div>

      {/* Table */}
      {entries.length === 0 ? (
        <div className="card text-center py-16">
          <IconMark label="F" size="lg" className="mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No fuel entries found</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Litres</th>
                  <th>Rate/L</th>
                  <th>Amount</th>
                  <th>Odometer</th>
                  <th>Station</th>
                  <th>Bill No.</th>
                  <th>Driver</th>
                  <th>Entered By</th>
                  <th>Status</th>
                  {(isAdmin || isApprover) && <th></th>}
                </tr>
              </thead>
              <tbody>
                {entries.map((e: any) => (
                  <tr key={e.id}>
                    <td className="text-sm text-gray-600">{formatDate(e.date)}</td>
                    <td>
                      <p className="font-semibold text-sm text-slate-950">
                        {e.vehicle.vehicleNumber}
                      </p>
                      {e.vehicle.vehicleName && (
                        <p className="text-xs text-gray-400">{e.vehicle.vehicleName}</p>
                      )}
                    </td>
                    <td className="tabular-nums text-sm">{Number(e.quantityLitres).toFixed(2)} L</td>
                    <td className="tabular-nums text-sm text-gray-600">
                      ₹{Number(e.ratePerLitre).toFixed(2)}
                    </td>
                    <td className="tabular-nums font-semibold text-sm text-slate-950">
                      {formatCurrency(Number(e.totalAmount))}
                    </td>
                    <td className="tabular-nums text-sm text-gray-600">{formatKm(e.odometer)}</td>
                    <td className="text-sm text-gray-600">{e.fuelStation ?? "—"}</td>
                    <td className="text-xs font-mono text-gray-500">{e.billNumber ?? "—"}</td>
                    <td className="text-sm text-gray-600">{e.driverName ?? "—"}</td>
                    <td className="text-xs text-gray-500">{e.enteredBy?.name ?? "—"}</td>
                    <td>
                      <span className={`badge ${
                        e.approvalStatus === "APPROVED" ? "badge-green" :
                        e.approvalStatus === "REJECTED" ? "badge-red" : "badge-amber"
                      } text-[10px]`}>
                        {e.approvalStatus}
                      </span>
                    </td>
                    {(isAdmin || isApprover) && e.approvalStatus === "PENDING" && (
                      <td>
                        <Link href={`/fuel?approve=${e.id}`}
                          className="interactive-link text-xs">
                          Review
                        </Link>
                      </td>
                    )}
                    {(isAdmin || isApprover) && e.approvalStatus !== "PENDING" && <td />}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/fuel?${new URLSearchParams({ ...params, page: String(page - 1) })}`}
                className="btn-ghost px-3 py-1">← Prev</Link>
            )}
            {page < totalPages && (
              <Link href={`/fuel?${new URLSearchParams({ ...params, page: String(page + 1) })}`}
                className="btn-ghost px-3 py-1">Next →</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
