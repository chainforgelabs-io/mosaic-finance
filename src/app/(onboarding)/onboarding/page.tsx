"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  GraduationCap,
  Loader2,
  Palmtree,
  UserRound,
  Heart,
  HeartHandshake,
  Baby,
  Home,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StepProgress } from "@/components/app/StepProgress";
import { FinovaLogo } from "@/components/app/FinovaLogo";
import { useOnboardingStore } from "@/stores/onboarding";
import {
  saveFinancialProfile,
  getOnboardingProgress,
  getUserProfileData,
} from "@/lib/actions/onboarding";
import {
  financialProfileSchema,
  EMPLOYMENT_TYPES,
  FAMILY_STRUCTURES,
  SEX_OPTIONS,
  RELATIONSHIP_TYPES,
  type FinancialProfileFormData,
} from "@/lib/schemas/onboarding";
import type { LucideIcon } from "lucide-react";

const EMPLOYMENT_DB_TO_FORM: Record<string, string> = {
  employed: "Employed",
  "self-employed": "Self-Employed",
  retired: "Retired",
  student: "Student",
};

const FAMILY_DB_TO_FORM: Record<string, string> = {
  single: "Single",
  married: "Married",
  "common-law": "Common-Law",
  "single-parent": "Single Parent",
  family: "Family",
};

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

const SEX_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  "prefer-not-to-say": "Prefer not to say",
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  spouse: "Spouse / Partner",
  child: "Child",
  parent: "Parent",
  sibling: "Sibling",
  other: "Other",
};

