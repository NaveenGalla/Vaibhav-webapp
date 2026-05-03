// ─────────────────────────────────────────────────────────────────────────────
// VehicleLifeTimeline — tabbed history component for the vehicle detail page.
// Tabs: Indents | Fuel | Service | Repairs | Tyres | Accidents | Documents
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { useState } from "react";
import { formatCurrency, formatDate, formatKm } from "@/lib/utils";

// ── Minimal Prisma-shaped type for the vehicle payload ────────────────────────
type VehicleFull = {
  id: string;
  vehicleNumber: string;
  fuelEntries: {
    id: string;
    date: Date;
    fuelType: string;
    quantityLitres: unknown;
    totalAmount: unknown;
    odometer: number;
    fuelStation: string | null;
    billNumber: string | null;
    driverName: string | null;
    approvalStatus: string;
    enteredBy: { name: string | null } | null;
  }[];
  serviceEntries: {
    id: string;
    serviceDate: Date;
    serviceType: string;
    description: string | null;
    odometer: number;
    cost: unknown;
    laborCost: unknown | null;
    partsCost: unknown | null;
    vendor: string | null;
    enteredBy: { name: string | null } | null;
  }[];
  repairEntries: {
    id: string;
    repairDate: Date;
    description: string;
    cost: unknown;
    vendor: string | null;
  }[];
  tyreRecords: {
    id: string;
    recordDate: Date;
    tyrePosition: string | null;
    tyreBrand: string | null;
    tyreSize: string | null;
    quantity: number | null;
    cost: unknown;
  }[];
  accidentRecords: {
    id: string;
    accidentDate: Date;
    description: string;
    repairCost: unknown;
    repairStatus: string;
  }[];
  indents: {
    id: string;
    indentNumber: string;
    status: string;
    vehicleReqDate: Date;
    destination: string | null;
    purpose: string | null;
    actualStartKm: number | null;
    actualEndKm: number | null;
    requestedBy: { name: string | null };
    assignedDriver: { name: string | null } | null;
  }[];
  documents: {
    id: string;
    documentType: string;
    fileName: string | null;
    expiryDate: Date | null;
    issueDate: Date | null;
    fileUrl: string | null;
  }[];
};

type TabId = "indents" | "fuel" | "service" | "repairs" | "tyres" | "accidents" | "documents";

const TABS: { id: TabId; label: string }[] = [
  { id: "indents",   label: "Indents" },
  { id: "fuel",      label: "Fuel" },
  { id: "service",   label: "Service" },
  { id: "repairs",   label: "Repairs" },
  { id: "tyres",     label: "Tyres" },
  { id: "accidents", label: "Accidents" },
  { id: "documents", label: "Documents" },
];

const INDENT_BADGE: Record<string, string> = {
  DRAFT: "badge-gray", SUBMITTED: "badge-blue", CORRECTION: "badge-amber",
  APPROVED: "badge-green", REJECTED: "badge-red", ASSIGNED: "badge-gold",
  IN_USE: "badge-maroon", COMPLETED: "badge-green", CLOSED: "badge-gray", CANCELLED: "badge-gray",
};

