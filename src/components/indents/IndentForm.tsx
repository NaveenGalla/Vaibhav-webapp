// ─────────────────────────────────────────────────────────────────────────────
// IndentForm — create a new vehicle indent / request
// Submits as DRAFT (save) or SUBMITTED (submit for approval)
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const indentSchema = z.object({
  branchId:         z.string().min(1, "Required"),
  department:       z.string().optional(),
  purpose:          z.string().min(1, "Required"),
  vehicleReqDate:   z.string().min(1, "Required"),
  expectedReturnDate: z.string().optional(),
  destination:      z.string().min(1, "Required"),
  estimatedKm:      z.coerce.number().min(1, "Required").optional(),
  vehicleTypeRequired: z.string().optional(),
  driverRequired:   z.boolean().default(false),
  fuelAdvanceRequired: z.boolean().default(false),
  fuelAdvanceAmount: z.coerce.number().optional(),
  remarks:          z.string().optional(),
  submitNow:        z.boolean().default(false),
});

type IndentFormData = z.infer<typeof indentSchema>;

interface Props {
  branches:       { id: string; name: string }[];
  vehicleTypes:   string[];
  defaultBranchId: string;
  userId:         string;
}

const PURPOSES = [
  "Branch Visit", "Customer Visit", "Vendor Visit", "Event/Exhibition",
  "Document Delivery", "Staff Transport", "Material Transport",
  "MD/CMD Travel", "Marketing Activity", "BTL Activity", "Other",
];

export default function IndentForm({ branches, vehicleTypes, defaultBranchId }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<IndentFormData>({
    resolver: zodResolver(indentSchema) as Resolver<IndentFormData>,
    defaultValues: {
      branchId:         defaultBranchId,
      driverRequired:   false,
      fuelAdvanceRequired: false,
      submitNow:        false,
    },
  });

  const fuelAdvanceRequired = watch("fuelAdvanceRequired");

  const onSubmit = async (data: IndentFormData) => {
    setServerError(null);
    const res = await fetch("/api/indents", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { setServerError(json.error ?? "Something went wrong."); return; }
    router.push(`/indents/${json.id}`);
    router.refresh();
  };

  // Helper to get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {serverError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* ── Section: Trip Details ─────────────────────────────────────── */}
      <div className="card">
        <h3 className="mb-4 font-semibold text-slate-950">Trip Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Branch<span className="text-red-500 ml-0.5">*</span></label>
            <select {...register("branchId")} className="form-input">
              <option value="">— Select Branch —</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {errors.branchId && <p className="form-error">{errors.branchId.message}</p>}
          </div>

          <div>
            <label className="form-label">Department</label>
            <input {...register("department")} className="form-input"
              placeholder="e.g. Marketing, Operations" />
          </div>

          <div>
            <label className="form-label">Purpose<span className="text-red-500 ml-0.5">*</span></label>
            <select {...register("purpose")} className="form-input">
              <option value="">— Select Purpose —</option>
              {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {errors.purpose && <p className="form-error">{errors.purpose.message}</p>}
          </div>

          <div>
            <label className="form-label">Destination<span className="text-red-500 ml-0.5">*</span></label>
            <input {...register("destination")} className="form-input"
              placeholder="e.g. Guntur, Hyderabad" />
            {errors.destination && <p className="form-error">{errors.destination.message}</p>}
          </div>

          <div>
            <label className="form-label">Date Required<span className="text-red-500 ml-0.5">*</span></label>
            <input {...register("vehicleReqDate")} type="date" min={today} className="form-input" />
            {errors.vehicleReqDate && <p className="form-error">{errors.vehicleReqDate.message}</p>}
          </div>

          <div>
            <label className="form-label">Expected Return Date</label>
            <input {...register("expectedReturnDate")} type="date" min={today} className="form-input" />
          </div>

          <div>
            <label className="form-label">Estimated Kilometres</label>
            <input {...register("estimatedKm")} type="number" min={1} className="form-input"
              placeholder="e.g. 120" />
          </div>

          <div>
            <label className="form-label">Vehicle Type Preferred</label>
            <select {...register("vehicleTypeRequired")} className="form-input">
              <option value="">Any type</option>
              {vehicleTypes.map((t) => (
                <option key={t} value={t}>{t.replace("_", " ")}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Section: Requirements ────────────────────────────────────── */}
      <div className="card">
        <h3 className="mb-4 font-semibold text-slate-950">Requirements</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register("driverRequired")}
              className="w-4 h-4 rounded accent-slate-950" />
            <span className="text-sm font-medium text-gray-700">Driver required</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register("fuelAdvanceRequired")}
              className="w-4 h-4 rounded accent-slate-950" />
            <span className="text-sm font-medium text-gray-700">Fuel advance required</span>
          </label>

          {fuelAdvanceRequired && (
            <div className="ml-7 max-w-xs">
              <label className="form-label">Advance Amount (₹)</label>
              <input {...register("fuelAdvanceAmount")} type="number" min={0}
                className="form-input" placeholder="e.g. 1000" />
            </div>
          )}
        </div>
      </div>

      {/* ── Section: Remarks ─────────────────────────────────────────── */}
      <div className="card">
        <label className="form-label">Remarks / Additional Information</label>
        <textarea {...register("remarks")} rows={3} className="form-input resize-none"
          placeholder="Any special instructions or notes for the approver…" />
      </div>

      {/* ── Submit actions ───────────────────────────────────────────── */}
      <div className="flex gap-3 justify-end flex-wrap">
        <button type="button" onClick={() => router.back()}
          className="btn-secondary" disabled={isSubmitting}>Cancel</button>

        {/* Save as Draft */}
        <button
          type="submit"
          onClick={() => setValue("submitNow", false)}
          className="btn-ghost border border-gray-300 px-5"
          disabled={isSubmitting}
        >
          Save as Draft
        </button>

        {/* Submit for Approval */}
        <button
          type="submit"
          onClick={() => setValue("submitNow", true)}
          className="btn-primary min-w-[160px]"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Submitting…
              </span>
            : "Submit for Approval"}
        </button>
      </div>
    </form>
  );
}
