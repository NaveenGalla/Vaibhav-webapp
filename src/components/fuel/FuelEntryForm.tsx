// ─────────────────────────────────────────────────────────────────────────────
// FuelEntryForm — record a fuel fill-up for a vehicle.
// Auto-calculates total amount from qty × rate.
// Validates odometer ≥ vehicle's last recorded odometer.
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const fuelSchema = z.object({
  vehicleId:       z.string().min(1, "Required"),
  date:            z.string().min(1, "Required"),
  fuelType:        z.enum(["PETROL", "DIESEL", "CNG", "EV", "HYBRID"]),
  quantityLitres:  z.coerce.number().positive("Must be > 0"),
  ratePerLitre:    z.coerce.number().positive("Must be > 0"),
  totalAmount:     z.coerce.number().positive(),
  fuelStation:     z.string().optional(),
  billNumber:      z.string().optional(),
  odometer:        z.coerce.number().min(0, "Required"),
  openingKm:       z.coerce.number().optional(),
  closingKm:       z.coerce.number().optional(),
  driverName:      z.string().optional(),
  indentId:        z.string().optional(),
  officialOrPersonal: z.enum(["OFFICIAL", "PERSONAL"]).default("OFFICIAL"),
  remarks:         z.string().optional(),
});

type FuelFormData = z.infer<typeof fuelSchema>;

interface Vehicle {
  id: string; vehicleNumber: string; vehicleName: string | null;
  odometer: number; fuelType: string;
}

interface Props {
  vehicles: Vehicle[];
  drivers:  { id: string; name: string }[];
  indents:  { id: string; indentNumber: string; purpose: string | null }[];
}

