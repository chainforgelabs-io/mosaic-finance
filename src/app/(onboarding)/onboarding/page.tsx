"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Briefcase,
  GraduationCap,
  Loader2,
  Palmtree,
  UserRound,
  Users,
  Heart,
  HeartHandshake,
  Baby,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StepProgress } from "@/components/app/StepProgress";
import { FinovaLogo } from "@/components/app/FinovaLogo";
import { useOnboardingStore } from "@/stores/onboarding";
import { saveFinancialProfile } from "@/lib/actions/onboarding";
import {
  financialProfileSchema,
  EMPLOYMENT_TYPES,
  FAMILY_STRUCTURES,
  type FinancialProfileFormData,
} from "@/lib/schemas/onboarding";
import { PROVINCES } from "@/lib/schemas/auth";
import { createClient } from "@/lib/supabase/client";
import type { LucideIcon } from "lucide-react";

const EMPLOYMENT_OPTIONS: { value: (typeof EMPLOYMENT_TYPES)[number]; label: string; icon: LucideIcon }[] = [
  { value: "Employed", label: "Employed", icon: Briefcase },
  { value: "Self-Employed", label: "Self-Employed", icon: UserRound },
  { value: "Retired", label: "Retired", icon: Palmtree },
  { value: "Student", label: "Student", icon: GraduationCap },
];

const FAMILY_OPTIONS: { value: (typeof FAMILY_STRUCTURES)[number]; label: string; icon: LucideIcon }[] = [
  { value: "Single", label: "Single", icon: UserRound },
  { value: "Married", label: "Married", icon: Heart },
  { value: "Common-Law", label: "Common-Law", icon: HeartHandshake },
  { value: "Single Parent", label: "Single Parent", icon: Baby },
  { value: "Family", label: "Family", icon: Home },
];

export default function OnboardingProfilePage() {
  const { currentStep, completedSteps, setCurrentStep } = useOnboardingStore();
  const [serverError, setServerError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FinancialProfileFormData>({
    resolver: zodResolver(financialProfileSchema),
    defaultValues: {
      alias: "",
      age: undefined,
      province: undefined,
      employmentType: undefined,
      familyStructure: undefined,
    },
  });

  useEffect(() => {
    setCurrentStep("profile");
  }, [setCurrentStep]);

  useEffect(() => {
    if (prefilled) return;

    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("alias, province")
        .eq("id", user.id)
        .single();

      if (profile) {
        if (profile.alias) setValue("alias", profile.alias);
        if (profile.province) setValue("province", profile.province);
      }
      setPrefilled(true);
    }

    loadProfile();
  }, [prefilled, setValue]);

  async function onSubmit(data: FinancialProfileFormData) {
    setServerError(null);
    const result = await saveFinancialProfile(data);
    if (result?.error) {
      setServerError(result.error);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
    <div className="w-full max-w-[640px]">
      <div className="rounded-lg border border-[var(--warm-200)] bg-white p-8 md:p-10">
        <div className="mb-2 flex justify-center">
          <FinovaLogo size="sm" />
        </div>

        <StepProgress
          currentStep={currentStep}
          completedSteps={completedSteps}
          className="mb-8"
        />

        <div className="mb-8 text-center">
          <h1 className="font-display text-[26px] font-bold text-[var(--text-primary)]">
            Let&apos;s start with the basics
          </h1>
          <p className="mt-2 font-body text-[15px] text-[var(--text-secondary)]">
            Takes about 2 minutes. No sensitive information required.
          </p>
        </div>

        {serverError && (
          <div className="mb-6 rounded-lg border border-[var(--error)]/20 bg-[var(--error)]/5 px-4 py-3">
            <p className="font-body text-[13px] text-[var(--error)]">{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            {errors.alias && <FieldError message={errors.alias.message!} />}
          </div>

          {/* Age */}
          <div>
            <label
              htmlFor="age"
              className="mb-1.5 block font-body text-sm font-medium text-[var(--text-primary)]"
            >
              Age
            </label>
            <input
              id="age"
              type="number"
              inputMode="numeric"
              placeholder="e.g. 35"
              className={inputClassName(!!errors.age)}
              {...register("age", { valueAsNumber: true })}
            />
            {errors.age && <FieldError message={errors.age.message!} />}
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

          {/* Employment Type */}
          <div>
            <label className="mb-2 block font-body text-sm font-medium text-[var(--text-primary)]">
              Employment Type
            </label>
            <Controller
              name="employmentType"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-3">
                  {EMPLOYMENT_OPTIONS.map((option) => {
                    const isSelected = field.value === option.value;
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => field.onChange(option.value)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border px-4 py-3.5 text-left transition-all",
                          isSelected
                            ? "border-[var(--emerald)] bg-[var(--emerald-soft)]/30"
                            : "border-[var(--warm-200)] bg-white hover:border-[var(--warm-200)] hover:bg-[var(--warm-100)]",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-5 shrink-0",
                            isSelected
                              ? "text-[var(--emerald)]"
                              : "text-[var(--text-muted)]",
                          )}
                        />
                        <span
                          className={cn(
                            "font-body text-[14px] font-medium",
                            isSelected
                              ? "text-[var(--text-primary)]"
                              : "text-[var(--text-secondary)]",
                          )}
                        >
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            />
            {errors.employmentType && (
              <FieldError message={errors.employmentType.message!} />
            )}
          </div>

          {/* Family Structure */}
          <div>
            <label className="mb-2 block font-body text-sm font-medium text-[var(--text-primary)]">
              Family Structure
            </label>
            <Controller
              name="familyStructure"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {FAMILY_OPTIONS.map((option) => {
                    const isSelected = field.value === option.value;
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => field.onChange(option.value)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border px-4 py-3.5 text-left transition-all",
                          isSelected
                            ? "border-[var(--emerald)] bg-[var(--emerald-soft)]/30"
                            : "border-[var(--warm-200)] bg-white hover:border-[var(--warm-200)] hover:bg-[var(--warm-100)]",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-5 shrink-0",
                            isSelected
                              ? "text-[var(--emerald)]"
                              : "text-[var(--text-muted)]",
                          )}
                        />
                        <span
                          className={cn(
                            "font-body text-[14px] font-medium",
                            isSelected
                              ? "text-[var(--text-primary)]"
                              : "text-[var(--text-secondary)]",
                          )}
                        >
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            />
            {errors.familyStructure && (
              <FieldError message={errors.familyStructure.message!} />
            )}
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
              "Continue"
            )}
          </button>
        </form>
      </div>
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
