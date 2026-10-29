"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { saveHoldings } from "@/lib/actions/holdings";
import {
  ACCOUNT_CATEGORIES,
  fromDbAccountType,
  type AccountType,
} from "@/lib/schemas/holdings";

interface IncomingHolding {
  tickerOrName: string;
  balance: number;
  units: number | null;
}

interface IncomingAccount {
  accountType: string;
  holdings: IncomingHolding[];
}

interface DraftHolding {
  localId: string;
  tickerOrName: string;
  balance: string;
  units: string;
}

interface DraftAccount {
  localId: string;
  accountType: AccountType;
  holdings: DraftHolding[];
}

function blankHolding(): DraftHolding {
  return { localId: crypto.randomUUID(), tickerOrName: "", balance: "", units: "" };
}

function fromIncoming(accounts: IncomingAccount[]): DraftAccount[] {
  if (accounts.length === 0) {
    return [{ localId: crypto.randomUUID(), accountType: "TFSA", holdings: [blankHolding()] }];
  }
  return accounts.map((account) => ({
    localId: crypto.randomUUID(),
    accountType: fromDbAccountType(account.accountType),
    holdings:
      account.holdings.length > 0
        ? account.holdings.map((holding) => ({
            localId: crypto.randomUUID(),
            tickerOrName: holding.tickerOrName,
            balance: String(holding.balance),
            units: holding.units != null ? String(holding.units) : "",
          }))
        : [blankHolding()],
  }));
}

export function HoldingsEditor({
  open,
  accounts,
  onClose,
  onSaved,
}: {
  open: boolean;
  accounts: IncomingAccount[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [drafts, setDrafts] = useState<DraftAccount[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDrafts(fromIncoming(accounts));
      setError(null);
    }
  }

  if (!open) return null;

  function updateAccount(localId: string, next: Partial<DraftAccount>) {
    setDrafts((current) => current.map((account) => (account.localId === localId ? { ...account, ...next } : account)));
  }

  function updateHolding(accountId: string, holdingId: string, field: keyof DraftHolding, value: string) {
    setDrafts((current) =>
      current.map((account) =>
        account.localId === accountId
          ? {
              ...account,
              holdings: account.holdings.map((holding) =>
                holding.localId === holdingId ? { ...holding, [field]: value } : holding,
              ),
            }
          : account,
      ),
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    const result = await saveHoldings({
      accounts: drafts.map((account) => ({
        id: account.localId,
        accountType: account.accountType,
        holdings: account.holdings.map((holding) => ({
          tickerOrName: holding.tickerOrName.trim(),
          balance: Number(holding.balance) || 0,
          ...(holding.units.trim() ? { units: Number(holding.units) } : {}),
        })),
      })),
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-[var(--warm-200)] px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">Edit holdings</h2>
            <p className="font-body text-xs text-[var(--text-muted)]">
              These are the accounts on your overview. A past month is added from Tracking.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="size-5 text-[var(--text-muted)]" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {drafts.map((account) => (
            <section key={account.localId} className="rounded-lg border border-[var(--warm-200)] p-3">
              <div className="flex items-start gap-2">
                <select
                  value={account.accountType}
                  onChange={(event) => updateAccount(account.localId, { accountType: event.target.value as AccountType })}
                  className="min-w-0 flex-1 rounded-lg border border-[var(--warm-200)] bg-white px-3 py-2 font-body text-sm"
                  aria-label="Account type"
                >
                  {Object.entries(ACCOUNT_CATEGORIES).map(([group, items]) => (
                    <optgroup key={group} label={group}>
                      {items.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setDrafts((current) => current.filter((item) => item.localId !== account.localId))}
                  className="rounded-md p-2 text-[var(--text-muted)] hover:text-[var(--error)]"
                  aria-label="Remove account"
                  disabled={drafts.length === 1}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <ul className="mt-3 space-y-2">
                {account.holdings.map((holding) => (
                  <li key={holding.localId} className="grid grid-cols-[minmax(0,1.4fr)_90px_70px_32px] items-center gap-2">
                    <input
                      value={holding.tickerOrName}
                      onChange={(event) => updateHolding(account.localId, holding.localId, "tickerOrName", event.target.value)}
                      placeholder="Name"
                      className="min-w-0 rounded-lg border border-[var(--warm-200)] px-2 py-1.5 font-body text-sm"
                      aria-label="Holding name"
                    />
                    <input
                      inputMode="decimal"
                      value={holding.balance}
                      onChange={(event) => updateHolding(account.localId, holding.localId, "balance", event.target.value)}
                      placeholder="Balance"
                      className="min-w-0 rounded-lg border border-[var(--warm-200)] px-2 py-1.5 text-right font-body text-sm tabular-nums"
                      aria-label="Balance"
                    />
                    <input
                      inputMode="decimal"
                      value={holding.units}
                      onChange={(event) => updateHolding(account.localId, holding.localId, "units", event.target.value)}
                      placeholder="Units"
                      className="min-w-0 rounded-lg border border-[var(--warm-200)] px-2 py-1.5 text-right font-body text-sm tabular-nums"
                      aria-label="Units"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateAccount(account.localId, {
                          holdings: account.holdings.filter((item) => item.localId !== holding.localId),
                        })
                      }
                      className="rounded-md p-1.5 text-[var(--text-muted)] hover:text-[var(--error)]"
                      aria-label="Remove holding"
                      disabled={account.holdings.length === 1}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => updateAccount(account.localId, { holdings: [...account.holdings, blankHolding()] })}
                className="mt-2 inline-flex items-center gap-1 font-display text-xs font-semibold text-[var(--emerald-dark)]"
              >
                <Plus className="size-3.5" />
                Add a holding
              </button>
            </section>
          ))}
          <button
            type="button"
            onClick={() =>
              setDrafts((current) => [
                ...current,
                { localId: crypto.randomUUID(), accountType: "TFSA", holdings: [blankHolding()] },
              ])
            }
            className="inline-flex items-center gap-1 font-display text-sm font-semibold text-[var(--text-primary)]"
          >
            <Plus className="size-4" />
            Add an account
          </button>
          {error && <p className="font-body text-sm text-[var(--error)]">{error}</p>}
        </div>
        <div className="flex gap-2 border-t border-[var(--warm-200)] p-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-[var(--warm-200)] py-2.5 font-display text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || drafts.length === 0}
            className="flex-1 rounded-lg bg-[var(--emerald)] py-2.5 font-display text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save holdings"}
          </button>
        </div>
      </div>
    </div>
  );
}
