// ─────────────────────────────────────────────────────────────────────────────
// Approvals Dashboard — all pending approvals visible to the current user
// ─────────────────────────────────────────────────────────────────────────────
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import { formatDate, formatCurrency } from "@/lib/utils";
import { hasRole, scopedBranchWhere } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const session = await auth();
  const user    = session?.user as any;

  const isAdmin    = hasRole(user, "platformAdmin");
  const isApprover = hasRole(user, "indentApprover") || hasRole(user, "accountsApprover");

  if (!isAdmin && !isApprover) {
    return (
      <div className="card text-center py-16 max-w-md mx-auto">
        <p className="text-gray-500">You do not have access to the approvals dashboard.</p>
      </div>
    );
  }

  const branchFilter = scopedBranchWhere(user);

  const [pendingIndents, pendingFuel] = await Promise.all([
    db.indent.findMany({
      where: { ...branchFilter, status: "SUBMITTED" },
      include: {
        requestedBy: { select: { name: true } },
        branch:      { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    db.fuelEntry.findMany({
      where: { ...branchFilter, approvalStatus: "PENDING" },
      include: {
        vehicle:   { select: { vehicleNumber: true, vehicleName: true } },
        enteredBy: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Approvals</h1>
        <p className="page-subtitle">
          {pendingIndents.length + pendingFuel.length} item{pendingIndents.length + pendingFuel.length !== 1 ? "s" : ""} waiting for your review
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card py-3 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
            <IconMark label="I" size="md" tone="gray" />
          </div>
          <div>
            <p className="kpi-label">Pending Indents</p>
            <p className="kpi-value text-2xl">{pendingIndents.length}</p>
          </div>
        </div>
        <div className="card py-3 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
            <IconMark label="F" size="md" tone="gray" />
          </div>
          <div>
            <p className="kpi-label">Pending Fuel Entries</p>
            <p className="kpi-value text-2xl">{pendingFuel.length}</p>
          </div>
        </div>
      </div>

      {/* Pending Indents */}
      {pendingIndents.length > 0 && (
        <section className="mb-8">
          <h2 className="section-title mb-3 text-base">
            Vehicle Indent Requests
          </h2>
          <div className="card p-0 overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Indent No.</th>
                  <th>Requested By</th>
                  <th>Branch</th>
                  <th>Purpose</th>
                  <th>Required Date</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pendingIndents.map((indent: any) => (
                  <tr key={indent.id}>
                    <td>
                      <Link href={`/indents/${indent.id}`}
                        className="font-mono text-sm font-semibold text-slate-950 hover:underline">
                        {indent.indentNumber}
                      </Link>
                    </td>
                    <td className="text-sm text-gray-700">{indent.requestedBy.name}</td>
                    <td className="text-sm text-gray-600">{indent.branch?.name ?? "—"}</td>
                    <td className="text-sm text-gray-600 max-w-[200px] truncate">{indent.purpose ?? "—"}</td>
                    <td className="text-sm tabular-nums text-gray-600">{formatDate(indent.vehicleReqDate)}</td>
                    <td className="text-xs text-gray-400">{formatDate(indent.createdAt)}</td>
                    <td>
                      <Link href={`/indents/${indent.id}`}
                        className="btn-primary text-xs py-1 px-3">
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Pending Fuel */}
      {pendingFuel.length > 0 && (
        <section>
          <h2 className="section-title mb-3 text-base">
            Fuel Entry Approvals
          </h2>
          <div className="card p-0 overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Date</th>
                  <th>Litres</th>
                  <th>Amount</th>
                  <th>Entered By</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pendingFuel.map((e: any) => (
                  <tr key={e.id}>
                    <td>
                      <p className="font-semibold text-sm text-slate-950">
                        {e.vehicle.vehicleNumber}
                      </p>
                      {e.vehicle.vehicleName && (
                        <p className="text-xs text-gray-400">{e.vehicle.vehicleName}</p>
                      )}
                    </td>
                    <td className="text-sm text-gray-600">{formatDate(e.date)}</td>
                    <td className="tabular-nums text-sm">{Number(e.quantityLitres).toFixed(2)} L</td>
                    <td className="tabular-nums font-semibold text-sm text-slate-950">
                      {formatCurrency(Number(e.totalAmount))}
                    </td>
                    <td className="text-xs text-gray-500">{e.enteredBy?.name ?? "—"}</td>
                    <td>
                      <FuelApproveButton entryId={e.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {pendingIndents.length === 0 && pendingFuel.length === 0 && (
        <div className="card text-center py-20">
          <IconMark label="OK" size="lg" tone="green" className="mx-auto mb-3" />
          <p className="text-gray-600 font-medium text-lg">All clear!</p>
          <p className="text-gray-400 text-sm mt-1">No pending approvals at the moment.</p>
        </div>
      )}
    </div>
  );
}

// Inline client component for fuel approve quick-action buttons
function FuelApproveButton({ entryId }: { entryId: string }) {
  // Link to fuel list with the entry highlighted
  return (
    <Link href={`/fuel?highlight=${entryId}`}
      className="interactive-link text-xs">
      Review
    </Link>
  );
}
