// ─────────────────────────────────────────────────────────────────────────────
// Service Entry — list page
// ─────────────────────────────────────────────────────────────────────────────
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import { formatCurrency, formatDate, formatKm } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{
    q?: string; type?: string; branch?: string;
    vehicle?: string; from?: string; to?: string; page?: string;
  }>;
}

const PAGE_SIZE = 30;

export default async function ServicePage({ searchParams }: PageProps) {
  const session = await auth();
  const user    = session?.user as any;
  const params  = await searchParams;

  const isAdmin      = ["Super Admin", "Admin"].includes(user?.role);
  const branchFilter = isAdmin ? {} : { branchId: user?.branchId ?? undefined };

  const page   = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.q?.trim() ?? "";
  const where: Record<string, unknown> = { ...branchFilter };

  if (search) {
    where.OR = [
      { vehicle:     { vehicleNumber: { contains: search, mode: "insensitive" } } },
      { vendor:      { contains: search, mode: "insensitive" } },
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      { serviceType: { contains: search, mode: "insensitive" } },
    ];
  }
  if (params.vehicle) where.vehicleId = params.vehicle;
  if (params.from || params.to) {
    where.serviceDate = {
      ...(params.from ? { gte: new Date(params.from) } : {}),
      ...(params.to   ? { lte: new Date(params.to)   } : {}),
    };
  }

  const [total, entries] = await Promise.all([
    db.serviceEntry.count({ where }),
    db.serviceEntry.findMany({
      where,
      include: {
        vehicle:   { select: { vehicleNumber: true, vehicleName: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: [{ serviceDate: "desc" }, { createdAt: "desc" }],
      skip:  (page - 1) * PAGE_SIZE,
      take:  PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Month totals
  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthAgg   = await db.serviceEntry.aggregate({
    where: { ...branchFilter, serviceDate: { gte: monthStart } },
    _sum:  { cost: true },
    _count: { id: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="page-title">Service Entries</h1>
          <p className="page-subtitle">{total} entr{total !== 1 ? "ies" : "y"}</p>
        </div>
        {["Super Admin", "Admin", "Branch Manager", "Vehicle Manager"].includes(user?.role) && (
          <Link href="/service/new" className="btn-primary">
            <IconMark label="+" /> Add Service Entry
          </Link>
        )}
      </div>

      {/* Month summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div className="card py-3">
          <p className="kpi-label">This Month — Cost</p>
          <p className="kpi-value text-xl mt-1">
            {formatCurrency(Number(monthAgg._sum.cost ?? 0))}
          </p>
        </div>
        <div className="card py-3">
          <p className="kpi-label">This Month — Services</p>
          <p className="kpi-value text-xl mt-1">{monthAgg._count.id}</p>
        </div>
        <div className="card py-3">
          <p className="kpi-label">Total Records</p>
          <p className="kpi-value text-xl mt-1">{total}</p>
        </div>
      </div>

      {/* Search */}
      <div className="card mb-4 py-3">
        <form method="GET" className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <IconMark label="S" tone="gray" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input type="text" name="q" defaultValue={search}
              placeholder="Search vehicle, vendor, invoice…"
              className="form-input pl-9" />
          </div>
          <input type="date" name="from" defaultValue={params.from ?? ""} className="form-input w-auto" title="From date" />
          <input type="date" name="to"   defaultValue={params.to   ?? ""} className="form-input w-auto" title="To date" />
          <button type="submit" className="btn-primary px-5">Search</button>
          {(search || params.from || params.to) && (
            <Link href="/service" className="btn-ghost px-4">Clear</Link>
          )}
        </form>
      </div>

      {/* Table */}
      {entries.length === 0 ? (
        <div className="card text-center py-16">
          <IconMark label="S" size="lg" className="mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No service entries found</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Service Type</th>
                  <th>Odometer</th>
                  <th>Vendor</th>
                  <th>Invoice No.</th>
                  <th>Cost</th>
                  <th>Next Due</th>
                  <th>Entered By</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e: any) => (
                  <tr key={e.id}>
                    <td className="text-sm text-gray-600">{formatDate(e.serviceDate)}</td>
                    <td>
                      <p className="font-semibold text-sm text-slate-950">
                        {e.vehicle.vehicleNumber}
                      </p>
                      {e.vehicle.vehicleName && (
                        <p className="text-xs text-gray-400">{e.vehicle.vehicleName}</p>
                      )}
                    </td>
                    <td className="text-sm">{e.serviceType}</td>
                    <td className="tabular-nums text-sm text-gray-600">{formatKm(e.odometer)}</td>
                    <td className="text-sm text-gray-600">{e.vendor ?? "—"}</td>
                    <td className="text-xs font-mono text-gray-500">{e.invoiceNumber ?? "—"}</td>
                    <td className="tabular-nums font-semibold text-sm text-slate-950">
                      {formatCurrency(Number(e.cost ?? 0))}
                    </td>
                    <td className="text-sm text-gray-600">
                      {e.nextServiceDate ? formatDate(e.nextServiceDate) : "—"}
                      {e.nextServiceKm   ? <span className="text-xs text-gray-400 ml-1">/ {formatKm(e.nextServiceKm)}</span> : null}
                    </td>
                    <td className="text-xs text-gray-500">{e.createdBy?.name ?? "—"}</td>
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
              <Link href={`/service?${new URLSearchParams({ ...params, page: String(page - 1) })}`}
                className="btn-ghost px-3 py-1">← Prev</Link>
            )}
            {page < totalPages && (
              <Link href={`/service?${new URLSearchParams({ ...params, page: String(page + 1) })}`}
                className="btn-ghost px-3 py-1">Next →</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
