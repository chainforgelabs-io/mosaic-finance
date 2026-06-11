"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useSources, useXConnection } from "../../hooks/usePicks";
import type { TrackedXAccount } from "@/types/picks";
import {
  Rss,
  Plus,
  Trash2,
  Landmark,
  Twitter,
  RefreshCw,
  UserPlus,
} from "lucide-react";

interface FollowingEntry {
  handle: string;
  name: string;
  description: string;
  followers: number;
  tracked: boolean;
}

function XConnectCard({ onTracked }: { onTracked: () => void }) {
  const { configured, connection, loading, refetch } = useXConnection();
  const [following, setFollowing] = useState<FollowingEntry[] | null>(null);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);

  async function loadFollowing() {
    setLoadingFollowing(true);
    setFollowError(null);
    try {
      const res = await fetch("/api/picks/twitter/following");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to load following");
      setFollowing(body.following);
    } catch (err) {
      setFollowError(
        err instanceof Error ? err.message : "Failed to load following",
      );
    } finally {
      setLoadingFollowing(false);
    }
  }

  async function trackHandle(entry: FollowingEntry) {
    const res = await fetch("/api/picks/twitter/following", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle: entry.handle, displayName: entry.name }),
    });
    if (res.ok || res.status === 409) {
      setFollowing(
        (prev) =>
          prev?.map((f) =>
            f.handle === entry.handle ? { ...f, tracked: true } : f,
          ) ?? null,
      );
      onTracked();
    }
  }

  async function disconnect() {
    await fetch("/api/picks/twitter", { method: "DELETE" });
    setFollowing(null);
    await refetch();
  }

  return (
    <div className="rounded-lg border border-[var(--warm-200)] bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Twitter className="h-4 w-4 text-[var(--text-secondary)]" />
        <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--text-primary)]">
          Your X account
        </h3>
      </div>

      {loading && (
        <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">
          Checking connection…
        </p>
      )}

      {!loading && !configured && (
        <p className="font-[family-name:var(--font-body)] text-xs leading-relaxed text-[var(--text-muted)]">
          X OAuth is not configured yet. Set <code>X_OAUTH_CLIENT_ID</code> and{" "}
          <code>X_OAUTH_CLIENT_SECRET</code> from an X developer app to link
          your account and import who you follow.
        </p>
      )}

      {!loading && configured && !connection && (
        <div>
          <p className="font-[family-name:var(--font-body)] mb-3 text-xs leading-relaxed text-[var(--text-muted)]">
            Link your X account to browse the accounts you follow and promote
            the alpha posters into your tracked list.
          </p>
          <a
            href="/api/picks/twitter/connect"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--emerald)] px-3 py-1.5 font-[family-name:var(--font-display)] text-xs font-medium text-white"
          >
            <Twitter className="h-3.5 w-3.5" />
            Connect X
          </a>
        </div>
      )}

      {!loading && configured && connection && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-secondary)]">
              Connected as{" "}
              <span className="font-semibold">
                @{connection.x_username || connection.x_user_id}
              </span>
            </p>
            <button
              type="button"
              onClick={() => void disconnect()}
              className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)] underline hover:text-[var(--error)]"
            >
              Disconnect
            </button>
          </div>

          {!following && (
            <button
              type="button"
              onClick={() => void loadFollowing()}
              disabled={loadingFollowing}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border border-[var(--warm-200)] px-3 py-1.5 font-[family-name:var(--font-display)] text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--emerald)] hover:text-[var(--emerald)]",
                loadingFollowing && "cursor-wait opacity-60",
              )}
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", loadingFollowing && "animate-spin")}
              />
              {loadingFollowing ? "Loading…" : "Load who you follow"}
            </button>
          )}

          {followError && (
            <p className="font-[family-name:var(--font-body)] text-xs text-[var(--error)]">
              {followError}
            </p>
          )}

          {following && (
            <div className="max-h-80 space-y-1.5 overflow-y-auto">
              {following.map((entry) => (
                <div
                  key={entry.handle}
                  className="flex items-center gap-2 rounded-md bg-[var(--warm-50)] px-2.5 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-[family-name:var(--font-display)] truncate text-xs font-semibold text-[var(--text-primary)]">
                      {entry.name}{" "}
                      <span className="font-[family-name:var(--font-body)] font-normal text-[var(--text-muted)]">
                        @{entry.handle}
                      </span>
                    </p>
                    <p className="font-[family-name:var(--font-body)] truncate text-[11px] text-[var(--text-muted)]">
                      {entry.description}
                    </p>
                  </div>
                  {entry.tracked ? (
                    <span className="font-[family-name:var(--font-body)] shrink-0 text-[10px] font-medium text-[var(--emerald)]">
                      Tracked
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void trackHandle(entry)}
                      className="flex shrink-0 items-center gap-1 rounded-md border border-[var(--warm-200)] px-2 py-1 text-[10px] font-medium text-[var(--text-secondary)] hover:border-[var(--emerald)] hover:text-[var(--emerald)]"
                    >
                      <UserPlus className="h-3 w-3" />
                      Track
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AccountRow({
  account,
  onUpdate,
  onDelete,
}: {
  account: TrackedXAccount;
  onUpdate: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-[var(--warm-100)] px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="font-[family-name:var(--font-display)] truncate text-xs font-semibold text-[var(--text-primary)]">
          @{account.handle}
        </p>
        <p className="font-[family-name:var(--font-body)] text-[11px] text-[var(--text-muted)]">
          {account.category} · weight {account.weight.toFixed(2)}
          {account.last_ingested_at &&
            ` · scanned ${new Date(account.last_ingested_at).toLocaleString()}`}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onUpdate(account.id, !account.active)}
        className={cn(
          "rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors",
          account.active
            ? "bg-emerald-50 text-[var(--emerald)]"
            : "bg-gray-100 text-[var(--text-muted)]",
        )}
      >
        {account.active ? "Active" : "Paused"}
      </button>
      <button
        type="button"
        onClick={() => onDelete(account.id)}
        title="Remove"
        className="text-[var(--text-muted)] transition-colors hover:text-[var(--error)]"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function SourcesView() {
  const { xAccounts, congressMembers, loading, error, refetch } = useSources();
  const [newHandle, setNewHandle] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function handleAdd() {
    const handle = newHandle.trim().replace(/^@/, "");
    if (!handle) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/picks/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to add");
      setNewHandle("");
      await refetch();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setAdding(false);
    }
  }

  async function handleUpdate(id: string, active: boolean) {
    await fetch("/api/picks/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "x_account", id, active }),
    });
    await refetch();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/picks/sources?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await refetch();
  }

  async function handleToggleMember(id: string, active: boolean) {
    await fetch("/api/picks/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "congress_member", id, active }),
    });
    await refetch();
  }

  const activeMembers = congressMembers.filter((m) => m.active);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--warm-200)] bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Rss className="h-4 w-4 text-[var(--text-secondary)]" />
            <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--text-primary)]">
              Tracked X accounts
            </h3>
            <span className="font-[family-name:var(--font-body)] text-[10px] text-[var(--text-muted)]">
              {xAccounts.filter((a) => a.active).length} active
            </span>
          </div>

          <div className="mb-3 flex items-center gap-2">
            <input
              type="text"
              value={newHandle}
              onChange={(e) => setNewHandle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleAdd();
              }}
              placeholder="@handle"
              className="font-[family-name:var(--font-body)] w-40 rounded-lg border border-[var(--warm-200)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void handleAdd()}
              disabled={adding || !newHandle.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--emerald)] px-3 py-1.5 font-[family-name:var(--font-display)] text-xs font-medium text-white disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Track
            </button>
          </div>
          {addError && (
            <p className="font-[family-name:var(--font-body)] mb-2 text-xs text-[var(--error)]">
              {addError}
            </p>
          )}

          {loading && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-md bg-[var(--warm-50)]"
                />
              ))}
            </div>
          )}
          {!loading && error && (
            <p className="font-[family-name:var(--font-body)] text-xs text-[var(--error)]">
              {error}
            </p>
          )}
          {!loading && (
            <div className="max-h-96 space-y-1.5 overflow-y-auto">
              {xAccounts.map((account) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  onUpdate={(id, active) => void handleUpdate(id, active)}
                  onDelete={(id) => void handleDelete(id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <XConnectCard onTracked={() => void refetch()} />

        <div className="rounded-lg border border-[var(--warm-200)] bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Landmark className="h-4 w-4 text-[var(--text-secondary)]" />
            <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--text-primary)]">
              Congress trading
            </h3>
            <span className="font-[family-name:var(--font-body)] text-[10px] text-[var(--text-muted)]">
              {activeMembers.length} members
            </span>
          </div>
          <p className="font-[family-name:var(--font-body)] mb-3 text-xs leading-relaxed text-[var(--text-muted)]">
            STOCK Act filings ingest daily from the free Senate/House Stock
            Watcher datasets. Members appear automatically after the first
            ingest; pause anyone you want excluded from scoring.
          </p>
          {congressMembers.length === 0 && (
            <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">
              No members yet — they will populate after the first congress
              ingest run.
            </p>
          )}
          {congressMembers.length > 0 && (
            <div className="max-h-72 space-y-1.5 overflow-y-auto">
              {congressMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 rounded-md border border-[var(--warm-100)] px-3 py-1.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-[family-name:var(--font-display)] truncate text-xs font-semibold text-[var(--text-primary)]">
                      {member.full_name}
                    </p>
                    <p className="font-[family-name:var(--font-body)] text-[10px] capitalize text-[var(--text-muted)]">
                      {member.chamber || "—"}
                      {member.party ? ` · ${member.party}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void handleToggleMember(member.id, !member.active)
                    }
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-medium",
                      member.active
                        ? "bg-emerald-50 text-[var(--emerald)]"
                        : "bg-gray-100 text-[var(--text-muted)]",
                    )}
                  >
                    {member.active ? "Active" : "Paused"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
