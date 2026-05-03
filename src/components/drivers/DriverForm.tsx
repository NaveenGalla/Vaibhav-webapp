// ─────────────────────────────────────────────────────────────────────────────
// DriverForm — create / edit a driver
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const driverSchema = z.object({
  name:           z.string().min(1, "Required"),
  employeeId:     z.string().optional(),
  phone:          z.string().optional(),
  email:          z.string().email().optional().or(z.literal("")),
  licenseNumber:  z.string().optional(),
  licenseExpiry:  z.string().optional(),
  licenseType:    z.string().optional(),
  address:        z.string().optional(),
  branchId:       z.string().min(1, "Required"),
  isActive:       z.boolean().default(true),
  remarks:        z.string().optional(),
});

type DriverFormData = z.infer<typeof driverSchema>;

interface Props {
  branches:      { id: string; name: string }[];
  defaultValues?: Partial<DriverFormData>;
  driverId?:     string;
}

export default function DriverForm({ branches, defaultValues, driverId }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!driverId;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DriverFormData>({
    resolver: zodResolver(driverSchema) as Resolver<DriverFormData>,
    defaultValues: defaultValues ?? { isActive: true },
  });

  const onSubmit = async (data: DriverFormData) => {
    setServerError(null);
    const res = await fetch(
      isEdit ? `/api/drivers/${driverId}` : "/api/drivers",
      {
        method:  isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      },
    );
    const json = await res.json();
    if (!res.ok) { setServerError(json.error ?? "Something went wrong."); return; }
    router.push("/drivers");
    router.refresh();
  };

  const Field = ({
    label, name, children, required,
  }: {
    label: string; name: keyof DriverFormData; children: React.ReactNode; required?: boolean;
  }) => (
    <div>
      <label className="form-label">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {errors[name] && <p className="form-error">{errors[name]?.message as string}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {serverError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="card">
        <h3 className="section-title mb-4">Personal Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name" name="name" required>
            <input {...register("name")} className="form-input" placeholder="e.g. Ravi Kumar" />
          </Field>
          <Field label="Employee ID" name="employeeId">
            <input {...register("employeeId")} className="form-input" />
          </Field>
          <Field label="Phone" name="phone">
            <input {...register("phone")} className="form-input" placeholder="+91 98765 43210" />
          </Field>
          <Field label="Email" name="email">
            <input {...register("email")} type="email" className="form-input" />
          </Field>
          <Field label="Address" name="address">
            <textarea {...register("address")} rows={2} className="form-input resize-none" />
          </Field>
          <Field label="Branch" name="branchId" required>
            <select {...register("branchId")} className="form-input">
              <option value="">— Select Branch —</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title mb-4">License Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="License Number" name="licenseNumber">
            <input {...register("licenseNumber")} className="form-input font-mono" />
          </Field>
          <Field label="License Type" name="licenseType">
            <select {...register("licenseType")} className="form-input">
              <option value="">— Type —</option>
              <option value="LMV">LMV (Light Motor Vehicle)</option>
              <option value="MCWG">MCWG (Motorcycle With Gear)</option>
              <option value="HMV">HMV (Heavy Motor Vehicle)</option>
              <option value="HTV">HTV (Heavy Transport Vehicle)</option>
            </select>
          </Field>
          <Field label="License Expiry" name="licenseExpiry">
            <input {...register("licenseExpiry")} type="date" className="form-input" />
          </Field>
        </div>
      </div>

      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Remarks" name="remarks">
            <textarea {...register("remarks")} rows={2} className="form-input resize-none" />
          </Field>
          <div className="flex items-center gap-3 pt-5">
            <input type="checkbox" id="isActive" {...register("isActive")}
              className="w-4 h-4 rounded accent-slate-950" />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Driver is active
            </label>
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={() => router.back()} className="btn-secondary" disabled={isSubmitting}>Cancel</button>
        <button type="submit" className="btn-primary min-w-[120px]" disabled={isSubmitting}>
          {isSubmitting
            ? <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"/>Saving…</span>
            : isEdit ? "Save Changes" : "Add Driver"}
        </button>
      </div>
    </form>
  );
}
