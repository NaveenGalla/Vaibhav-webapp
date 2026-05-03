// ─────────────────────────────────────────────────────────────────────────────
// Indents — list page with status filter
// ─────────────────────────────────────────────────────────────────────────────
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import { formatDate } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; branch?: string; page?: string }>;
}

const PAGE_SIZE = 30;

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "badge-gray", SUBMITTED: "badge-blue", CORRECTION: "badge-amber",
  APPROVED: "badge-green", REJECTED: "badge-red", ASSIGNED: "badge-gold",
  IN_USE: "badge-maroon", COMPLETED: "badge-green", CLOSED: "badge-gray", CANCELLED: "badge-gray",
};

export default async function IndentsPage({ searchParams }: PageProps) {
  const session = await auth();
  const user    = session?.user as any;
  const params  = await searchParams;

  const isAdmin     = ["Super Admin", "Admin"].includes(user?.role);
  const isApprover  = ["Branch Manager", "Department Head", "Approver"].includes(user?.role);
  const branchFilter = isAdmin ? {} : { branchId: user?.branchId ?? undefined };

  const search = params.q?.trim() ?? "";
  const page   = Math.max(1, parseInt(params.page ?? "1", 10));
  const where: Record<string, unknown> = { ...branchFilter };

  if (search) {
    where.OR = [
      { indentNumber: { contains: search, mode: "insensitive" } },
      { purpose:      { contains: search, mode: "insensitive" } },
      { destination:  { contains: search, mode: "insensitive" } },
      { requestedBy:  { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (params.status) where.status   = params.status;
  if (params.branch) where.branchId = params.branch;

  // Normal users only see their own indents
  if (!isAdmin && !isApprover) where.requestedById = user?.id;

  const [total, indents, branches] = await Promise.all([
    db.indent.count({ where }),
    db.indent.findMany({
      where,
      include: {
        requestedBy:    { select: { name: true } },
        branch:         { select: { name: true } },
        assignedVehicle:{ select: { vehicleNumber: true } },
        assignedDriver: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Vehicle Indents</h1>
          <p className="page-subtitle">{total} indent{total !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/indents/new" className="btn-primary">
          <IconMark label="+" /> New Indent
        </Link>
      </div>

      {/* Quick status filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        {["", "SUBMITTED", "APPROVED", "IN_USE", "COMPLETED", "REJECTED"].map((s: any) => (
          <Link
            key={s}
            href={`/indents?${new URLSearchParams({ ...params, status: s, page: "1" })}`}
            className="px-3 py-1 rounded-full text-xs font-semibold border transition-colors"
            style={{
              background:   params.status === s || (!params.status && s === "")
                ? "#111827" : "#fff",
              color:        params.status === s || (!params.status && s === "")
                ? "#fff" : "#6b7280",
              borderColor:  "rgba(107,29,29,0.3)",
            }}
          >
            {s === "" ? "All" : s.replace("_", " ")}
          </Link>
        ))}
      </div>

      {/* Search + Branch filter */}
      <div className="card mb-4 py-3">
        <form method="GET" className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <IconMark label="S" tone="gray" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input type="text" name="q" defaultValue={search}
              placeholder="Search indent number, purpose, destination…"
              className="form-input pl-9" />
          </div>
          {isAdmin && (
            <select name="branch" defaultValue={params.branch ?? ""} className="form-input w-auto">
              <option value="">All branches</option>
              {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <input type="hidden" name="status" value={params.status ?? ""} />
          <button type="submit" className="btn-primary px-5">Search</button>
          {(search || params.branch) && (
            <Link href={`/indents?status=${params.status ?? ""}`} className="btn-ghost px-4">Clear</Link>
          )}
        </form>
      </div>

      {/* Table */}
      {indents.length === 0 ? (
        <div className="card text-center py-16">
          <IconMark label="I" size="lg" className="mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No indents found</p>
          <Link href="/indents/new" className="btn-primary mt-4 inline-flex">
            <IconMark label="+" /> Create First Indent
          </Link>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Indent No.</th>
                  <th>Requested By</th>
                  <th>Branch</th>
                  <th>Purpose</th>
                  <th>Date Required</th>
                  <th>Assigned Vehicle</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {indents.map((indent: any) => (
                  <tr key={indent.id}>
                    <td>
                      <Link href={`/indents/${indent.id}`}
                        className="font-semibold text-slate-950 hover:underline">
                        {indent.indentNumber}
                      </Link>
                    </td>
                    <td className="text-gray-700">{indent.requestedBy.name}</td>
                    <td className="text-gray-600 text-sm">{indent.branch?.name ?? "—"}</td>
                    <td className="text-gray-600 text-sm max-w-[180px] truncate">
                      {indent.purpose ?? "—"}
                    </td>
                    <td className="text-gray-600 text-sm">{formatDate(indent.vehicleReqDate)}</td>
                    <td className="text-sm">
                      {indent.assignedVehicle
                        ? <span className="badge badge-blue">{indent.assignedVehicle.vehicleNumber}</span>
                        : <span className="text-gray-400 italic text-xs">Not assigned</span>}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[indent.status] ?? "badge-gray"}`}>
                        {indent.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      <Link href={`/indents/${indent.id}`}
                        className="interactive-link text-xs">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/indents?${new URLSearchParams({ ...params, page: String(page - 1) })}`}
                className="btn-ghost px-3 py-1">← Prev</Link>
            )}
            {page < totalPages && (
              <Link href={`/indents?${new URLSearchParams({ ...params, page: String(page + 1) })}`}
                className="btn-ghost px-3 py-1">Next →</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
