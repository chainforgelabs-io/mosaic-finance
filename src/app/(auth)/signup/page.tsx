"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { FinovaLogo } from "@/components/app/FinovaLogo";
import { signUp, signInWithGoogle } from "@/lib/actions/auth";
import { signUpSchema, PROVINCES, type SignUpFormData } from "@/lib/schemas/auth";

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      alias: "",
      province: undefined,
    },
  });

  async function onSubmit(data: SignUpFormData) {
    setServerError(null);
    const result = await signUp(data);
    if (result?.error) {
      setServerError(result.error);
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    setServerError(null);
    const result = await signInWithGoogle();
    if (result?.error) {
      setServerError(result.error);
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[480px]">
      <div className="rounded-lg border border-[var(--warm-200)] bg-white p-8 md:p-10">
        <div className="mb-8 flex flex-col items-center">
          <FinovaLogo size="md" className="mb-6" />
          <h1 className="font-display text-[28px] font-bold text-[var(--text-primary)]">
            Create your account
          </h1>
          <p className="mt-2 text-center font-body text-[15px] text-[var(--text-secondary)]">
            No personal information required. Choose any alias.
          </p>
        </div>

        {serverError && (
          <div className="mb-6 rounded-lg border border-[var(--error)]/20 bg-[var(--error)]/5 px-4 py-3">
            <p className="font-body text-[13px] text-[var(--error)]">{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block font-body text-sm font-medium text-[var(--text-primary)]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={inputClassName(!!errors.email)}
              {...register("email")}
            />
            {errors.email && <FieldError message={errors.email.message!} />}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block font-body text-sm font-medium text-[var(--text-primary)]"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                className={inputClassName(!!errors.password, "pr-11")}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="size-[18px]" />
                ) : (
                  <Eye className="size-[18px]" />
                )}
              </button>
            </div>
            {errors.password && <FieldError message={errors.password.message!} />}
          </div>

          {/* Alias */}
          <div>
            <label
              htmlFor="alias"
              className="mb-1.5 block font-body text-sm font-medium text-[var(--text-primary)]"
            >
              Alias
            </label>
            <input
              id="alias"
              type="text"
              autoComplete="username"
              placeholder="e.g. maple_investor"
              className={inputClassName(!!errors.alias)}
              {...register("alias")}
            />
            {errors.alias ? (
              <FieldError message={errors.alias.message!} />
            ) : (
              <p className="mt-1 font-body text-xs text-[var(--text-muted)]">
                We never collect your legal name.
              </p>
            )}
          </div>

          {/* Province */}
          <div>
            <label
              htmlFor="province"
              className="mb-1.5 block font-body text-sm font-medium text-[var(--text-primary)]"
            >
              Province
            </label>
            <select
              id="province"
              className={inputClassName(!!errors.province, "cursor-pointer")}
              defaultValue=""
              {...register("province")}
            >
              <option value="" disabled>
                Select your province
              </option>
              {PROVINCES.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
            {errors.province && <FieldError message={errors.province.message!} />}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-lg bg-[var(--emerald)] px-6 py-3 font-display text-[15px] font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-[var(--warm-200)]" />
          <span className="font-body text-sm text-[var(--text-muted)]">or</span>
          <div className="h-px flex-1 bg-[var(--warm-200)]" />
        </div>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isSubmitting}
          className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-[var(--slate-950)] px-6 py-3 font-display text-[15px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--warm-100)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGoogleLoading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <>
              <GoogleIcon />
              Continue with Google
            </>
          )}
        </button>

        {/* Footer link */}
        <p className="mt-6 text-center font-body text-sm text-[var(--text-secondary)]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-[var(--emerald)] transition-colors hover:text-[var(--emerald-dark)]"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function inputClassName(hasError: boolean, extra = "") {
  return [
    "w-full rounded-lg border bg-white px-4 py-2.5 font-body text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors outline-none",
    hasError
      ? "border-[var(--error)] focus:ring-2 focus:ring-[var(--error)]/20"
      : "border-[var(--warm-200)] focus:border-[var(--emerald)] focus:ring-2 focus:ring-[var(--emerald)]/20",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

function FieldError({ message }: { message: string }) {
  return (
    <p className="mt-1 font-body text-[13px] text-[var(--error)]">{message}</p>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}