export default function VehicleLifeTimeline({ vehicle }: { vehicle: VehicleFull }) {
  const [activeTab, setActiveTab] = useState<TabId>("indents");

  const empty = (msg: string) => (
    <p className="text-center text-sm text-gray-400 py-10">{msg}</p>
  );

  return (
    <div className="card">
      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${activeTab === t.id ? "bg-white text-slate-950 shadow-sm" : "text-gray-500 hover:text-slate-900"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Indents tab ───────────────────────────────────────────────────── */}
      {activeTab === "indents" && (
        vehicle.indents.length === 0 ? empty("No indents yet.") : (
          <div className="space-y-3">
            {vehicle.indents.map((indent) => (
              <div
                key={indent.id}
                className="soft-panel flex items-start gap-3 p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-slate-950">
                      {indent.indentNumber}
                    </span>
                    <span className={`badge ${INDENT_BADGE[indent.status] ?? "badge-gray"}`}>
                      {indent.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {indent.requestedBy.name} · {formatDate(indent.vehicleReqDate)}
                    {indent.destination && ` · To: ${indent.destination}`}
                  </p>
                  {(indent.actualStartKm || indent.actualEndKm) && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {indent.actualStartKm ? formatKm(indent.actualStartKm) : "—"} →{" "}
                      {indent.actualEndKm   ? formatKm(indent.actualEndKm)   : "—"}
                      {indent.actualStartKm && indent.actualEndKm
                        ? ` (${formatKm(indent.actualEndKm - indent.actualStartKm)} km)`
                        : ""}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Fuel tab ──────────────────────────────────────────────────────── */}
      {activeTab === "fuel" && (
        vehicle.fuelEntries.length === 0 ? empty("No fuel entries yet.") : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Litres</th>
                  <th>Amount</th>
                  <th>Odometer</th>
                  <th>Station</th>
                  <th>Bill No.</th>
                  <th>Driver</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {vehicle.fuelEntries.map((e) => (
                  <tr key={e.id}>
                    <td>{formatDate(e.date)}</td>
                    <td className="tabular-nums">{Number(e.quantityLitres).toFixed(1)} L</td>
                    <td className="tabular-nums font-semibold text-slate-950">
                      {formatCurrency(Number(e.totalAmount))}
                    </td>
                    <td className="tabular-nums">{formatKm(e.odometer)}</td>
                    <td className="text-gray-600">{e.fuelStation ?? "—"}</td>
                    <td className="text-gray-600 font-mono text-xs">{e.billNumber ?? "—"}</td>
                    <td className="text-gray-600">{e.driverName ?? "—"}</td>
                    <td>
                      <span className={`badge ${
                        e.approvalStatus === "APPROVED" ? "badge-green" :
                        e.approvalStatus === "REJECTED" ? "badge-red" : "badge-amber"
                      } text-[10px]`}>
                        {e.approvalStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Service tab ───────────────────────────────────────────────────── */}
      {activeTab === "service" && (
        vehicle.serviceEntries.length === 0 ? empty("No service records yet.") : (
          <div className="space-y-3">
            {vehicle.serviceEntries.map((s) => (
              <div key={s.id} className="soft-panel p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm text-gray-800">{s.serviceType.replace(/_/g, " ")}</span>
                    {s.description && <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(s.serviceDate)} · {formatKm(s.odometer)} · {s.vendor ?? "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-slate-950">
                      {formatCurrency(Number(s.cost ?? 0))}
                    </p>
                    {(s.laborCost != null || s.partsCost != null) && (
                      <p className="text-xs text-gray-400">
                        Labor: {formatCurrency(Number(s.laborCost ?? 0))} · Parts: {formatCurrency(Number(s.partsCost ?? 0))}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Repairs tab ───────────────────────────────────────────────────── */}
      {activeTab === "repairs" && (
        vehicle.repairEntries.length === 0 ? empty("No repair records.") : (
          <div className="space-y-3">
            {vehicle.repairEntries.map((r) => (
              <div key={r.id} className="soft-panel p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(r.repairDate)} · {r.vendor ?? "—"}
                    </p>
                  </div>
                  <p className="font-bold text-sm text-slate-950">
                    {formatCurrency(Number(r.cost ?? 0))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Tyres tab ─────────────────────────────────────────────────────── */}
      {activeTab === "tyres" && (
        vehicle.tyreRecords.length === 0 ? empty("No tyre records.") : (
          <div className="space-y-3">
            {vehicle.tyreRecords.map((t) => (
              <div key={t.id} className="soft-panel p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm text-gray-800">{t.tyrePosition ?? "Tyre record"}</span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(t.recordDate)}
                      {t.tyreBrand && ` · ${t.tyreBrand}`}
                      {t.tyreSize && ` · ${t.tyreSize}`}
                      {` · Qty: ${t.quantity}`}
                    </p>
                  </div>
                  <p className="font-bold text-sm text-slate-950">
                    {formatCurrency(Number(t.cost ?? 0))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Accidents tab ─────────────────────────────────────────────────── */}
      {activeTab === "accidents" && (
        vehicle.accidentRecords.length === 0 ? empty("No accident records.") : (
          <div className="space-y-3">
            {vehicle.accidentRecords.map((a) => (
              <div key={a.id} className="p-3 rounded-lg border border-red-200 bg-red-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-800">{a.description}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatDate(a.accidentDate)}</p>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${
                      a.repairStatus === "COMPLETED" ? "badge-green" :
                      a.repairStatus === "PENDING"  ? "badge-amber" : "badge-blue"
                    } text-xs`}>
                      {a.repairStatus}
                    </span>
                    {Number(a.repairCost ?? 0) > 0 && (
                      <p className="text-xs text-red-700 font-semibold mt-1">
                        {formatCurrency(Number(a.repairCost))}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Documents tab ─────────────────────────────────────────────────── */}
      {activeTab === "documents" && (
        vehicle.documents.length === 0 ? empty("No documents uploaded.") : (
          <div className="space-y-2">
            {vehicle.documents.map((d) => (
              <div key={d.id} className="soft-panel flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {d.documentType.replace(/_/g, " ")}
                  </p>
                  {d.fileName && (
                    <p className="text-xs text-gray-500 font-mono">{d.fileName}</p>
                  )}
                  {d.issueDate && (
                    <p className="text-xs text-gray-400">
                      Issued: {formatDate(d.issueDate)}
                      {d.expiryDate ? ` · Expires: ${formatDate(d.expiryDate)}` : ""}
                    </p>
                  )}
                </div>
                {d.fileUrl ? (
                  <a
                    href={d.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost text-xs px-3 py-1"
                  >
                    View
                  </a>
                ) : (
                  <span className="text-xs text-gray-400 italic">No file</span>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
