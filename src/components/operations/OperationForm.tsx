"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Option = { id: string; name: string; extra?: string | null; odometer?: number | null; branchId?: string | null };

type OperationKind = "repairs" | "tyres" | "accidents" | "documents" | "procurement" | "disposal";

type Props = {
  kind: OperationKind;
  vehicles?: Option[];
  branches?: Option[];
  drivers?: Option[];
};

const labels: Record<OperationKind, { title: string; endpoint: string; back: string }> = {
  repairs: { title: "Add Repair Record", endpoint: "/api/repairs", back: "/repairs" },
  tyres: { title: "Add Tyre Record", endpoint: "/api/tyres", back: "/tyres" },
  accidents: { title: "Add Accident Record", endpoint: "/api/accidents", back: "/accidents" },
  documents: { title: "Add Vehicle Document", endpoint: "/api/documents", back: "/documents" },
  procurement: { title: "New Procurement Request", endpoint: "/api/procurement", back: "/procurement" },
  disposal: { title: "New Disposal Request", endpoint: "/api/disposal", back: "/disposal" },
};

const vehicleTypes = ["FOUR_WHEELER", "TWO_WHEELER", "VAN", "TRUCK", "OTHER"];
const fuelTypes = ["PETROL", "DIESEL", "CNG", "EV", "HYBRID"];
const purposes = ["", "ADMIN", "SRM", "BTL_BRANDING", "MARKETING_BRANDING", "MANAGEMENT", "CMD_HOUSE", "D2D_BRANDING", "V_SQUARE", "OTHER"];
const renewalTypes = ["INSURANCE", "POLLUTION", "FITNESS", "PERMIT", "ROAD_TAX", "DRIVER_LICENSE", "AMC", "OTHER"];

