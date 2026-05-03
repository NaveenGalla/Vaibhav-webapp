// ─────────────────────────────────────────────────────────────────────────────
// VehicleForm — client form for creating / editing a vehicle.
// Calls POST /api/vehicles on submit.
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// ── Zod schema ────────────────────────────────────────────────────────────────
const vehicleSchema = z.object({
  vehicleNumber:    z.string().min(1, "Required").max(20).toUpperCase(),
  vehicleName:      z.string().optional(),
  make:             z.string().min(1, "Required"),
  model:            z.string().min(1, "Required"),
  vehicleType:      z.enum(["FOUR_WHEELER", "TWO_WHEELER", "VAN", "TRUCK", "OTHER"]),
  fuelType:         z.enum(["PETROL", "DIESEL", "CNG", "EV", "HYBRID"]),
  ownershipType:    z.enum(["OWNED", "LEASED", "HIRED"]),
  yearOfManufacture: z.coerce.number().min(1990).max(new Date().getFullYear() + 1).optional(),
  engineNumber:     z.string().optional(),
  chassisNumber:    z.string().optional(),
  registrationDate: z.string().optional(),
  registrationExpiry: z.string().optional(),
  odometer:         z.coerce.number().min(0).default(0),
  seatingCapacity:  z.coerce.number().min(1).optional(),
  loadCapacity:     z.coerce.number().min(0).optional(),
  colour:           z.string().optional(),
  fastagNumber:     z.string().optional(),
  purposeOfUsage:   z.string().optional(),
  branchId:         z.string().min(1, "Required"),
  driverId:         z.string().optional(),
  remarks:          z.string().optional(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface Props {
  branches: { id: string; name: string }[];
  drivers:  { id: string; name: string }[];
  defaultValues?: Partial<VehicleFormData>;
  vehicleId?: string; // present when editing
}

const PURPOSES = [
  "ADMIN", "SRM", "BTL_BRANDING", "MARKETING_BRANDING",
  "MANAGEMENT", "CMD_HOUSE", "D2D_BRANDING", "V_SQUARE", "OTHER",
];

export default function VehicleForm({ branches, drivers, defaultValues, vehicleId }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!vehicleId;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormData>({
    // Cast resolver to bypass duplicate @hookform/resolvers type declaration in
    // some dependency combinations (safe — zod schema matches VehicleFormData)
    resolver: zodResolver(vehicleSchema) as Resolver<VehicleFormData>,
    defaultValues: defaultValues ?? { odometer: 0, vehicleType: "FOUR_WHEELER", fuelType: "PETROL", ownershipType: "OWNED" },
  });

  const onSubmit = async (data: VehicleFormData) => {
    setServerError(null);
    const res = await fetch(
      isEdit ? `/api/vehicles/${vehicleId}` : "/api/vehicles",
      {
        method:  isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      },
    );
    const json = await res.json();
    if (!res.ok) {
      setServerError(json.error ?? "Something went wrong.");
      return;
    }
    router.push(`/vehicles/${json.id}`);
    router.refresh();
  };

  // ── Field wrapper ─────────────────────────────────────────────────────────
  const Field = ({
    label, name, children, required,
  }: {
    label: string;
    name: keyof VehicleFormData;
    children: React.ReactNode;
    required?: boolean;
  }) => (
    <div>
      <label className="form-label">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {errors[name] && (
        <p className="form-error">{errors[name]?.message as string}</p>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* ── Section: Basic Info ─────────────────────────────────────────── */}
      <div className="card">
        <h3 className="mb-4 font-semibold text-slate-950">Basic Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Vehicle Number" name="vehicleNumber" required>
            <input {...register("vehicleNumber")} className="form-input uppercase"
              placeholder="e.g. AP39AB1234" />
          </Field>

          <Field label="Vehicle Name / Alias" name="vehicleName">
            <input {...register("vehicleName")} className="form-input"
              placeholder="e.g. MD Car, Branch Van" />
          </Field>

          <Field label="Make (Brand)" name="make" required>
            <input {...register("make")} className="form-input" placeholder="e.g. Maruti, Honda" />
          </Field>

          <Field label="Model" name="model" required>
            <input {...register("model")} className="form-input" placeholder="e.g. Swift, Activa" />
          </Field>

          <Field label="Year of Manufacture" name="yearOfManufacture">
            <input {...register("yearOfManufacture")} type="number"
              className="form-input" placeholder="e.g. 2020" />
          </Field>

          <Field label="Colour" name="colour">
            <input {...register("colour")} className="form-input" placeholder="e.g. White" />
          </Field>
        </div>
      </div>

      {/* ── Section: Classification ─────────────────────────────────────── */}
      <div className="card">
        <h3 className="mb-4 font-semibold text-slate-950">Classification</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Vehicle Type" name="vehicleType" required>
            <select {...register("vehicleType")} className="form-input">
              <option value="FOUR_WHEELER">Four Wheeler</option>
              <option value="TWO_WHEELER">Two Wheeler</option>
              <option value="VAN">Van / Tempo</option>
              <option value="TRUCK">Truck</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>

          <Field label="Fuel Type" name="fuelType" required>
            <select {...register("fuelType")} className="form-input">
              <option value="PETROL">Petrol</option>
              <option value="DIESEL">Diesel</option>
              <option value="CNG">CNG</option>
              <option value="EV">Electric</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </Field>

          <Field label="Ownership Type" name="ownershipType" required>
            <select {...register("ownershipType")} className="form-input">
              <option value="OWNED">Owned</option>
              <option value="LEASED">Leased</option>
              <option value="HIRED">Hired</option>
            </select>
          </Field>

          <Field label="Purpose of Usage" name="purposeOfUsage">
            <select {...register("purposeOfUsage")} className="form-input">
              <option value="">— Select —</option>
              {PURPOSES.map((p) => (
                <option key={p} value={p}>{p.replace(/_/g, " ")}</option>
              ))}
            </select>
          </Field>

          <Field label="Seating Capacity" name="seatingCapacity">
            <input {...register("seatingCapacity")} type="number" min={1}
              className="form-input" placeholder="e.g. 5" />
          </Field>

          <Field label="Load Capacity (kg)" name="loadCapacity">
            <input {...register("loadCapacity")} type="number" min={0}
              className="form-input" placeholder="For trucks/vans" />
          </Field>
        </div>
      </div>

      {/* ── Section: Registration ───────────────────────────────────────── */}
      <div className="card">
        <h3 className="mb-4 font-semibold text-slate-950">Registration & Identifiers</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Engine Number" name="engineNumber">
            <input {...register("engineNumber")} className="form-input font-mono" />
          </Field>

          <Field label="Chassis Number" name="chassisNumber">
            <input {...register("chassisNumber")} className="form-input font-mono" />
          </Field>

          <Field label="Registration Date" name="registrationDate">
            <input {...register("registrationDate")} type="date" className="form-input" />
          </Field>

          <Field label="Registration Expiry" name="registrationExpiry">
            <input {...register("registrationExpiry")} type="date" className="form-input" />
          </Field>

          <Field label="FASTag Number" name="fastagNumber">
            <input {...register("fastagNumber")} className="form-input font-mono" />
          </Field>

          <Field label="Current Odometer (km)" name="odometer">
            <input {...register("odometer")} type="number" min={0} className="form-input" />
          </Field>
        </div>
      </div>

      {/* ── Section: Assignment ─────────────────────────────────────────── */}
      <div className="card">
        <h3 className="mb-4 font-semibold text-slate-950">Branch & Driver Assignment</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Branch" name="branchId" required>
            <select {...register("branchId")} className="form-input">
              <option value="">— Select Branch —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Assigned Driver (optional)" name="driverId">
            <select {...register("driverId")} className="form-input">
              <option value="">— Not assigned —</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {/* ── Section: Remarks ────────────────────────────────────────────── */}
      <div className="card">
        <Field label="Remarks" name="remarks">
          <textarea {...register("remarks")} rows={3} className="form-input resize-none"
            placeholder="Any additional notes about this vehicle…" />
        </Field>
      </div>

      {/* ── Submit ──────────────────────────────────────────────────────── */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button type="submit" className="btn-primary min-w-[120px]" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Saving…
            </span>
          ) : (
            isEdit ? "Save Changes" : "Add Vehicle"
          )}
        </button>
      </div>
    </form>
  );
}
