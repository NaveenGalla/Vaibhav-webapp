"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Car, Loader2 } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setServerError("");
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setServerError("Invalid email or password. Please try again.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — brand ───────────────────────────────────────────────── */}
      <div className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:w-1/2 lg:flex-col lg:items-center lg:justify-center">
        {/* Decorative circles */}
        <div className="relative z-10 text-center max-w-sm">
          {/* Logo icon */}
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[1.35rem] bg-white/10 ring-1 ring-white/15">
            <Car size={40} className="text-white" />
          </div>

          <h1 className="text-4xl font-bold mb-2 text-white">
            Vaibhav Jewellers
          </h1>
          <p className="text-sm mb-1 opacity-60">Manoj Vaibhav Gems N Jewellers Ltd.</p>

          <div className="my-8 h-px bg-white/15" />

          <h2 className="text-2xl font-semibold mb-3 text-white">
            Vehicle & Fuel
            <br />Management System
          </h2>
          <p className="text-sm opacity-60 leading-relaxed">
            Track vehicles, manage fuel, handle approvals, and stay on top of
            renewals — all in one place.
          </p>
        </div>

        {/* Footer */}
        <p className="absolute bottom-6 text-xs opacity-30">
          Internal system — authorised users only
        </p>
      </div>

      {/* ── Right panel — login form ─────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center bg-[#f5f5f7] p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950">
              <Car size={28} color="#fff" />
            </div>
            <h1 className="text-xl font-bold text-slate-950">
              Vaibhav Jewellers — VFM
            </h1>
          </div>

          <div className="card">
            <h2 className="text-xl font-bold mb-1 text-slate-950">
              Sign in
            </h2>
            <p className="text-sm mb-6 text-gray-500">
              Enter your credentials to access the system
            </p>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              {/* Email */}
              <div className="mb-4">
                <label className="form-label" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="form-input"
                  placeholder="you@vaibhav.in"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="form-error">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="mb-5">
                <label className="form-label" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="form-input pr-10"
                    placeholder="••••••••"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="form-error">{errors.password.message}</p>
                )}
              </div>

              {/* Server error */}
              {serverError && (
                <div className="mb-4 rounded-md p-3 text-sm" style={{ background: "#fee2e2", color: "#991b1b" }}>
                  {serverError}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs mt-6 text-gray-400">
            Having trouble? Contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
