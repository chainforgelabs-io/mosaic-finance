"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import { MosaicLogo } from "@/components/app/MosaicLogo";
import { resetPassword } from "@/lib/actions/auth";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from "@/lib/schemas/auth";

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(data: ForgotPasswordFormData) {
    setServerError(null);
    const result = await resetPassword(data);
    if (result?.error) {
      setServerError(result.error);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-[480px]">
        <div className="rounded-lg border border-[var(--warm-200)] bg-white p-8 md:p-10">
          <div className="mb-8 flex flex-col items-center">
            <MosaicLogo size="md" className="mb-6" />
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-[var(--emerald-soft)]">
              <Mail className="size-7 text-[var(--emerald-dark)]" />
            </div>
            <h1 className="font-display text-[28px] font-bold text-[var(--text-primary)]">
              Check your email
            </h1>
            <p className="mt-2 text-center font-body text-[15px] text-[var(--text-secondary)]">
              If an account exists for that address, we sent a link to reset your
              password. The link expires after a short time.
            </p>
          </div>
          <Link
            href="/login"
            className="flex w-full items-center justify-center rounded-lg bg-[var(--emerald)] px-6 py-3 font-display text-[15px] font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)]"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[480px]">
      <div className="rounded-lg border border-[var(--warm-200)] bg-white p-8 md:p-10">
        <div className="mb-8 flex flex-col items-center">
          <MosaicLogo size="md" className="mb-6" />
          <h1 className="font-display text-[28px] font-bold text-[var(--text-primary)]">
            Reset your password
          </h1>
          <p className="mt-2 text-center font-body text-[15px] text-[var(--text-secondary)]">
            Enter your email and we&apos;ll send a reset link.
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-lg bg-[var(--emerald)] px-6 py-3 font-display text-[15px] font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              "Send reset link"
            )}
          </button>
        </form>

        <p className="mt-6 text-center font-body text-sm text-[var(--text-secondary)]">
          Remember your password?{" "}
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
