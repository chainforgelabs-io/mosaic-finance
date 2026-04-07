"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { MosaicLogo } from "@/components/app/MosaicLogo";
import { updatePassword } from "@/lib/actions/auth";
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from "@/lib/schemas/auth";

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: ResetPasswordFormData) {
    setServerError(null);
    const result = await updatePassword({
      password: data.password,
      confirmPassword: data.confirmPassword,
    });
    if (result?.error) {
      setServerError(result.error);
    } else if (result?.redirectTo) {
      window.location.href = result.redirectTo;
    }
  }

  return (
    <div className="w-full max-w-[480px]">
      <div className="rounded-lg border border-[var(--warm-200)] bg-white p-8 md:p-10">
        <div className="mb-8 flex flex-col items-center">
          <MosaicLogo size="md" className="mb-6" />
          <h1 className="font-display text-[28px] font-bold text-[var(--text-primary)]">
            Set new password
          </h1>
          <p className="mt-2 text-center font-body text-[15px] text-[var(--text-secondary)]">
            Enter your new password below.
          </p>
        </div>

        {serverError && (
          <div className="mb-6 rounded-lg border border-[var(--error)]/20 bg-[var(--error)]/5 px-4 py-3">
            <p className="font-body text-[13px] text-[var(--error)]">{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block font-body text-sm font-medium text-[var(--text-primary)]"
            >
              New password
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

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block font-body text-sm font-medium text-[var(--text-primary)]"
            >
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Confirm your password"
                className={inputClassName(!!errors.confirmPassword, "pr-11")}
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-[18px]" />
                ) : (
                  <Eye className="size-[18px]" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <FieldError message={errors.confirmPassword.message!} />
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-lg bg-[var(--emerald)] px-6 py-3 font-display text-[15px] font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              "Update password"
            )}
          </button>
        </form>

        <p className="mt-6 text-center font-body text-sm text-[var(--text-secondary)]">
          <Link
            href="/login"
            className="font-medium text-[var(--emerald)] transition-colors hover:text-[var(--emerald-dark)]"
          >
            Back to sign in
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