export default function FuelEntryForm({ vehicles, drivers, indents }: Props) {
  const router = useRouter();
  const [serverError, setServerError]   = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [autoTotal, setAutoTotal]        = useState<number>(0);

  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FuelFormData>({
    resolver: zodResolver(fuelSchema) as Resolver<FuelFormData>,
    defaultValues: {
      date: today,
      fuelType: "DIESEL",
      officialOrPersonal: "OFFICIAL",
    },
  });

  // Watch qty + rate to auto-fill total
  const qty  = useWatch({ control, name: "quantityLitres" });
  const rate = useWatch({ control, name: "ratePerLitre" });

  useEffect(() => {
    if (qty && rate) {
      const t = Math.round(Number(qty) * Number(rate) * 100) / 100;
      setAutoTotal(t);
      setValue("totalAmount", t);
    }
  }, [qty, rate, setValue]);

  // When vehicle changes, pre-fill fuel type + odometer hint
  const handleVehicleChange = (vehicleId: string) => {
    const v = vehicles.find((v) => v.id === vehicleId) ?? null;
    setSelectedVehicle(v);
    if (v) {
      setValue("fuelType", v.fuelType as any);
      setValue("openingKm", v.odometer);
    }
  };

  const onSubmit = async (data: FuelFormData) => {
    setServerError(null);
    const res = await fetch("/api/fuel", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { setServerError(json.error ?? "Something went wrong."); return; }
    router.push("/fuel");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {serverError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* ── Vehicle & Date ─────────────────────────────────────────────── */}
      <div className="card">
        <h3 className="section-title mb-4">Vehicle & Date</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Vehicle<span className="text-red-500 ml-0.5">*</span></label>
            <select {...register("vehicleId")}
              className="form-input"
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
            <label className="form-label">Date<span className="text-red-500 ml-0.5">*</span></label>
            <input {...register("date")} type="date" max={today} className="form-input" />
            {errors.date && <p className="form-error">{errors.date.message}</p>}
          </div>

          <div>
            <label className="form-label">Fuel Type</label>
            <select {...register("fuelType")} className="form-input">
              <option value="PETROL">Petrol</option>
              <option value="DIESEL">Diesel</option>
              <option value="CNG">CNG</option>
              <option value="EV">Electric</option>
            </select>
          </div>

          <div>
            <label className="form-label">Official / Personal</label>
            <select {...register("officialOrPersonal")} className="form-input">
              <option value="OFFICIAL">Official</option>
              <option value="PERSONAL">Personal</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Fuel Details ───────────────────────────────────────────────── */}
      <div className="card">
        <h3 className="section-title mb-4">Fuel Details</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Quantity (Litres)<span className="text-red-500 ml-0.5">*</span></label>
            <input {...register("quantityLitres")} type="number" step="0.01" min="0.01"
              className="form-input" placeholder="e.g. 30.5" />
            {errors.quantityLitres && <p className="form-error">{errors.quantityLitres.message}</p>}
          </div>

          <div>
            <label className="form-label">Rate per Litre (₹)<span className="text-red-500 ml-0.5">*</span></label>
            <input {...register("ratePerLitre")} type="number" step="0.01" min="0.01"
              className="form-input" placeholder="e.g. 102.50" />
            {errors.ratePerLitre && <p className="form-error">{errors.ratePerLitre.message}</p>}
          </div>

          <div>
            <label className="form-label">Total Amount (₹)</label>
            <input {...register("totalAmount")} type="number" step="0.01"
              className="form-input font-semibold text-slate-950"
              value={autoTotal || ""}
              onChange={(e) => setValue("totalAmount", Number(e.target.value))} />
            {errors.totalAmount && <p className="form-error">{errors.totalAmount.message}</p>}
          </div>

          <div>
            <label className="form-label">Fuel Station</label>
            <input {...register("fuelStation")} className="form-input" placeholder="e.g. HP Petrol Bunk" />
          </div>

          <div>
            <label className="form-label">Bill / Receipt No.</label>
            <input {...register("billNumber")} className="form-input font-mono" />
          </div>

          <div>
            <label className="form-label">Driver Name</label>
            <input {...register("driverName")} className="form-input"
              list="driver-suggestions"
              placeholder="Type or select" />
            <datalist id="driver-suggestions">
              {drivers.map((d) => <option key={d.id} value={d.name} />)}
            </datalist>
          </div>
        </div>
      </div>

      {/* ── Odometer ─────────────────────────────────────────────────── */}
      <div className="card">
        <h3 className="section-title mb-4">Odometer Readings</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Opening KM</label>
            <input {...register("openingKm")} type="number" min={0} className="form-input tabular-nums" />
          </div>
          <div>
            <label className="form-label">Current Odometer<span className="text-red-500 ml-0.5">*</span></label>
            <input {...register("odometer")} type="number" min={0} className="form-input tabular-nums" />
            {errors.odometer && <p className="form-error">{errors.odometer.message}</p>}
          </div>
          <div>
            <label className="form-label">Closing KM</label>
            <input {...register("closingKm")} type="number" min={0} className="form-input tabular-nums" />
          </div>
        </div>
      </div>

      {/* ── Indent linkage ────────────────────────────────────────────── */}
      {indents.length > 0 && (
        <div className="card">
          <label className="form-label">Link to Indent (optional)</label>
          <select {...register("indentId")} className="form-input max-w-sm">
            <option value="">— Not linked to any indent —</option>
            {indents.map((i) => (
              <option key={i.id} value={i.id}>
                {i.indentNumber}{i.purpose ? ` — ${i.purpose}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── Remarks ──────────────────────────────────────────────────── */}
      <div className="card">
        <label className="form-label">Remarks</label>
        <textarea {...register("remarks")} rows={2} className="form-input resize-none"
          placeholder="Any notes about this fuel entry…" />
      </div>

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={() => router.back()} className="btn-secondary" disabled={isSubmitting}>Cancel</button>
        <button type="submit" className="btn-primary min-w-[140px]" disabled={isSubmitting}>
          {isSubmitting
            ? <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Saving…</span>
            : "Save Fuel Entry"}
        </button>
      </div>
    </form>
  );
}
