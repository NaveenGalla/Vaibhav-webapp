"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const renewalSchema = z.object({
  vehicleId:      z.string().min(1, "Required"),
  renewalType:    z.enum(["INSURANCE", "POLLUTION", "FITNESS", "PERMIT", "ROAD_TAX", "DRIVER_LICENSE", "AMC", "OTHER"]),
  issueDate:      z.string().optional(),
  expiryDate:     z.string().min(1, "Required"),
  policyOrCertNo: z.string().optional(),
  insuredValue:   z.coerce.number().optional(),
  premium:        z.coerce.number().optional(),
  provider:       z.string().optional(),
  remarks:        z.string().optional(),
});

type RenewalFormData = z.infer<typeof renewalSchema>;

interface Vehicle {
  id: string; vehicleNumber: string; vehicleName: string | null;
}

interface Props {
  vehicles: Vehicle[];
  defaultValues?: Partial<RenewalFormData> & { id?: string };
  isEdit?: boolean;
}

export default function RenewalForm({ vehicles, defaultValues, isEdit }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RenewalFormData>({
    resolver: zodResolver(renewalSchema) as Resolver<RenewalFormData>,
    defaultValues: {
      renewalType: "INSURANCE",
      ...defaultValues,
    },
  });

  const renewalType = watch("renewalType");

  const onSubmit = async (data: RenewalFormData) => {
    setServerError(null);
    const url    = isEdit ? `/api/renewals/${defaultValues?.id}` : "/api/renewals";
    const method = isEdit ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { setServerError(json.error ?? "Something went wrong."); return; }
    router.push("/renewals");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {serverError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="card">
        <h3 className="section-title mb-4">Document Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Vehicle<span className="text-red-500 ml-0.5">*</span></label>
            <select {...register("vehicleId")} className="form-input" disabled={isEdit}>
              <option value="">— Select Vehicle —</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicleNumber}{v.vehicleName ? ` — ${v.vehicleName}` : ""}
                </option>
              ))}
            </select>
            {errors.vehicleId && <p className="form-error">{errors.vehicleId.message}</p>}
          </div>

          <div>
            <label className="form-label">Document Type<span className="text-red-500 ml-0.5">*</span></label>
            <select {...register("renewalType")} className="form-input" disabled={isEdit}>
              <option value="INSURANCE">Insurance</option>
              <option value="POLLUTION">Pollution Certificate (PUC)</option>
              <option value="FITNESS">Fitness Certificate</option>
              <option value="PERMIT">Permit</option>
              <option value="ROAD_TAX">Road Tax</option>
              <option value="DRIVER_LICENSE">Driver License</option>
              <option value="AMC">AMC</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="form-label">Issue Date</label>
            <input {...register("issueDate")} type="date" className="form-input" />
          </div>

          <div>
            <label className="form-label">Expiry Date<span className="text-red-500 ml-0.5">*</span></label>
            <input {...register("expiryDate")} type="date" className="form-input" />
            {errors.expiryDate && <p className="form-error">{errors.expiryDate.message}</p>}
          </div>

          <div>
            <label className="form-label">Policy / Certificate No.</label>
            <input {...register("policyOrCertNo")} className="form-input font-mono"
              placeholder="e.g. INS-2024-00123" />
          </div>

          <div>
            <label className="form-label">Provider / Issuing Authority</label>
            <input {...register("provider")} className="form-input"
              placeholder="e.g. National Insurance Co." />
          </div>

          {/* Insurance-specific */}
          {renewalType === "INSURANCE" && (
            <>
              <div>
                <label className="form-label">Insured Value (₹)</label>
                <input {...register("insuredValue")} type="number" step="1000" min={0}
                  className="form-input tabular-nums" />
              </div>
              <div>
                <label className="form-label">Premium (₹)</label>
                <input {...register("premium")} type="number" step="0.01" min={0}
                  className="form-input tabular-nums" />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <label className="form-label">Remarks</label>
        <textarea {...register("remarks")} rows={2} className="form-input resize-none"
          placeholder="Any notes about this document…" />
      </div>

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={() => router.back()} className="btn-secondary" disabled={isSubmitting}>
          Cancel
        </button>
        <button type="submit" className="btn-primary min-w-[140px]" disabled={isSubmitting}>
          {isSubmitting
            ? <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Saving…</span>
            : isEdit ? "Update Document" : "Save Document"}
        </button>
      </div>
    </form>
  );
}
