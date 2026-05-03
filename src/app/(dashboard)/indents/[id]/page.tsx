// ─────────────────────────────────────────────────────────────────────────────
// Indent Detail — shows full indent info + approval timeline + action panel
// ─────────────────────────────────────────────────────────────────────────────
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDate, formatKm } from "@/lib/utils";
import IconMark from "@/components/ui/IconMark";
import IndentActionPanel from "@/components/indents/IndentActionPanel";

export const dynamic = "force-dynamic";

interface PageProps { params: Promise<{ id: string }> }

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "badge-gray", SUBMITTED: "badge-blue", CORRECTION: "badge-amber",
  APPROVED: "badge-green", REJECTED: "badge-red", ASSIGNED: "badge-gold",
  IN_USE: "badge-maroon", COMPLETED: "badge-green", CLOSED: "badge-gray", CANCELLED: "badge-gray",
};

export default async function IndentDetailPage({ params }: PageProps) {
  const { id }  = await params;
  const session = await auth();
  const user    = session?.user as any;

  const indent = await db.indent.findUnique({
    where: { id },
    include: {
      requestedBy:    { select: { id: true, name: true, email: true } },
      branch:         { select: { name: true } },
      assignedVehicle:{ select: { id: true, vehicleNumber: true, vehicleName: true, make: true, model: true } },
      assignedDriver: { select: { id: true, name: true, phone: true } },
      approvals: {
        include: { approver: { select: { name: true } } },
        orderBy:  { createdAt: "asc" },
      },
      fuelEntries:    { select: { id: true, date: true, quantityLitres: true, totalAmount: true } },
    },
  });

  if (!indent) notFound();

  const isAdmin    = ["Super Admin", "Admin"].includes(user?.role);
  const isApprover = ["Branch Manager", "Department Head", "Approver"].includes(user?.role);
  const isOwner    = indent.requestedById === user?.id;

  // Vehicles available for assignment (same branch, ACTIVE status)
  let availableVehicles: { id: string; vehicleNumber: string; vehicleName: string | null }[] = [];
  let availableDrivers:  { id: string; name: string }[] = [];

  if ((isAdmin || isApprover) && indent.status === "APPROVED") {
    [availableVehicles, availableDrivers] = await Promise.all([
      db.vehicle.findMany({
        where: { branchId: indent.branchId, status: "ACTIVE" },
        select: { id: true, vehicleNumber: true, vehicleName: true },
        orderBy: { vehicleNumber: "asc" },
      }),
      db.driver.findMany({
        where: { branchId: indent.branchId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);
  }

  const totalFuel = indent.fuelEntries.reduce(
    (s: number, e: any) => s + Number(e.totalAmount), 0,
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <Link href="/indents" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <IconMark label="<" tone="gray" /> Back to Indents
        </Link>
        <div className="flex items-center gap-3">
          <span className={`badge text-sm px-3 py-1 ${STATUS_BADGE[indent.status] ?? "badge-gray"}`}>
            {indent.status.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* ── Header card ─────────────────────────────────────────────────── */}
      <div className="card detail-hero mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase detail-hero-muted">
              Indent Number
            </p>
            <h1 className="mt-0.5 text-2xl font-bold text-slate-950">{indent.indentNumber}</h1>
            <p className="text-sm mt-1 detail-hero-muted">
              {indent.requestedBy.name} · {indent.branch?.name} · {formatDate(indent.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-right">
            <div>
              <p className="text-xs detail-hero-muted">Required Date</p>
              <p className="font-semibold text-slate-950">{formatDate(indent.vehicleReqDate)}</p>
            </div>
            {indent.expectedReturnDate && (
              <div>
                <p className="text-xs detail-hero-muted">Return Date</p>
                <p className="font-semibold text-slate-950">{formatDate(indent.expectedReturnDate)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Left: Indent details ──────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Trip info */}
          <div className="card">
            <h3 className="section-title mb-4">Trip Details</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                { label: "Purpose",       value: indent.purpose },
                { label: "Destination",   value: indent.destination },
                { label: "Department",    value: indent.department },
                { label: "Est. Distance", value: indent.estimatedKm ? formatKm(indent.estimatedKm) : null },
                { label: "Vehicle Type",  value: indent.vehicleTypeRequired?.replace("_", " ") },
                { label: "Driver Needed", value: indent.driverRequired ? "Yes" : "No" },
                { label: "Fuel Advance",  value: indent.fuelAdvanceRequired
                  ? `Yes${indent.fuelAdvanceAmount ? ` — ${formatCurrency(Number(indent.fuelAdvanceAmount))}` : ""}`
                  : "No" },
              ].filter((r) => r.value).map((row) => (
                <div key={row.label}>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{row.label}</p>
                  <p className="font-medium text-gray-800 mt-0.5">{row.value}</p>
                </div>
              ))}
            </div>
            {indent.remarks && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Remarks</p>
                <p className="text-sm text-gray-700 mt-1">{indent.remarks}</p>
              </div>
            )}
          </div>

          {/* Actual usage — shown once trip starts */}
          {(indent.actualStartKm || indent.actualEndKm) && (
            <div className="card">
              <h3 className="section-title mb-4">Actual Usage</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Start KM</p>
                  <p className="font-bold text-lg text-gray-800">{indent.actualStartKm ? formatKm(indent.actualStartKm) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">End KM</p>
                  <p className="font-bold text-lg text-gray-800">{indent.actualEndKm ? formatKm(indent.actualEndKm) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Total KM</p>
                  <p className="font-bold text-lg text-slate-950">
                    {indent.actualStartKm && indent.actualEndKm
                      ? formatKm(indent.actualEndKm - indent.actualStartKm)
                      : "—"}
                  </p>
                </div>
              </div>
              {totalFuel > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-sm">
                  <IconMark label="F" />
                  <span className="text-gray-600">Total fuel cost:</span>
                  <span className="font-bold text-slate-950">{formatCurrency(totalFuel)}</span>
                </div>
              )}
            </div>
          )}

          {/* Assigned vehicle & driver */}
          {(indent.assignedVehicle || indent.assignedDriver) && (
            <div className="card">
              <h3 className="section-title mb-4">Assignment</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                {indent.assignedVehicle && (
                  <div className="soft-panel flex flex-1 items-center gap-3 p-3">
                    <IconMark label="V" size="md" />
                    <div>
                      <p className="font-semibold text-gray-800">
                        {indent.assignedVehicle.vehicleNumber}
                      </p>
                      <p className="text-xs text-gray-500">
                        {indent.assignedVehicle.make} {indent.assignedVehicle.model}
                        {indent.assignedVehicle.vehicleName && ` · ${indent.assignedVehicle.vehicleName}`}
                      </p>
                    </div>
                    <Link href={`/vehicles/${indent.assignedVehicle.id}`}
                      className="interactive-link ml-auto text-xs">
                      View
                    </Link>
                  </div>
                )}
                {indent.assignedDriver && (
                  <div className="soft-panel flex flex-1 items-center gap-3 p-3">
                    <IconMark label="D" size="md" tone="maroon" />
                    <div>
                      <p className="font-semibold text-gray-800">{indent.assignedDriver.name}</p>
                      {indent.assignedDriver.phone && (
                        <p className="text-xs text-gray-500">{indent.assignedDriver.phone}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Approval timeline */}
          <div className="card">
            <h3 className="section-title mb-4">Approval Timeline</h3>
            {indent.approvals.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No approvals recorded yet.</p>
            ) : (
              <div className="space-y-0">
                {indent.approvals.map((a: any, i: number) => (
                  <div key={a.id} className="timeline-item">
                    <div className="timeline-dot">
                      {a.status === "APPROVED"
                        ? <IconMark label="✓" size="sm" tone="green" />
                        : a.status === "REJECTED"
                        ? <IconMark label="x" size="sm" tone="maroon" />
                        : <IconMark label="r" size="sm" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`badge text-[10px] ${
                          a.status === "APPROVED" ? "badge-green" :
                          a.status === "REJECTED" ? "badge-red" : "badge-amber"
                        }`}>
                          {a.status}
                        </span>
                        <span className="text-xs text-gray-500">by {a.approver.name}</span>
                        <span className="text-xs text-gray-400">{formatDate(a.createdAt)}</span>
                      </div>
                      {a.remarks && (
                        <p className="text-xs text-gray-600 mt-1 italic">"{a.remarks}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Action panel ─────────────────────────────────────── */}
        <div>
          <IndentActionPanel
            indent={{
              id:           indent.id,
              status:       indent.status,
              requestedById: indent.requestedById,
              branchId:     indent.branchId,
              closureRemarks: indent.closureRemarks,
            }}
            currentUser={{ id: user?.id, role: user?.role, branchId: user?.branchId }}
            availableVehicles={availableVehicles}
            availableDrivers={availableDrivers}
          />
        </div>
      </div>
    </div>
  );
}
