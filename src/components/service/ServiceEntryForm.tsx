"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const serviceSchema = z.object({
  vehicleId:       z.string().min(1, "Required"),
  serviceDate:     z.string().min(1, "Required"),
  serviceType:     z.string().min(1, "Required"),
  description:     z.string().optional(),
  odometer:        z.coerce.number().min(0, "Required"),
  vendor:          z.string().optional(),
  invoiceNumber:   z.string().optional(),
  cost:            z.coerce.number().min(0).optional(),
  nextServiceDate: z.string().optional(),
  nextServiceKm:   z.coerce.number().optional(),
  remarks:         z.string().optional(),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

const SERVICE_TYPES = [
  "General Service",
  "Oil Change",
  "Tyre Rotation",
  "Tyre Replacement",
  "Brake Service",
  "Battery Replacement",
  "AC Service",
  "Engine Overhaul",
  "Transmission Service",
  "Wheel Alignment",
  "Annual Maintenance Contract",
  "Accident Repair",
  "Body Work",
  "Electrical Work",
  "Other",
];

interface Vehicle {
  id: string; vehicleNumber: string; vehicleName: string | null; odometer: number;
}

interface Props {
  vehicles: Vehicle[];
}

export default function ServiceEntryForm({ vehicles }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema) as Resolver<ServiceFormData>,
    defaultValues: { serviceDate: today },
  });

  const handleVehicleChange = (vehicleId: string) => {
    const v = vehicles.find((v) => v.id === vehicleId) ?? null;
    setSelectedVehicle(v);
    if (v) setValue("odometer", v.odometer);
  };

  const onSubmit = async (data: ServiceFormData) => {
    setServerError(null);
    const res = await fetch("/api/service", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { setServerError(json.error ?? "Something went wrong."); return; }
    router.push("/service");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {serverError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Vehicle & Date */}
      <div className="card">
        <h3 className="mb-4 font-semibold text-slate-950">Vehicle & Service Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Vehicle<span className="text-red-500 ml-0.5">*</span></label>
            <select {...register("vehicleId")} className="form-input"
              onChange={(e) => handleVehicleChange(e.target.value)}>
              <option value="">— Select Vehicle —</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicleNumber}{v.vehicleName ? ` — ${v.vehicleName}` : ""}
                </option>
              ))}
            </select>
            {selectedVehicle && (
              <p className="text-xs text-gray-400 mt-1">
                Last recorded: {selectedVehicle.odometer.toLocaleString("en-IN")} km
              </p>
            )}
            {errors.vehicleId && <p className="form-error">{errors.vehicleId.message}</p>}
          </div>

          <div>
            <label className="form-label">Service Date<span className="text-red-500 ml-0.5">*</span></label>
            <input {...register("serviceDate")} type="date" max={today} className="form-input" />
            {errors.serviceDate && <p className="form-error">{errors.serviceDate.message}</p>}
          </div>

          <div>
            <label className="form-label">Service Type<span className="text-red-500 ml-0.5">*</span></label>
            <select {...register("serviceType")} className="form-input">
              <option value="">— Select Type —</option>
              {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.serviceType && <p className="form-error">{errors.serviceType.message}</p>}
          </div>

          <div>
            <label className="form-label">Odometer (km)<span className="text-red-500 ml-0.5">*</span></label>
            <input {...register("odometer")} type="number" min={0} className="form-input tabular-nums" />
            {errors.odometer && <p className="form-error">{errors.odometer.message}</p>}
          </div>
        </div>

        <div className="mt-4">
          <label className="form-label">Description / Work Done</label>
          <textarea {...register("description")} rows={3} className="form-input resize-none"
            placeholder="Describe the service performed…" />
        </div>
      </div>

      {/* Vendor & Cost */}
      <div className="card">
        <h3 className="mb-4 font-semibold text-slate-950">Vendor & Cost</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Vendor / Workshop</label>
            <input {...register("vendor")} className="form-input" placeholder="e.g. Maruti Authorised Service" />
          </div>
          <div>
            <label className="form-label">Invoice Number</label>
            <input {...register("invoiceNumber")} className="form-input font-mono" />
          </div>
          <div>
            <label className="form-label">Cost (₹)</label>
            <input {...register("cost")} type="number" step="0.01" min="0"
              className="form-input tabular-nums" />
          </div>
        </div>
      </div>

      {/* Next Service */}
      <div className="card">
        <h3 className="mb-4 font-semibold text-slate-950">Next Service Due</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Next Service Date</label>
            <input {...register("nextServiceDate")} type="date" min={today} className="form-input" />
          </div>
          <div>
            <label className="form-label">Next Service at (km)</label>
            <input {...register("nextServiceKm")} type="number" min={0}
              className="form-input tabular-nums" placeholder="e.g. 60000" />
          </div>
        </div>
      </div>

      {/* Remarks */}
      <div className="card">
        <label className="form-label">Remarks</label>
        <textarea {...register("remarks")} rows={2} className="form-input resize-none"
          placeholder="Additional notes…" />
      </div>

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={() => router.back()} className="btn-secondary" disabled={isSubmitting}>
          Cancel
        </button>
        <button type="submit" className="btn-primary min-w-[160px]" disabled={isSubmitting}>
          {isSubmitting
            ? <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Saving…</span>
            : "Save Service Entry"}
        </button>
      </div>
    </form>
  );
}
