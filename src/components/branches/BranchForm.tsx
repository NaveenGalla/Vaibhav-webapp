// ─────────────────────────────────────────────────────────────────────────────
// BranchForm — create / edit a branch
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const branchSchema = z.object({
  name:    z.string().min(1, "Required"),
  code:    z.string().optional(),
  address: z.string().optional(),
  city:    z.string().optional(),
  state:   z.string().optional(),
  phone:   z.string().optional(),
  email:   z.string().email().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

type BranchFormData = z.infer<typeof branchSchema>;

interface Props {
  defaultValues?: Partial<BranchFormData>;
  branchId?:      string;
}

export default function BranchForm({ defaultValues, branchId }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!branchId;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema) as Resolver<BranchFormData>,
    defaultValues: defaultValues ?? { isActive: true },
  });

  const onSubmit = async (data: BranchFormData) => {
    setServerError(null);
    const res = await fetch(
      isEdit ? `/api/branches/${branchId}` : "/api/branches",
      {
        method:  isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      },
    );
    const json = await res.json();
    if (!res.ok) { setServerError(json.error ?? "Something went wrong."); return; }
    router.push("/branches");
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
        <h3 className="section-title mb-4">Branch Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Branch Name<span className="text-red-500 ml-0.5">*</span></label>
            <input {...register("name")} className="form-input" placeholder="e.g. Vijayawada Main" />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>
          <div>
            <label className="form-label">Branch Code</label>
            <input {...register("code")} className="form-input font-mono" placeholder="e.g. VJA" />
          </div>
          <div>
            <label className="form-label">City</label>
            <input {...register("city")} className="form-input" />
          </div>
          <div>
            <label className="form-label">State</label>
            <input {...register("state")} className="form-input" defaultValue="Andhra Pradesh" />
          </div>
          <div>
            <label className="form-label">Phone</label>
            <input {...register("phone")} className="form-input" />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input {...register("email")} type="email" className="form-input" />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Address</label>
            <textarea {...register("address")} rows={2} className="form-input resize-none" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="isActive" {...register("isActive")}
              className="w-4 h-4 rounded accent-slate-950" />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Branch is active</label>
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={() => router.back()} className="btn-secondary" disabled={isSubmitting}>Cancel</button>
        <button type="submit" className="btn-primary min-w-[120px]" disabled={isSubmitting}>
          {isSubmitting
            ? <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"/>Saving…</span>
            : isEdit ? "Save Changes" : "Add Branch"}
        </button>
      </div>
    </form>
  );
}