export default function OnboardingProfilePage() {
  const router = useRouter();
  const { currentStep, completedSteps, setCurrentStep, completeStep } =
    useOnboardingStore();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showHousehold, setShowHousehold] = useState(false);
  const [checkingProgress, setCheckingProgress] = useState(true);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FinancialProfileFormData>({
    resolver: zodResolver(financialProfileSchema),
    defaultValues: {
      age: undefined,
      sex: undefined,
      annualIncome: undefined,
      employmentType: undefined,
      occupation: undefined,
      familyStructure: undefined,
      householdMembers: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "householdMembers",
  });

  const familyStructure = watch("familyStructure");

  useEffect(() => {
    setCurrentStep("profile");

    async function checkAndResume() {
      try {
        const [progress, profile] = await Promise.all([
          getOnboardingProgress(),
          getUserProfileData(),
        ]);

        if (progress.profileComplete && progress.redirectPath !== "/onboarding") {
          completeStep("profile");
          if (progress.factFindComplete) completeStep("fact-find");
          if (progress.riskProfileComplete) completeStep("risk-profile");
          if (progress.holdingsExist) completeStep("holdings");
          router.replace(progress.redirectPath);
          return;
        }

        if (profile) {
          const employment = profile.employment_type
            ? EMPLOYMENT_DB_TO_FORM[profile.employment_type] ?? undefined
            : undefined;
          const family = profile.family_structure
            ? FAMILY_DB_TO_FORM[profile.family_structure] ?? undefined
            : undefined;

          reset({
            age: profile.age ?? undefined,
            sex: (profile.sex as FinancialProfileFormData["sex"]) ?? undefined,
            annualIncome: profile.annual_income ?? undefined,
            employmentType: employment as FinancialProfileFormData["employmentType"],
            occupation: profile.occupation ?? undefined,
            familyStructure: family as FinancialProfileFormData["familyStructure"],
            householdMembers: [],
          });
        }
      } catch {
        // If progress check fails, just show the profile form
      } finally {
        setCheckingProgress(false);
      }
    }

    checkAndResume();
  }, [setCurrentStep, completeStep, router, reset]);

  useEffect(() => {
    if (familyStructure && familyStructure !== "Single" && fields.length === 0) {
      setShowHousehold(true);
    }
  }, [familyStructure, fields.length]);

  async function onSubmit(data: FinancialProfileFormData) {
    setServerError(null);
    const result = await saveFinancialProfile(data);
    if (result?.error) {
      setServerError(result.error);
    }
  }

  if (checkingProgress) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <Loader2 className="size-8 animate-spin text-[var(--emerald)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-[720px]">
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
              Tell us about yourself
            </h1>
            <p className="mt-2 font-body text-[15px] text-[var(--text-secondary)]">
              This helps us personalize your financial plan. No real names are stored.
            </p>
          </div>

          {serverError && (
            <div className="mb-6 rounded-lg border border-[var(--error)]/20 bg-[var(--error)]/5 px-4 py-3">
              <p className="font-body text-[13px] text-[var(--error)]">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Age + Sex row */}
            <div className="grid grid-cols-2 gap-4">
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

              <div>
                <label className="mb-1.5 block font-body text-sm font-medium text-[var(--text-primary)]">
                  Sex
                </label>
                <Controller
                  name="sex"
                  control={control}
                  render={({ field }) => (
                    <select
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || undefined)}
                      className={inputClassName(false)}
                    >
                      <option value="">Select...</option>
                      {SEX_OPTIONS.map((s) => (
                        <option key={s} value={s}>{SEX_LABELS[s]}</option>
                      ))}
                    </select>
                  )}
                />
              </div>
            </div>

            {/* Annual Income */}
            <div>
              <label
                htmlFor="annualIncome"
                className="mb-1.5 block font-body text-sm font-medium text-[var(--text-primary)]"
              >
                Annual Gross Income (approx.)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-body text-[15px] text-[var(--text-muted)]">$</span>
                <input
                  id="annualIncome"
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 75000"
                  className={inputClassName(false, "pl-8")}
                  {...register("annualIncome", { valueAsNumber: true })}
                />
              </div>
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
                              isSelected ? "text-[var(--emerald)]" : "text-[var(--text-muted)]",
                            )}
                          />
                          <span
                            className={cn(
                              "font-body text-[14px] font-medium",
                              isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]",
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
              {errors.employmentType && <FieldError message={errors.employmentType.message!} />}
            </div>

            {/* Occupation */}
            <div>
              <label
                htmlFor="occupation"
                className="mb-1.5 block font-body text-sm font-medium text-[var(--text-primary)]"
              >
                Occupation (optional)
              </label>
              <input
                id="occupation"
                type="text"
                placeholder="e.g. Software Engineer, Teacher"
                className={inputClassName(false)}
                {...register("occupation")}
              />
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
                              isSelected ? "text-[var(--emerald)]" : "text-[var(--text-muted)]",
                            )}
                          />
                          <span
                            className={cn(
                              "font-body text-[14px] font-medium",
                              isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]",
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
              {errors.familyStructure && <FieldError message={errors.familyStructure.message!} />}
            </div>

            {/* Household Members */}
            {familyStructure && familyStructure !== "Single" && (
              <div className="rounded-lg border border-[var(--warm-200)] bg-[var(--warm-50)] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="size-5 text-[var(--emerald)]" />
                    <h3 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">
                      Household Members
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowHousehold(!showHousehold)}
                    className="font-body text-[13px] font-medium text-[var(--emerald)] hover:underline"
                  >
                    {showHousehold ? "Hide" : "Show"}
                  </button>
                </div>

                {showHousehold && (
                  <>
                    <p className="mb-4 font-body text-[13px] text-[var(--text-secondary)]">
                      Add family members to help us build a complete household financial picture.
                      No real names are stored — only relationship, age, and basic financial info.
                    </p>

                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="mb-4 rounded-lg border border-[var(--warm-200)] bg-white p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="font-body text-[13px] font-semibold text-[var(--text-primary)]">
                            Member {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="text-[var(--text-muted)] hover:text-[var(--error)]"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block font-body text-[12px] font-medium text-[var(--text-secondary)]">
                              Relationship
                            </label>
                            <select
                              className={inputClassName(false, "text-[13px]")}
                              {...register(`householdMembers.${index}.relationship`)}
                            >
                              {RELATIONSHIP_TYPES.map((r) => (
                                <option key={r} value={r}>{RELATIONSHIP_LABELS[r]}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block font-body text-[12px] font-medium text-[var(--text-secondary)]">
                              Age
                            </label>
                            <input
                              type="number"
                              placeholder="Age"
                              className={inputClassName(false, "text-[13px]")}
                              {...register(`householdMembers.${index}.age`, { valueAsNumber: true })}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block font-body text-[12px] font-medium text-[var(--text-secondary)]">
                              Sex
                            </label>
                            <select
                              className={inputClassName(false, "text-[13px]")}
                              {...register(`householdMembers.${index}.sex`)}
                            >
                              <option value="">Select...</option>
                              {SEX_OPTIONS.map((s) => (
                                <option key={s} value={s}>{SEX_LABELS[s]}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block font-body text-[12px] font-medium text-[var(--text-secondary)]">
                              Occupation
                            </label>
                            <input
                              type="text"
                              placeholder="Optional"
                              className={inputClassName(false, "text-[13px]")}
                              {...register(`householdMembers.${index}.occupation`)}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block font-body text-[12px] font-medium text-[var(--text-secondary)]">
                              Annual Income
                            </label>
                            <input
                              type="number"
                              placeholder="$0"
                              className={inputClassName(false, "text-[13px]")}
                              {...register(`householdMembers.${index}.annualIncome`, { valueAsNumber: true })}
                            />
                          </div>
                          <div className="flex items-end pb-1">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                className="size-4 rounded border-[var(--warm-200)] text-[var(--emerald)] focus:ring-[var(--emerald)]"
                                {...register(`householdMembers.${index}.isDependant`)}
                              />
                              <span className="font-body text-[13px] text-[var(--text-secondary)]">
                                Dependant
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() =>
                        append({
                          relationship: familyStructure === "Married" || familyStructure === "Common-Law"
                            ? (fields.length === 0 ? "spouse" : "child")
                            : "child",
                          age: undefined,
                          sex: undefined,
                          occupation: "",
                          annualIncome: undefined,
                          isDependant: false,
                          notes: "",
                        })
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--warm-200)] bg-white px-4 py-3 font-body text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--emerald)] hover:text-[var(--emerald)]"
                    >
                      <Plus className="size-4" />
                      Add Household Member
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center rounded-lg bg-[var(--emerald)] px-6 py-3 font-display text-[15px] font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                "Continue to Consultation"
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