export default function OperationForm({ kind, vehicles = [], branches = [], drivers = [] }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const meta = labels[kind];

  async function onSubmit(formData: FormData) {
    setServerError("");
    setIsSubmitting(true);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch(meta.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error ?? "Something went wrong.");
        setIsSubmitting(false);
        return;
      }
      router.push((kind === "procurement" || kind === "disposal") && json.id ? `${meta.back}/${json.id}` : meta.back);
      router.refresh();
    } catch {
      setServerError("Unable to save. Please try again.");
      setIsSubmitting(false);
    }
  }

  const vehicleSelect = (
    <Field label="Vehicle" required>
      <select name="vehicleId" className="form-input" required>
        <option value="">Select vehicle</option>
        {vehicles.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}{v.extra ? ` - ${v.extra}` : ""}
          </option>
        ))}
      </select>
    </Field>
  );

  return (
    <form action={onSubmit} className="space-y-5">
      {serverError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="card">
        <h3 className="mb-4 font-semibold text-slate-950">{meta.title}</h3>

        {kind === "repairs" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {vehicleSelect}
            <Field label="Repair Date" required><input name="repairDate" type="date" defaultValue={today} className="form-input" required /></Field>
            <Field label="Repair Type"><input name="repairType" className="form-input" placeholder="Mechanical, body work..." /></Field>
            <Field label="Odometer"><input name="odometer" type="number" min="0" className="form-input" /></Field>
            <Field label="Vendor"><input name="vendor" className="form-input" /></Field>
            <Field label="Invoice Number"><input name="invoiceNumber" className="form-input" /></Field>
            <Field label="Cost"><input name="cost" type="number" min="0" step="0.01" className="form-input" /></Field>
            <Field label="Invoice URL"><input name="invoiceUrl" className="form-input" placeholder="Optional link" /></Field>
            <Field label="Description" required wide><textarea name="description" rows={3} className="form-input resize-none" required /></Field>
            <Field label="Remarks" wide><textarea name="remarks" rows={2} className="form-input resize-none" /></Field>
          </div>
        )}

        {kind === "tyres" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {vehicleSelect}
            <Field label="Record Date" required><input name="recordDate" type="date" defaultValue={today} className="form-input" required /></Field>
            <Field label="Change Date"><input name="changeDate" type="date" className="form-input" /></Field>
            <Field label="Odometer"><input name="odometer" type="number" min="0" className="form-input" /></Field>
            <Field label="Position"><input name="tyrePosition" className="form-input" placeholder="Front left, rear set..." /></Field>
            <Field label="Brand"><input name="tyreBrand" className="form-input" /></Field>
            <Field label="Size"><input name="tyreSize" className="form-input" /></Field>
            <Field label="Quantity"><input name="quantity" type="number" min="1" className="form-input" /></Field>
            <Field label="Cost"><input name="cost" type="number" min="0" step="0.01" className="form-input" /></Field>
            <Field label="Vendor"><input name="vendor" className="form-input" /></Field>
            <Field label="Next Change KM"><input name="nextChangeKm" type="number" min="0" className="form-input" /></Field>
            <Field label="Remarks"><textarea name="remarks" rows={2} className="form-input resize-none" /></Field>
          </div>
        )}

        {kind === "accidents" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {vehicleSelect}
            <Field label="Driver"><select name="driverId" className="form-input"><option value="">Not recorded</option>{drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
            <Field label="Accident Date" required><input name="accidentDate" type="date" defaultValue={today} className="form-input" required /></Field>
            <Field label="Location"><input name="location" className="form-input" /></Field>
            <Field label="Damage Estimate"><input name="damageEstimate" type="number" min="0" step="0.01" className="form-input" /></Field>
            <Field label="Repair Cost"><input name="repairCost" type="number" min="0" step="0.01" className="form-input" /></Field>
            <Field label="Repair Status"><select name="repairStatus" className="form-input"><option value="PENDING">Pending</option><option value="IN_REPAIR">In repair</option><option value="REPAIRED">Repaired</option></select></Field>
            <Field label="File URL"><input name="fileUrl" className="form-input" placeholder="Optional link" /></Field>
            <Field label="Description" required wide><textarea name="description" rows={3} className="form-input resize-none" required /></Field>
          </div>
        )}

        {kind === "documents" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {vehicleSelect}
            <Field label="Document Type" required><select name="documentType" className="form-input" required>{renewalTypes.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}</select></Field>
            <Field label="File Name"><input name="fileName" className="form-input" /></Field>
            <Field label="File URL"><input name="fileUrl" className="form-input" placeholder="Paste link for now" /></Field>
            <Field label="Issue Date"><input name="issueDate" type="date" className="form-input" /></Field>
            <Field label="Expiry Date"><input name="expiryDate" type="date" className="form-input" /></Field>
            <Field label="Amount"><input name="amount" type="number" min="0" step="0.01" className="form-input" /></Field>
            <Field label="Remarks"><textarea name="remarks" rows={2} className="form-input resize-none" /></Field>
          </div>
        )}

        {kind === "procurement" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Branch" required><select name="branchId" className="form-input" required><option value="">Select branch</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
            <Field label="Vehicle Type" required><select name="vehicleType" className="form-input" required>{vehicleTypes.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}</select></Field>
            <Field label="Fuel Type" required><select name="fuelType" className="form-input" required>{fuelTypes.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
            <Field label="Purpose"><select name="purpose" className="form-input">{purposes.map((p) => <option key={p || "none"} value={p}>{p ? p.replace(/_/g, " ") : "Not specified"}</option>)}</select></Field>
            <Field label="Preferred Brand"><input name="preferredBrand" className="form-input" /></Field>
            <Field label="Required By"><input name="requiredByDate" type="date" className="form-input" /></Field>
            <Field label="Status"><select name="status" className="form-input"><option value="SUBMITTED">Submit request</option><option value="DRAFT">Save draft</option></select></Field>
            <Field label="Remarks"><textarea name="remarks" rows={2} className="form-input resize-none" /></Field>
          </div>
        )}

        {kind === "disposal" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {vehicleSelect}
            <Field label="Reason" required><select name="reason" className="form-input" required><option value="REGULAR_MAINTENANCE_SOLD">Regular maintenance sold</option><option value="BREAKDOWN">Breakdown</option><option value="SCRAPPED">Scrapped</option><option value="OTHER">Other</option></select></Field>
            <Field label="Odometer at Disposal"><input name="odometerAtDisposal" type="number" min="0" className="form-input" /></Field>
            <Field label="Sale Amount"><input name="saleAmount" type="number" min="0" step="0.01" className="form-input" /></Field>
            <Field label="Buyer Details" wide><textarea name="buyerDetails" rows={2} className="form-input resize-none" /></Field>
            <Field label="Remarks" wide><textarea name="remarks" rows={2} className="form-input resize-none" /></Field>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => router.back()} className="btn-secondary" disabled={isSubmitting}>Cancel</button>
        <button type="submit" className="btn-primary min-w-[140px]" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children, required, wide }: { label: string; children: React.ReactNode; required?: boolean; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label className="form-label">{label}{required && <span className="ml-0.5 text-red-500">*</span>}</label>
      {children}
    </div>
  );
}
