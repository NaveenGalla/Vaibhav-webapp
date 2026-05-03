// ─────────────────────────────────────────────────────────────────────────────
// IndentActionPanel — client component showing all possible actions for
// an indent based on current status and the logged-in user's role.
//
// States → actions:
//   DRAFT        → [Owner] Submit / Delete
//   SUBMITTED    → [Approver/Manager] Approve / Reject / Send for Correction
//   CORRECTION   → [Owner] Re-submit
//   APPROVED     → [Admin/Manager] Assign vehicle + driver
//   ASSIGNED     → [Admin/Manager] Mark In-Use
//   IN_USE       → [Admin/Manager] Mark Completed
//   COMPLETED    → [Admin] Close
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle, XCircle, RotateCcw, Send, Car,
  Play, Flag, Lock, ClipboardCheck,
} from "lucide-react";

interface IndentMeta {
  id:             string;
  status:         string;
  requestedById:  string;
  branchId:       string;
  closureRemarks: string | null;
}

interface CurrentUser {
  id:       string;
  role:     string;
  branchId: string | null;
}

interface Props {
  indent:            IndentMeta;
  currentUser:       CurrentUser;
  availableVehicles: { id: string; vehicleNumber: string; vehicleName: string | null }[];
  availableDrivers:  { id: string; name: string }[];
}

type ActionType = "approve" | "reject" | "correction" | "submit" | "assign" | "start" | "complete" | "close";

