"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Upload,
  ChevronDown,
  ChevronUp,
  Loader2,
  Briefcase,
  FileText,
  AlertTriangle,
  Info,
  ArrowLeft,
  ArrowRight,
  Pencil,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StepProgress } from "@/components/app/StepProgress";
import { FinovaLogo } from "@/components/app/FinovaLogo";
import { EmptyState } from "@/components/app/EmptyState";
import { useOnboardingStore, type FactFindAccount } from "@/stores/onboarding";
import { saveHoldings } from "@/lib/actions/holdings";
import { getFactFindAccounts } from "@/lib/actions/onboarding";
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
  accountName?: string;
  owner?: string;
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
                    value={h.tickerOrName ?? ""}
                    onChange={(e) =>
                      onUpdate(h.localId, "tickerOrName", e.target.value)
                    }
                    placeholder="e.g. XEQT (optional)"
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
  onUpdate,
}: {
  account: SavedAccount;
  onToggle: () => void;
  onRemove: () => void;
  onUpdate: (updated: SavedAccount) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editType, setEditType] = useState<AccountType>(account.accountType);
  const [editName, setEditName] = useState(account.accountName ?? "");
  const [editOwner, setEditOwner] = useState(account.owner ?? "");
  const [editHoldings, setEditHoldings] = useState<HoldingRow[]>(account.holdings);

  const total = (isEditing ? editHoldings : account.holdings).reduce(
    (sum, h) => sum + h.balance,
    0,
  );

  const startEditing = () => {
    setEditType(account.accountType);
    setEditName(account.accountName ?? "");
    setEditOwner(account.owner ?? "");
    setEditHoldings(account.holdings.map((h) => ({ ...h })));
    setIsEditing(true);
  };

  const saveEdits = () => {
    const validHoldings = editHoldings.filter((h) => h.balance > 0);
    if (validHoldings.length === 0) return;
    onUpdate({
      ...account,
      accountType: editType,
      accountName: editName || undefined,
      owner: editOwner || undefined,
      holdings: validHoldings,
    });
    setIsEditing(false);
  };

  const cancelEditing = () => setIsEditing(false);

  const updateHolding = (localId: string, field: keyof HoldingFormData, value: string | number) => {
    setEditHoldings((prev) =>
      prev.map((h) => (h.localId === localId ? { ...h, [field]: value } : h)),
    );
  };

  const removeHolding = (localId: string) => {
    setEditHoldings((prev) => prev.filter((h) => h.localId !== localId));
  };

  const addHolding = () => {
    setEditHoldings((prev) => [
      ...prev,
      {
        localId: `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tickerOrName: "",
        balance: 0,
        units: undefined,
      },
    ]);
  };

  return (
    <div className="rounded-lg border border-[var(--warm-200)] bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-[var(--emerald)] bg-[var(--emerald-soft)]/30 px-3 py-1 font-body text-[12px] font-semibold text-[var(--emerald-dark)]">
            {isEditing ? editType : account.accountType}
          </span>
          <span className="font-body text-[14px] text-[var(--text-secondary)]">
            {(isEditing ? editName : account.accountName) ||
              `${account.holdings.length} holding${account.holdings.length !== 1 ? "s" : ""}`}
          </span>
          {account.owner && !isEditing && (
            <span className="rounded bg-[var(--warm-100)] px-2 py-0.5 font-body text-[11px] text-[var(--text-muted)]">
              {account.owner}
            </span>
          )}
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

      {!account.collapsed && !isEditing && (
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
                    {h.tickerOrName || "—"}
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
          <div className="mt-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                startEditing();
              }}
              className="flex items-center gap-1.5 font-body text-[13px] font-medium text-[var(--emerald)] transition-colors hover:text-[var(--emerald-dark)]"
            >
              <Pencil className="size-3.5" />
              Edit
            </button>
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

      {!account.collapsed && isEditing && (
        <div className="border-t border-[var(--warm-200)] px-5 py-4 space-y-4">
          <div>
            <label className="mb-2 block font-body text-[13px] font-medium text-[var(--text-secondary)]">
              Account Type
            </label>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_TYPES.map((type) => (
                <AccountTypePill
                  key={type}
                  type={type}
                  selected={editType === type}
                  onClick={() => setEditType(type)}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block font-body text-[13px] font-medium text-[var(--text-secondary)]">
                Account Name (optional)
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Wealthsimple TFSA"
                className="w-full rounded-lg border border-[var(--warm-200)] bg-white px-3 py-2 font-body text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)] focus:ring-2 focus:ring-[var(--emerald)]/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block font-body text-[13px] font-medium text-[var(--text-secondary)]">
                Account Owner (optional)
              </label>
              <input
                type="text"
                value={editOwner}
                onChange={(e) => setEditOwner(e.target.value)}
                placeholder="e.g. Spouse, Joint"
                className="w-full rounded-lg border border-[var(--warm-200)] bg-white px-3 py-2 font-body text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)] focus:ring-2 focus:ring-[var(--emerald)]/20"
              />
            </div>
          </div>

          <HoldingsTable
            holdings={editHoldings}
            onUpdate={updateHolding}
            onRemove={removeHolding}
            onAdd={addHolding}
          />

          <div className="flex items-center justify-between border-t border-[var(--warm-200)] pt-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveEdits}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--emerald)] px-4 py-2 font-display text-[13px] font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)]"
              >
                <Check className="size-3.5" />
                Save Changes
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                className="rounded-lg border border-[var(--warm-200)] px-4 py-2 font-display text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--warm-100)]"
              >
                Cancel
              </button>
            </div>
            <button
              type="button"
              onClick={onRemove}
              className="flex items-center gap-1.5 font-body text-[13px] font-medium text-[var(--error)] transition-colors hover:text-[var(--error)]/80"
            >
              <Trash2 className="size-3.5" />
              Remove
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
  onParsed: (accounts: SavedAccount[]) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [uploadNote, setUploadNote] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setIsParsing(true);
      setParseError(null);

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

        const parsed = data.parsedHoldings ?? data;
        const rawAccounts = parsed.accounts ?? [];

        if (rawAccounts.length === 0) {
          setParseError(
            "No holdings found in this document. Try a different file or enter manually.",
          );
          return;
        }

        const DB_TO_DISPLAY: Record<string, AccountType> = {
          "non-registered": "Non-Reg",
          "pension": "Pension",
          "RRSP": "RRSP",
          "TFSA": "TFSA",
          "FHSA": "FHSA",
          "LIRA": "LIRA",
          "RESP": "RESP",
        };

        const newAccounts: SavedAccount[] = rawAccounts.map(
          (acc: { account_type: string; holdings?: { ticker?: string; name?: string; balance?: number; units?: number }[]; total_value?: number }, i: number) => ({
            id: `acc-upload-${Date.now()}-${i}`,
            accountType: DB_TO_DISPLAY[acc.account_type] ?? "Non-Reg",
            accountName: uploadNote || undefined,
            holdings: (acc.holdings ?? []).map(
              (h: { ticker?: string; name?: string; balance?: number; units?: number }, j: number) => ({
                localId: `upload-${Date.now()}-${i}-${j}`,
                tickerOrName: h.ticker || h.name || "",
                balance: h.balance ?? 0,
                units: h.units,
              }),
            ),
            collapsed: false,
          }),
        );

        onParsed(newAccounts);
        setUploadNote("");
      } catch (err) {
        setParseError(
          err instanceof Error ? err.message : "Failed to parse statement",
        );
      } finally {
        setIsParsing(false);
      }
    },
    [onParsed, uploadNote],
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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <h3 className="font-display text-[14px] font-semibold text-[var(--text-primary)]">
              Protect your privacy
            </h3>
            <p className="mt-1 font-body text-[13px] leading-relaxed text-[var(--text-secondary)]">
              Before uploading, please <strong>black out or redact</strong> any personal information
              including names, account numbers, SIN, and addresses. Only account types and
              holdings/balances are needed. Use the note field below to identify which account
              this statement belongs to.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block font-body text-[13px] font-medium text-[var(--text-secondary)]">
          Statement Note (e.g. &quot;My TFSA at Wealthsimple&quot;)
        </label>
        <input
          type="text"
          value={uploadNote}
          onChange={(e) => setUploadNote(e.target.value)}
          placeholder="Optional — helps identify this statement"
          className="w-full rounded-lg border border-[var(--warm-200)] bg-white px-4 py-2.5 font-body text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)] focus:ring-2 focus:ring-[var(--emerald)]/20"
        />
      </div>

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
          Upload a redacted statement
        </h3>
        <p className="mt-2 font-body text-[14px] text-[var(--text-secondary)]">
          PDF or image accepted. You can upload multiple statements.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            if (e.target) e.target.value = "";
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
  const [accountName, setAccountName] = useState("");
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

    const validHoldings = holdings.filter((h) => h.balance > 0);
    if (validHoldings.length === 0) {
      setFormError("Add at least one holding with a balance.");
      return;
    }

    onSaveAccount({
      id: `acc-${Date.now()}`,
      accountType: selectedType,
      accountName: accountName || undefined,
      holdings: validHoldings,
      collapsed: true,
    });

    setSelectedType(null);
    setAccountName("");
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

      <div className="mb-4">
        <label
          htmlFor="accountName"
          className="mb-1.5 block font-body text-[13px] font-medium text-[var(--text-secondary)]"
        >
          Account Name (optional)
        </label>
        <input
          id="accountName"
          type="text"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          placeholder="e.g. Wealthsimple TFSA, Work DC Pension"
          className="w-full rounded-lg border border-[var(--warm-200)] bg-white px-3 py-2 font-body text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)] focus:ring-2 focus:ring-[var(--emerald)]/20"
        />
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

function buildPrePopulatedAccounts(factFindAccounts: FactFindAccount[]): SavedAccount[] {
  const DB_TO_DISPLAY: Record<string, AccountType> = {
    "RRSP": "RRSP",
    "TFSA": "TFSA",
    "FHSA": "FHSA",
    "non-registered": "Non-Reg",
    "pension": "Pension",
    "LIRA": "LIRA",
    "RESP": "RESP",
  };

  return factFindAccounts.map((acc, i) => ({
    id: `prefill-${i}-${Date.now()}`,
    accountType: DB_TO_DISPLAY[acc.account_type] ?? "Non-Reg",
    accountName: acc.description || undefined,
    holdings: [
      {
        localId: `prefill-h-${i}-${Date.now()}`,
        tickerOrName: "",
        balance: acc.approximate_balance ?? 0,
        units: undefined,
      },
    ],
    collapsed: false,
  }));
}

export default function HoldingsPage() {
  const router = useRouter();
  const { currentStep, completedSteps, setCurrentStep, completeStep, factFindAccounts } =
    useOnboardingStore();
  const [activeTab, setActiveTab] = useState<"manual" | "upload">("manual");
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [accountsFromConversation, setAccountsFromConversation] = useState(false);
  const hasPrePopulated = useRef(false);

  useEffect(() => {
    completeStep("profile");
    completeStep("fact-find");
    completeStep("risk-profile");
    setCurrentStep("holdings");
  }, [completeStep, setCurrentStep]);

  useEffect(() => {
    if (hasPrePopulated.current) return;

    if (factFindAccounts.length > 0) {
      hasPrePopulated.current = true;
      setAccountsFromConversation(true);
      setAccounts(buildPrePopulatedAccounts(factFindAccounts));
      return;
    }

    getFactFindAccounts().then((dbAccounts) => {
      if (hasPrePopulated.current || !dbAccounts || dbAccounts.length === 0) return;
      hasPrePopulated.current = true;
      setAccountsFromConversation(true);
      setAccounts(buildPrePopulatedAccounts(dbAccounts));
    });
  }, [factFindAccounts]);

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

  const handleUpdateAccount = (updated: SavedAccount) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a)),
    );
  };

  const handleRemoveAccount = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUploadParsed = (newAccounts: SavedAccount[]) => {
    setAccounts((prev) => [...prev, ...newAccounts]);
    setActiveTab("manual");
  };

  const runningTotal = accounts.reduce(
    (sum, a) => sum + a.holdings.reduce((s, h) => s + h.balance, 0),
    0,
  );

  const handleContinue = async () => {
    setIsSubmitting(true);
    setServerError(null);

    if (accounts.length === 0) {
      completeStep("holdings");
      router.push("/onboarding/generating");
      return;
    }

    const formData = {
      accounts: accounts.map((a) => ({
        id: a.id,
        accountType: a.accountType,
        accountName: a.accountName,
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

        <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
          <Info className="mt-0.5 size-4 shrink-0 text-blue-600" />
          <p className="font-body text-[13px] leading-relaxed text-[var(--text-secondary)]">
            For the best analysis, include exact fund names and ticker symbols where possible.
            Approximate balances are fine for now — you can refine details later in your dashboard.
          </p>
        </div>

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

            {accounts.length > 0 && accounts.some((a) => a.id.startsWith("prefill-")) && (
              <div className="flex items-start gap-3 rounded-lg border border-[var(--emerald)]/20 bg-[var(--emerald)]/5 px-4 py-3">
                <Info className="mt-0.5 size-4 shrink-0 text-[var(--emerald)]" />
                <p className="font-body text-[13px] leading-relaxed text-[var(--text-secondary)]">
                  We&apos;ve added accounts based on your conversation. Edit the details below,
                  add specific holdings, or add more accounts.
                </p>
              </div>
            )}

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
                onUpdate={handleUpdateAccount}
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

        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-[var(--warm-200)] bg-white">
          <div className="mx-auto flex max-w-[800px] items-center justify-between px-6 py-4">
            <button
              type="button"
              onClick={() => router.push("/onboarding/fact-find")}
              className="flex items-center gap-2 rounded-lg border border-[var(--warm-200)] px-5 py-2.5 font-display text-[14px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--warm-100)]"
            >
              <ArrowLeft className="size-4" />
              Back
            </button>

            <div className="flex items-center gap-4">
              {accounts.length > 0 && (
                <div className="text-right">
                  <span className="font-body text-[12px] text-[var(--text-muted)]">
                    Total Portfolio
                  </span>
                  <p className="font-body text-[18px] font-semibold tabular-nums text-[var(--text-primary)]">
                    ${runningTotal.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handleContinue}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-[var(--emerald)] px-6 py-2.5 font-display text-[14px] font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <>
                    {accounts.length === 0 ? "Skip for now" : "Continue"}
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
