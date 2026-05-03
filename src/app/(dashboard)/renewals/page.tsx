// ─────────────────────────────────────────────────────────────────────────────
// Renewals — list all document renewals with expiry status
// ─────────────────────────────────────────────────────────────────────────────
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    q?: string; type?: string; status?: string; branch?: string; page?: string;
  }>;
}

const PAGE_SIZE = 40;

function expiryBadge(dueDate: Date | null) {
  if (!dueDate) return { label: "No Date", cls: "badge-gray" };
  const days = Math.floor((dueDate.getTime() - Date.now()) / 86_400_000);
  if (days < 0)  return { label: `Expired ${Math.abs(days)}d ago`, cls: "badge-red" };
  if (days <= 7)  return { label: `${days}d left`, cls: "badge-red" };
  if (days <= 30) return { label: `${days}d left`, cls: "badge-amber" };
  return { label: `${days}d left`, cls: "badge-green" };
}

const RENEWAL_TYPES = [
  "INSURANCE", "POLLUTION", "FITNESS", "PERMIT",
  "ROAD_TAX", "DRIVER_LICENSE", "AMC", "OTHER",
];

export default async function RenewalsPage({ searchParams }: PageProps) {
  const session = await auth();
  const user    = session?.user as any;
  const params  = await searchParams;

  const isAdmin      = ["Super Admin", "Admin"].includes(user?.role);
  const branchFilter = isAdmin ? {} : { vehicle: { branchId: user?.branchId ?? undefined } };

  const page   = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.q?.trim() ?? "";
  const where: Record<string, unknown> = { ...branchFilter };

  if (search) {
    where.OR = [
      { vehicle: { vehicleNumber: { contains: search, mode: "insensitive" } } },
      { vehicle: { vehicleName:   { contains: search, mode: "insensitive" } } },
    ];
  }
  if (params.type)   where.renewalType = params.type;
  if (params.status) {
    const now = new Date();
    const in30 = new Date(Date.now() + 30 * 86_400_000);
    if (params.status === "EXPIRED")   where.expiryDate = { lt: now };
    if (params.status === "DUE_SOON")  where.expiryDate = { gte: now, lte: in30 };
    if (params.status === "VALID")     where.expiryDate = { gt: in30 };
  }

  const [total, renewals] = await Promise.all([
    db.renewal.count({ where }),
    db.renewal.findMany({
      where,
      include: {
        vehicle:     { select: { vehicleNumber: true, vehicleName: true, branchId: true } },
        updatedByUser: { select: { name: true } },
      },
      orderBy: { expiryDate: "asc" },
      skip:  (page - 1) * PAGE_SIZE,
      take:  PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Summary counts
  const now   = new Date();
  const in30  = new Date(Date.now() + 30 * 86_400_000);
  const [expiredCount, dueSoonCount] = await Promise.all([
    db.renewal.count({ where: { ...branchFilter, expiryDate: { lt: now } } }),
    db.renewal.count({ where: { ...branchFilter, expiryDate: { gte: now, lte: in30 } } }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="page-title">Renewals & Documents</h1>
          <p className="page-subtitle">{total} records</p>
        </div>
        {isAdmin && (
          <Link href="/renewals/new" className="btn-primary">
            <IconMark label="+" /> Add Renewal
          </Link>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="card py-3">
          <p className="kpi-label">Total</p>
          <p className="kpi-value text-xl mt-1">{total}</p>
        </div>
        <div className="card py-3 border-l-4" style={{ borderLeftColor: "#dc2626" }}>
          <p className="kpi-label" style={{ color: "#dc2626" }}>Expired</p>
          <p className="kpi-value text-xl mt-1" style={{ color: "#dc2626" }}>{expiredCount}</p>
        </div>
        <div className="card py-3 border-l-4" style={{ borderLeftColor: "#d97706" }}>
          <p className="kpi-label" style={{ color: "#d97706" }}>Due ≤ 30 Days</p>
          <p className="kpi-value text-xl mt-1" style={{ color: "#d97706" }}>{dueSoonCount}</p>
        </div>
        <div className="card py-3 border-l-4" style={{ borderLeftColor: "#16a34a" }}>
          <p className="kpi-label" style={{ color: "#16a34a" }}>Valid</p>
          <p className="kpi-value text-xl mt-1" style={{ color: "#16a34a" }}>
            {total - expiredCount - dueSoonCount}
          </p>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap mb-4">
        {[
          { key: "",          label: "All" },
          { key: "EXPIRED",   label: "Expired" },
          { key: "DUE_SOON",  label: "Due Soon" },
          { key: "VALID",     label: "Valid" },
        ].map(({ key, label }) => (
          <Link key={key}
            href={`/renewals?${new URLSearchParams({ ...params, status: key, page: "1" })}`}
            className="px-3 py-1 rounded-full text-xs font-semibold border transition-colors"
            style={{
              background:  params.status === key || (!params.status && key === "") ? "#111827" : "#fff",
              color:       params.status === key || (!params.status && key === "") ? "#fff" : "#6b7280",
              borderColor: "rgba(107,29,29,0.3)",
            }}>
            {label}
          </Link>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-4 py-3">
        <form method="GET" className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <IconMark label="S" tone="gray" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input type="text" name="q" defaultValue={search}
              placeholder="Search vehicle…" className="form-input pl-9" />
          </div>
          <select name="type" defaultValue={params.type ?? ""} className="form-input w-auto">
            <option value="">All Types</option>
            {RENEWAL_TYPES.map((t: any) => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </select>
          <input type="hidden" name="status" value={params.status ?? ""} />
          <button type="submit" className="btn-primary px-5">Filter</button>
          {(search || params.type) && (
            <Link href={`/renewals?status=${params.status ?? ""}`} className="btn-ghost px-4">Clear</Link>
          )}
        </form>
      </div>

      {/* Table */}
      {renewals.length === 0 ? (
        <div className="card text-center py-16">
          <IconMark label="R" size="lg" className="mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No renewal records found</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Type</th>
                  <th>Issue Date</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>Policy/Cert No.</th>
                  <th>Updated By</th>
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {renewals.map((r: any) => {
                  const badge = expiryBadge(r.expiryDate);
                  return (
                    <tr key={r.id}>
                      <td>
                        <p className="font-semibold text-sm text-slate-950">
                          {r.vehicle.vehicleNumber}
                        </p>
                        {r.vehicle.vehicleName && (
                          <p className="text-xs text-gray-400">{r.vehicle.vehicleName}</p>
                        )}
                      </td>
                      <td>
                        <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                          {r.renewalType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="text-sm text-gray-600">{r.issueDate ? formatDate(r.issueDate) : "—"}</td>
                      <td className="text-sm tabular-nums font-medium">
                        {r.expiryDate ? formatDate(r.expiryDate) : "—"}
                      </td>
                      <td><span className={`badge ${badge.cls} text-[10px]`}>{badge.label}</span></td>
                      <td className="text-xs font-mono text-gray-500">{r.policyOrCertNo ?? "—"}</td>
                      <td className="text-xs text-gray-500">{r.updatedByUser?.name ?? "—"}</td>
                      {isAdmin && (
                        <td>
                          <Link href={`/renewals/${r.id}/edit`}
                            className="interactive-link text-xs">
                            Update
                          </Link>
                        </td>
                      )}
                    </tr>
                  );
                })}
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
              <Link href={`/renewals?${new URLSearchParams({ ...params, page: String(page - 1) })}`}
                className="btn-ghost px-3 py-1">← Prev</Link>
            )}
            {page < totalPages && (
              <Link href={`/renewals?${new URLSearchParams({ ...params, page: String(page + 1) })}`}
                className="btn-ghost px-3 py-1">Next →</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