export default function IndentActionPanel({
  indent, currentUser, availableVehicles, availableDrivers,
}: Props) {
  const router  = useRouter();
  const [action,   setAction]   = useState<ActionType | null>(null);
  const [remarks,  setRemarks]  = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId,  setDriverId]  = useState("");
  const [startKm,   setStartKm]   = useState("");
  const [endKm,     setEndKm]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const isOwner    = currentUser.id === indent.requestedById;
  const isAdmin    = ["Super Admin", "Admin"].includes(currentUser.role);
  const isApprover = ["Branch Manager", "Department Head", "Approver"].includes(currentUser.role);
  const canAct     = isAdmin || isApprover;

  const callApi = async (endpoint: string, body: object) => {
    setLoading(true); setError(null);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error ?? "Action failed."); return false; }
    return true;
  };

  const handleAction = async () => {
    let ok = false;
    switch (action) {
      case "approve":
        ok = await callApi(`/api/indents/${indent.id}/approve`, { decision: "APPROVED", remarks });
        break;
      case "reject":
        ok = await callApi(`/api/indents/${indent.id}/approve`, { decision: "REJECTED", remarks });
        break;
      case "correction":
        ok = await callApi(`/api/indents/${indent.id}/approve`, { decision: "CORRECTION", remarks });
        break;
      case "submit":
        ok = await callApi(`/api/indents/${indent.id}`, { action: "submit" });
        break;
      case "assign":
        if (!vehicleId) { setError("Please select a vehicle."); return; }
        ok = await callApi(`/api/indents/${indent.id}/assign`, { vehicleId, driverId: driverId || null });
        break;
      case "start":
        if (!startKm) { setError("Start odometer reading required."); return; }
        ok = await callApi(`/api/indents/${indent.id}`, { action: "start", actualStartKm: Number(startKm) });
        break;
      case "complete":
        if (!endKm) { setError("End odometer reading required."); return; }
        ok = await callApi(`/api/indents/${indent.id}`, { action: "complete", actualEndKm: Number(endKm) });
        break;
      case "close":
        ok = await callApi(`/api/indents/${indent.id}/close`, { remarks });
        break;
    }
    if (ok) { setAction(null); router.refresh(); }
  };

  // ── Render available action buttons ──────────────────────────────────────
  const actions: { key: ActionType; label: string; icon: React.ReactNode; style: string; show: boolean }[] = [
    {
      key: "submit", label: "Submit for Approval",
      icon: <Send size={15} />,
      style: "btn-primary w-full",
      show: indent.status === "DRAFT" && isOwner,
    },
    {
      key: "approve", label: "Approve",
      icon: <CheckCircle size={15} />,
      style: "w-full flex items-center justify-center gap-2 rounded-md px-4 py-2 font-semibold text-sm bg-green-600 text-white hover:bg-green-700 transition-colors",
      show: indent.status === "SUBMITTED" && canAct,
    },
    {
      key: "correction", label: "Send for Correction",
      icon: <RotateCcw size={15} />,
      style: "w-full flex items-center justify-center gap-2 rounded-full px-4 py-2 font-semibold text-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors",
      show: indent.status === "SUBMITTED" && canAct,
    },
    {
      key: "reject", label: "Reject",
      icon: <XCircle size={15} />,
      style: "w-full flex items-center justify-center gap-2 rounded-md px-4 py-2 font-semibold text-sm bg-red-600 text-white hover:bg-red-700 transition-colors",
      show: indent.status === "SUBMITTED" && canAct,
    },
    {
      key: "submit", label: "Re-submit for Approval",
      icon: <Send size={15} />,
      style: "btn-primary w-full",
      show: indent.status === "CORRECTION" && isOwner,
    },
    {
      key: "assign", label: "Assign Vehicle",
      icon: <Car size={15} />,
      style: "btn-primary w-full",
      show: indent.status === "APPROVED" && canAct,
    },
    {
      key: "start", label: "Mark In-Use",
      icon: <Play size={15} />,
      style: "btn-primary w-full",
      show: indent.status === "ASSIGNED" && canAct,
    },
    {
      key: "complete", label: "Mark Completed",
      icon: <Flag size={15} />,
      style: "w-full flex items-center justify-center gap-2 rounded-md px-4 py-2 font-semibold text-sm bg-green-600 text-white hover:bg-green-700 transition-colors",
      show: indent.status === "IN_USE" && canAct,
    },
    {
      key: "close", label: "Close Indent",
      icon: <Lock size={15} />,
      style: "w-full flex items-center justify-center gap-2 rounded-md px-4 py-2 font-semibold text-sm border-2 border-gray-400 text-gray-700 hover:bg-gray-50 transition-colors",
      show: indent.status === "COMPLETED" && (isAdmin || isApprover),
    },
  ];

  const visibleActions = actions.filter((a) => a.show);

  if (visibleActions.length === 0 && !action) {
    return (
      <div className="card text-center py-6">
        <ClipboardCheck size={24} className="mx-auto mb-2 text-gray-300" />
        <p className="text-xs text-gray-400">No actions available</p>
      </div>
    );
  }

  return (
    <div className="card space-y-3">
      <h3 className="section-title text-sm">Actions</h3>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Action buttons (when nothing selected) */}
      {!action && (
        <div className="space-y-2">
          {visibleActions.map((a) => (
            <button key={a.key + a.label} onClick={() => setAction(a.key)}
              className={`flex items-center justify-center gap-2 ${a.style}`}>
              {a.icon} {a.label}
            </button>
          ))}
        </div>
      )}

      {/* Confirmation panel */}
      {action && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700 capitalize">
            {action === "correction" ? "Send for Correction" : action.charAt(0).toUpperCase() + action.slice(1)}
          </p>

          {/* Remarks field for approve/reject/correction/close */}
          {["approve", "reject", "correction", "close"].includes(action) && (
            <div>
              <label className="form-label text-xs">
                {action === "reject" || action === "correction" ? "Reason (required)" : "Remarks (optional)"}
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                className="form-input resize-none text-sm"
                placeholder="Add remarks…"
              />
            </div>
          )}

          {/* Vehicle + driver selection */}
          {action === "assign" && (
            <div className="space-y-3">
              <div>
                <label className="form-label text-xs">Vehicle<span className="text-red-500">*</span></label>
                <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="form-input text-sm">
                  <option value="">— Select Vehicle —</option>
                  {availableVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vehicleNumber}{v.vehicleName ? ` (${v.vehicleName})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label text-xs">Driver (optional)</label>
                <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="form-input text-sm">
                  <option value="">— No driver —</option>
                  {availableDrivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Start km */}
          {action === "start" && (
            <div>
              <label className="form-label text-xs">Start Odometer (km)<span className="text-red-500">*</span></label>
              <input type="number" value={startKm} onChange={(e) => setStartKm(e.target.value)}
                className="form-input text-sm" placeholder="Current odometer reading" />
            </div>
          )}

          {/* End km */}
          {action === "complete" && (
            <div>
              <label className="form-label text-xs">End Odometer (km)<span className="text-red-500">*</span></label>
              <input type="number" value={endKm} onChange={(e) => setEndKm(e.target.value)}
                className="form-input text-sm" placeholder="Final odometer reading" />
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => { setAction(null); setError(null); }}
              className="btn-ghost flex-1 text-sm py-2" disabled={loading}>
              Cancel
            </button>
            <button onClick={handleAction}
              className="btn-primary flex-1 text-sm py-2 min-w-[80px]" disabled={loading}>
              {loading
                ? <span className="flex items-center justify-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Wait…
                  </span>
                : "Confirm"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
