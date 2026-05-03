// ─────────────────────────────────────────────────────────────────────────────
// UserForm — create / edit a system user
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const userSchema = z.object({
  name:       z.string().min(1, "Required"),
  email:      z.string().email("Valid email required"),
  employeeId: z.string().optional(),
  phone:      z.string().optional(),
  role:       z.string().min(1, "Required"),
  branchId:   z.string().min(1, "Required"),
  isActive:   z.boolean().default(true),
  // password only required on create
  password:   z.string().min(6, "Min 6 characters").optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface Props {
  roles:         string[];
  branches:      { id: string; name: string }[];
  defaultValues?: Partial<UserFormData>;
  userId?:       string;
}

export default function UserForm({ roles, branches, defaultValues, userId }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const isEdit = !!userId;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema) as Resolver<UserFormData>,
    defaultValues: defaultValues ?? { isActive: true },
  });

  const onSubmit = async (data: UserFormData) => {
    setServerError(null);
    if (!isEdit && !data.password) {
      setError("password", { message: "Password is required" });
      return;
    }
    // Don't send empty password on edit
    if (isEdit && !data.password) delete data.password;

    const res = await fetch(
      isEdit ? `/api/users/${userId}` : "/api/users",
      {
        method:  isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      },
    );
    const json = await res.json();
    if (!res.ok) { setServerError(json.error ?? "Something went wrong."); return; }
    router.push("/users");
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
        <h3 className="mb-4 font-semibold text-slate-950">User Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Full Name<span className="text-red-500 ml-0.5">*</span></label>
            <input {...register("name")} className="form-input" />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>
          <div>
            <label className="form-label">Email Address<span className="text-red-500 ml-0.5">*</span></label>
            <input {...register("email")} type="email" className="form-input" />
            {errors.email && <p className="form-error">{errors.email.message}</p>}
          </div>
          <div>
            <label className="form-label">Employee ID</label>
            <input {...register("employeeId")} className="form-input" />
          </div>
          <div>
            <label className="form-label">Phone</label>
            <input {...register("phone")} className="form-input" />
          </div>
          <div>
            <label className="form-label">Role<span className="text-red-500 ml-0.5">*</span></label>
            <select {...register("role")} className="form-input">
              <option value="">— Select Role —</option>
              {roles.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
            {errors.role && <p className="form-error">{errors.role.message}</p>}
          </div>
          <div>
            <label className="form-label">Branch<span className="text-red-500 ml-0.5">*</span></label>
            <select {...register("branchId")} className="form-input">
              <option value="">— Select Branch —</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {errors.branchId && <p className="form-error">{errors.branchId.message}</p>}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4 font-semibold text-slate-950">
          {isEdit ? "Change Password (leave blank to keep current)" : "Set Password"}
        </h3>
        <div className="max-w-sm">
          <label className="form-label">
            Password{!isEdit && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <div className="relative">
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              className="form-input pr-10"
              placeholder={isEdit ? "Leave blank to keep current" : "Min 6 characters"}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.password && <p className="form-error">{errors.password.message}</p>}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3">
          <input type="checkbox" id="isActive" {...register("isActive")}
            className="w-4 h-4 rounded accent-slate-950" />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
            User account is active
          </label>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={() => router.back()} className="btn-secondary" disabled={isSubmitting}>Cancel</button>
        <button type="submit" className="btn-primary min-w-[120px]" disabled={isSubmitting}>
          {isSubmitting
            ? <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Saving…</span>
            : isEdit ? "Save Changes" : "Create User"}
        </button>
      </div>
    </form>
  );
}
