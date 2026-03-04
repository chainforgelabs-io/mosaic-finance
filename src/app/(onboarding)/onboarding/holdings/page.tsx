"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Upload,
  ChevronDown,
  ChevronUp,
  Loader2,
  Briefcase,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StepProgress } from "@/components/app/StepProgress";
import { FinovaLogo } from "@/components/app/FinovaLogo";
import { EmptyState } from "@/components/app/EmptyState";
import { useOnboardingStore } from "@/stores/onboarding";
import { saveHoldings } from "@/lib/actions/holdings";
import {
  ACCOUNT_TYPES,
  type AccountType,
  type HoldingFormData,
} from "@/lib/schemas/holdings";

interface HoldingRow extends HoldingFormData {
  localId: string;
}

interface SavedAccount {
  id: string;
  accountType: AccountType;
  holdings: HoldingRow[];
  collapsed: boolean;
}

function AccountTypePill({
  type,
  selected,
  onClick,
}: {
  type: AccountType;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 font-body text-[13px] font-medium transition-all",
        selected
          ? "border-[var(--emerald)] bg-[var(--emerald-soft)]/30 text-[var(--emerald-dark)]"
          : "border-[var(--warm-200)] bg-white text-[var(--text-secondary)] hover:bg-[var(--warm-100)]",
      )}
    >
      {type}
    </button>
  );
}

function HoldingsTable({
  holdings,
  onUpdate,
  onRemove,
  onAdd,
}: {
  holdings: HoldingRow[];
  onUpdate: (localId: string, field: keyof HoldingFormData, value: string | number) => void;
  onRemove: (localId: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="mt-4">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--warm-200)]">
              <th className="pb-2 pr-3 text-left font-body text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Ticker / Fund Name
              </th>
              <th className="pb-2 pr-3 text-left font-body text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Balance ($)
              </th>
              <th className="pb-2 pr-3 text-left font-body text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Units
              </th>
              <th className="w-10 pb-2" />
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => (
              <tr
                key={h.localId}
                className="border-b border-[var(--warm-200)]/50"
              >
                <td className="py-2 pr-3">
                  <input
                    type="text"
                    value={h.tickerOrName}
                    onChange={(e) =>
                      onUpdate(h.localId, "tickerOrName", e.target.value)
                    }
                    placeholder="e.g. XEQT"
                    className="w-full rounded-lg border border-[var(--warm-200)] bg-white px-3 py-2 font-body text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)] focus:ring-2 focus:ring-[var(--emerald)]/20"
                  />
                </td>
                <td className="py-2 pr-3">
                  <input
                    type="number"
                    value={h.balance || ""}
                    onChange={(e) =>
                      onUpdate(
                        h.localId,
                        "balance",
                        e.target.value ? parseFloat(e.target.value) : 0,
                      )
                    }
                    placeholder="0.00"
                    className="w-full rounded-lg border border-[var(--warm-200)] bg-white px-3 py-2 font-body text-[14px] tabular-nums text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)] focus:ring-2 focus:ring-[var(--emerald)]/20"
                  />
                </td>
                <td className="py-2 pr-3">
                  <input
                    type="number"
                    value={h.units ?? ""}
                    onChange={(e) =>
                      onUpdate(
                        h.localId,
                        "units",
                        e.target.value ? parseFloat(e.target.value) : 0,
                      )
                    }
                    placeholder="Optional"
                    className="w-full rounded-lg border border-[var(--warm-200)] bg-white px-3 py-2 font-body text-[14px] tabular-nums text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)] focus:ring-2 focus:ring-[var(--emerald)]/20"
                  />
                </td>
                <td className="py-2">
                  <button
                    type="button"
                    onClick={() => onRemove(h.localId)}
                    className="flex size-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--error)]/10 hover:text-[var(--error)]"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="mt-3 flex items-center gap-1.5 font-body text-[13px] font-medium text-[var(--emerald)] transition-colors hover:text-[var(--emerald-dark)]"
      >
        <Plus className="size-4" />
        Add Holding
      </button>
    </div>
  );
}

function AccountCard({
  account,
  onToggle,
  onRemove,
}: {
  account: SavedAccount;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const total = account.holdings.reduce((sum, h) => sum + h.balance, 0);

  return (
    <div className="rounded-lg border border-[var(--warm-200)] bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-[var(--emerald)] bg-[var(--emerald-soft)]/30 px-3 py-1 font-body text-[12px] font-semibold text-[var(--emerald-dark)]">
            {account.accountType}
          </span>
          <span className="font-body text-[14px] text-[var(--text-secondary)]">
            {account.holdings.length} holding
            {account.holdings.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-body text-[16px] font-semibold tabular-nums text-[var(--text-primary)]">
            ${total.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
          </span>
          {account.collapsed ? (
            <ChevronDown className="size-4 text-[var(--text-muted)]" />
          ) : (
            <ChevronUp className="size-4 text-[var(--text-muted)]" />
          )}
        </div>
      </button>

      {!account.collapsed && (
        <div className="border-t border-[var(--warm-200)] px-5 py-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--warm-200)]/50">
                <th className="pb-2 text-left font-body text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Holding
                </th>
                <th className="pb-2 text-right font-body text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Balance
                </th>
                <th className="pb-2 text-right font-body text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Units
                </th>
              </tr>
            </thead>
            <tbody>
              {account.holdings.map((h) => (
                <tr
                  key={h.localId}
                  className="border-b border-[var(--warm-200)]/30"
                >
                  <td className="py-2 font-body text-[14px] text-[var(--text-primary)]">
                    {h.tickerOrName}
                  </td>
                  <td className="py-2 text-right font-body text-[14px] tabular-nums text-[var(--text-primary)]">
                    ${h.balance.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 text-right font-body text-[14px] tabular-nums text-[var(--text-muted)]">
                    {h.units ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onRemove}
              className="flex items-center gap-1.5 font-body text-[13px] font-medium text-[var(--error)] transition-colors hover:text-[var(--error)]/80"
            >
              <Trash2 className="size-3.5" />
              Remove Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function UploadDropZone({
  onParsed,
}: {
  onParsed: (
    holdings: { tickerOrName: string; balance: number; units?: number }[],
  ) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedHoldings, setParsedHoldings] = useState<
    { tickerOrName: string; balance: number; units?: number }[] | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setIsParsing(true);
      setParseError(null);
      setParsedHoldings(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload/statement", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Upload failed");
        }

        if (!data.holdings || data.holdings.length === 0) {
          setParseError(
            "No holdings found in this document. Try a different file or enter manually.",
          );
        } else {
          setParsedHoldings(data.holdings);
        }
      } catch (err) {
        setParseError(
          err instanceof Error ? err.message : "Failed to parse statement",
        );
      } finally {
        setIsParsing(false);
      }
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleConfirm = () => {
    if (parsedHoldings) {
      onParsed(parsedHoldings);
      setParsedHoldings(null);
    }
  };

  if (isParsing) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--warm-200)] bg-white p-8">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="size-8 animate-spin text-[var(--emerald)]" />
            <p className="font-body text-[15px] text-[var(--text-secondary)]">
              Analyzing your statement...
            </p>
          </div>
          <div className="mt-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div
                  className="h-5 flex-1 rounded bg-[var(--warm-200)]"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, var(--warm-200) 0%, var(--warm-100) 50%, var(--warm-200) 100%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 1.5s infinite",
                  }}
                />
                <div
                  className="h-5 w-24 rounded bg-[var(--warm-200)]"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, var(--warm-200) 0%, var(--warm-100) 50%, var(--warm-200) 100%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 1.5s infinite",
                    animationDelay: "300ms",
                  }}
                />
                <div
                  className="h-5 w-16 rounded bg-[var(--warm-200)]"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, var(--warm-200) 0%, var(--warm-100) 50%, var(--warm-200) 100%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 1.5s infinite",
                    animationDelay: "600ms",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (parsedHoldings) {
    const total = parsedHoldings.reduce((s, h) => s + h.balance, 0);
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--emerald)]/30 bg-white p-6">
          <h3 className="mb-4 font-display text-[16px] font-semibold text-[var(--text-primary)]">
            We found {parsedHoldings.length} holding
            {parsedHoldings.length !== 1 ? "s" : ""}
          </h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--warm-200)]">
                <th className="pb-2 text-left font-body text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Holding
                </th>
                <th className="pb-2 text-right font-body text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Balance
                </th>
                <th className="pb-2 text-right font-body text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Units
                </th>
              </tr>
            </thead>
            <tbody>
              {parsedHoldings.map((h, i) => (
                <tr
                  key={i}
                  className="border-b border-[var(--warm-200)]/30"
                >
                  <td className="py-2 font-body text-[14px] text-[var(--text-primary)]">
                    {h.tickerOrName}
                  </td>
                  <td className="py-2 text-right font-body text-[14px] tabular-nums text-[var(--text-primary)]">
                    ${h.balance.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 text-right font-body text-[14px] tabular-nums text-[var(--text-muted)]">
                    {h.units ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-[var(--warm-200)]">
                <td className="pt-3 font-body text-[14px] font-semibold text-[var(--text-primary)]">
                  Total
                </td>
                <td className="pt-3 text-right font-body text-[16px] font-semibold tabular-nums text-[var(--emerald)]">
                  ${total.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 rounded-lg bg-[var(--emerald)] px-5 py-2.5 font-display text-[14px] font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)]"
            >
              Add These Holdings
            </button>
            <button
              type="button"
              onClick={() => setParsedHoldings(null)}
              className="flex-1 rounded-lg border border-[var(--warm-200)] bg-white px-5 py-2.5 font-display text-[14px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--warm-100)]"
            >
              Try Another File
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-all",
          isDragging
            ? "border-[var(--emerald)] bg-[var(--emerald-soft)]/10"
            : "border-[var(--emerald)]/40 bg-white hover:border-[var(--emerald)]/60 hover:bg-[var(--warm-100)]",
        )}
      >
        <Upload
          className={cn(
            "mx-auto mb-4 size-10",
            isDragging ? "text-[var(--emerald)]" : "text-[var(--text-muted)]",
          )}
        />
        <h3 className="font-display text-[18px] font-medium text-[var(--text-primary)]">
          Upload a blacked-out statement
        </h3>
        <p className="mt-2 font-body text-[14px] text-[var(--text-secondary)]">
          Remove your name and account numbers first. PDF or image accepted.
        </p>
        <p className="mt-1 font-body text-[12px] text-[var(--text-muted)]">
          AI will extract your holdings automatically.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {parseError && (
        <div className="rounded-lg border border-[var(--error)]/20 bg-[var(--error)]/5 px-4 py-3">
          <p className="font-body text-[13px] text-[var(--error)]">
            {parseError}
          </p>
        </div>
      )}
    </div>
  );
}

function ManualEntryForm({
  onSaveAccount,
}: {
  onSaveAccount: (account: SavedAccount) => void;
}) {
  const [selectedType, setSelectedType] = useState<AccountType | null>(null);
  const [holdings, setHoldings] = useState<HoldingRow[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const addHolding = () => {
    setHoldings((prev) => [
      ...prev,
      {
        localId: `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tickerOrName: "",
        balance: 0,
        units: undefined,
      },
    ]);
  };

  const updateHolding = (
    localId: string,
    field: keyof HoldingFormData,
    value: string | number,
  ) => {
    setHoldings((prev) =>
      prev.map((h) => (h.localId === localId ? { ...h, [field]: value } : h)),
    );
  };

  const removeHolding = (localId: string) => {
    setHoldings((prev) => prev.filter((h) => h.localId !== localId));
  };

  const handleSave = () => {
    setFormError(null);

    if (!selectedType) {
      setFormError("Please select an account type.");
      return;
    }

    const validHoldings = holdings.filter((h) => h.tickerOrName.trim());
    if (validHoldings.length === 0) {
      setFormError("Add at least one holding with a name.");
      return;
    }

    onSaveAccount({
      id: `acc-${Date.now()}`,
      accountType: selectedType,
      holdings: validHoldings,
      collapsed: true,
    });

    setSelectedType(null);
    setHoldings([]);
  };

  const total = holdings.reduce((sum, h) => sum + (h.balance || 0), 0);

  return (
    <div className="rounded-lg border border-[var(--warm-200)] bg-white p-6">
      <h3 className="mb-4 font-display text-[16px] font-semibold text-[var(--text-primary)]">
        New Account
      </h3>

      <div className="mb-4">
        <label className="mb-2 block font-body text-[13px] font-medium text-[var(--text-secondary)]">
          Account Type
        </label>
        <div className="flex flex-wrap gap-2">
          {ACCOUNT_TYPES.map((type) => (
            <AccountTypePill
              key={type}
              type={type}
              selected={selectedType === type}
              onClick={() => setSelectedType(type)}
            />
          ))}
        </div>
      </div>

      {holdings.length > 0 && (
        <HoldingsTable
          holdings={holdings}
          onUpdate={updateHolding}
          onRemove={removeHolding}
          onAdd={addHolding}
        />
      )}

      {holdings.length === 0 && (
        <button
          type="button"
          onClick={addHolding}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--warm-200)] bg-[var(--warm-50)] px-4 py-4 font-body text-[14px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--emerald)] hover:text-[var(--emerald)]"
        >
          <Plus className="size-4" />
          Add First Holding
        </button>
      )}

      {holdings.length > 0 && (
        <div className="mt-4 flex items-center justify-between border-t border-[var(--warm-200)] pt-4">
          <span className="font-body text-[14px] text-[var(--text-secondary)]">
            Account Total
          </span>
          <span className="font-body text-[18px] font-semibold tabular-nums text-[var(--emerald)]">
            ${total.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {formError && (
        <div className="mt-3 rounded-lg border border-[var(--error)]/20 bg-[var(--error)]/5 px-4 py-2">
          <p className="font-body text-[13px] text-[var(--error)]">
            {formError}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={!selectedType || holdings.length === 0}
        className="mt-4 w-full rounded-lg bg-[var(--slate-950)] px-5 py-2.5 font-display text-[14px] font-semibold text-white transition-colors hover:bg-[var(--slate-950)]/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Save Account
      </button>
    </div>
  );
}

export default function HoldingsPage() {
  const { currentStep, completedSteps, setCurrentStep, completeStep } =
    useOnboardingStore();
  const [activeTab, setActiveTab] = useState<"manual" | "upload">("manual");
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentStep("holdings");
  }, [setCurrentStep]);

  const handleSaveAccount = (account: SavedAccount) => {
    setAccounts((prev) => [...prev, account]);
    setIsAddingAccount(false);
  };

  const handleToggleAccount = (id: string) => {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, collapsed: !a.collapsed } : a,
      ),
    );
  };

  const handleRemoveAccount = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUploadParsed = (
    holdings: { tickerOrName: string; balance: number; units?: number }[],
  ) => {
    const newAccount: SavedAccount = {
      id: `acc-upload-${Date.now()}`,
      accountType: "TFSA",
      holdings: holdings.map((h, i) => ({
        ...h,
        localId: `upload-${Date.now()}-${i}`,
        balance: h.balance,
        units: h.units,
      })),
      collapsed: false,
    };
    setAccounts((prev) => [...prev, newAccount]);
    setActiveTab("manual");
  };

  const runningTotal = accounts.reduce(
    (sum, a) => sum + a.holdings.reduce((s, h) => s + h.balance, 0),
    0,
  );

  const handleContinue = async () => {
    if (accounts.length === 0) return;

    setIsSubmitting(true);
    setServerError(null);

    const formData = {
      accounts: accounts.map((a) => ({
        id: a.id,
        accountType: a.accountType,
        holdings: a.holdings.map((h) => ({
          tickerOrName: h.tickerOrName,
          balance: h.balance,
          units: h.units,
        })),
      })),
    };

    const result = await saveHoldings(formData);
    if (result?.error) {
      setServerError(result.error);
      setIsSubmitting(false);
    } else {
      completeStep("holdings");
    }
  };

  return (
    <div className="flex flex-1 items-start justify-center px-4 py-12">
      <div className="w-full max-w-[800px]">
        <div className="mb-2 flex justify-center">
          <FinovaLogo size="sm" />
        </div>

        <StepProgress
          currentStep={currentStep}
          completedSteps={completedSteps}
          className="mb-8"
        />

        <div className="mb-8">
          <div className="flex border-b border-[var(--warm-200)]">
            <button
              type="button"
              onClick={() => setActiveTab("manual")}
              className={cn(
                "flex items-center gap-2 border-b-2 px-5 py-3 font-display text-[14px] font-medium transition-colors",
                activeTab === "manual"
                  ? "border-[var(--emerald)] text-[var(--emerald)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              )}
            >
              <FileText className="size-4" />
              Enter Manually
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={cn(
                "flex items-center gap-2 border-b-2 px-5 py-3 font-display text-[14px] font-medium transition-colors",
                activeTab === "upload"
                  ? "border-[var(--emerald)] text-[var(--emerald)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              )}
            >
              <Upload className="size-4" />
              Upload Statement
            </button>
          </div>
        </div>

        {activeTab === "manual" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="font-display text-[24px] font-semibold text-[var(--text-primary)]">
                Add your investment accounts
              </h1>
            </div>

            {accounts.length === 0 && !isAddingAccount && (
              <EmptyState
                icon={Briefcase}
                title="Add your first investment account to get started."
                description="Enter your holdings manually or upload a statement."
                ctaLabel="Add Account"
                onAction={() => setIsAddingAccount(true)}
              />
            )}

            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onToggle={() => handleToggleAccount(account.id)}
                onRemove={() => handleRemoveAccount(account.id)}
              />
            ))}

            {isAddingAccount && (
              <ManualEntryForm onSaveAccount={handleSaveAccount} />
            )}

            {accounts.length > 0 && !isAddingAccount && (
              <button
                type="button"
                onClick={() => setIsAddingAccount(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--warm-200)] bg-white px-4 py-4 font-body text-[14px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--emerald)] hover:text-[var(--emerald)]"
              >
                <Plus className="size-4" />
                Add Another Account
              </button>
            )}
          </div>
        )}

        {activeTab === "upload" && (
          <div className="space-y-4">
            <UploadDropZone onParsed={handleUploadParsed} />
          </div>
        )}

        {serverError && (
          <div className="mt-4 rounded-lg border border-[var(--error)]/20 bg-[var(--error)]/5 px-4 py-3">
            <p className="font-body text-[13px] text-[var(--error)]">
              {serverError}
            </p>
          </div>
        )}

        {accounts.length > 0 && (
          <div className="fixed inset-x-0 bottom-0 z-10 border-t border-[var(--warm-200)] bg-white">
            <div className="mx-auto flex max-w-[800px] items-center justify-between px-6 py-4">
              <div>
                <span className="font-body text-[13px] text-[var(--text-muted)]">
                  Total Portfolio
                </span>
                <p className="font-body text-[22px] font-semibold tabular-nums text-[var(--text-primary)]">
                  $
                  {runningTotal.toLocaleString("en-CA", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={handleContinue}
                disabled={isSubmitting}
                className="flex items-center justify-center rounded-lg bg-[var(--emerald)] px-8 py-3 font-display text-[15px] font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  "Continue to Risk Profile"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
