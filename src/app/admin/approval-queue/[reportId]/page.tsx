"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAdminStore } from "@/stores/admin-store";
import { PlanSectionComponent } from "@/components/app/PlanSectionComponent";
import { TierBadge } from "@/components/app/TierBadge";
import { EmptyState } from "@/components/app/EmptyState";
import {
  ArrowLeft,
  CheckCircle2,
  Edit3,
  XCircle,
  AlertTriangle,
  Clock,
  FileText,
  User,
  Shield,
  X,
} from "lucide-react";
import Link from "next/link";
import type { ApprovalAction } from "@/types";

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getSlaUrgency(deadline: string): "safe" | "warning" | "critical" | "overdue" {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "overdue";
  const hours = diff / (1000 * 60 * 60);
  if (hours < 4) return "critical";
  if (hours < 12) return "warning";
  return "safe";
}

function SlaIndicator({ deadline }: { deadline: string }) {
  const urgency = getSlaUrgency(deadline);
  const diff = new Date(deadline).getTime() - Date.now();
  const hours = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
  const minutes = Math.floor((Math.abs(diff) % (1000 * 60 * 60)) / (1000 * 60));

  const config = {
    safe: { bg: "bg-[var(--emerald-soft)]", text: "text-[var(--emerald-dark)]", label: `${hours}h ${minutes}m remaining` },
    warning: { bg: "bg-amber-50", text: "text-amber-700", label: `${hours}h ${minutes}m remaining` },
    critical: { bg: "bg-red-50", text: "text-red-700", label: `${hours}h ${minutes}m remaining` },
    overdue: { bg: "bg-red-50", text: "text-red-700", label: `Overdue by ${hours}h ${minutes}m` },
  }[urgency];

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bg}`}>
      {urgency === "overdue" ? (
        <AlertTriangle className={`w-4 h-4 ${config.text}`} />
      ) : (
        <Clock className={`w-4 h-4 ${config.text}`} />
      )}
      <span className={`font-[family-name:var(--font-body)] text-sm font-semibold ${config.text} tabular-nums`}>
        {config.label}
      </span>
    </div>
  );
}

function ConfirmationModal({
  isOpen,
  action,
  onConfirm,
  onCancel,
  rejectReason,
  onRejectReasonChange,
}: {
  isOpen: boolean;
  action: ApprovalAction;
  onConfirm: () => void;
  onCancel: () => void;
  rejectReason: string;
  onRejectReasonChange: (val: string) => void;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const config = {
    approve: {
      title: "Approve & Deliver Plan",
      description: "This will mark the plan as CIM-reviewed and deliver it to the user. A PDF will be generated and an email notification sent.",
      confirmLabel: "Approve & Deliver",
      confirmStyle: "bg-[var(--emerald)] hover:bg-[var(--emerald-dark)] text-white",
      icon: <CheckCircle2 className="w-6 h-6 text-[var(--emerald)]" />,
    },
    edit_approve: {
      title: "Edit & Approve Plan",
      description: "This will apply your edits, mark the plan as CIM-reviewed, and deliver it to the user.",
      confirmLabel: "Save & Deliver",
      confirmStyle: "bg-[var(--slate-950)] hover:bg-[var(--slate-950)]/90 text-white",
      icon: <Edit3 className="w-6 h-6 text-[var(--text-primary)]" />,
    },
    reject: {
      title: "Reject — Request More Info",
      description: "The user will be notified that additional information is needed before their plan can be approved.",
      confirmLabel: "Reject Plan",
      confirmStyle: "bg-[var(--error)] hover:bg-red-600 text-white",
      icon: <XCircle className="w-6 h-6 text-[var(--error)]" />,
    },
  }[action];

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onCancel(); }}
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-[fade-up_200ms_ease-out]">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {config.icon}
            <h3 className="font-[family-name:var(--font-display)] font-semibold text-lg text-[var(--text-primary)]">
              {config.title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-md hover:bg-[var(--warm-100)] transition-colors"
          >
            <X className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>

        <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)] mb-6">
          {config.description}
        </p>

        {action === "reject" && (
          <div className="mb-6">
            <label className="font-[family-name:var(--font-body)] text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 block">
              Reason for rejection
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => onRejectReasonChange(e.target.value)}
              rows={3}
              placeholder="Explain what information is needed…"
              className="w-full px-3 py-2 rounded-lg border border-[var(--warm-200)] bg-[var(--warm-50)] font-[family-name:var(--font-body)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)] focus:border-transparent resize-none"
            />
          </div>
        )}

        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-lg border border-[var(--warm-200)] font-[family-name:var(--font-display)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--warm-50)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={action === "reject" && !rejectReason.trim()}
            className={`px-5 py-2.5 rounded-lg font-[family-name:var(--font-display)] text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${config.confirmStyle}`}
          >
            {config.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PlanReviewPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const router = useRouter();
  const { getItemById, processAction, reviewer, loadAdminData, queueItems } = useAdminStore();

  const [notes, setNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [modalAction, setModalAction] = useState<ApprovalAction | null>(null);

  useEffect(() => {
    if (!queueItems.length) {
      loadAdminData();
    }
  }, [queueItems.length, loadAdminData]);

  const item = getItemById(reportId);

  const handleConfirm = () => {
    if (!modalAction || !item) return;
    processAction(item.id, modalAction, notes, rejectReason);
    setModalAction(null);
    router.push("/admin/approval-queue");
  };

  if (!item) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-12">
        <EmptyState
          icon={FileText}
          title="Plan not found"
          description="This plan may have already been reviewed or the link is invalid."
          ctaLabel="Back to Queue"
          ctaHref="/admin/approval-queue"
        />
      </div>
    );
  }

  const audit = {
    submittedBy: item.userAlias,
    submittedAt: item.submittedAt,
    slaDeadline: item.slaDeadline,
  };

  return (
    <>
      <ConfirmationModal
        isOpen={modalAction !== null}
        action={modalAction || "approve"}
        onConfirm={handleConfirm}
        onCancel={() => setModalAction(null)}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
      />

      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Back link */}
        <Link
          href="/admin/approval-queue"
          className="inline-flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] font-[family-name:var(--font-body)] text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Queue
        </Link>

        <div className="flex gap-8 items-start">
          {/* Left: Full plan */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-[var(--warm-200)] p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl text-[var(--text-primary)]">
                  Financial Plan
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-medium font-[family-name:var(--font-display)]">
                  <Clock className="w-3 h-3" />
                  Pending Review
                </span>
              </div>

              {item.plan.sections.map((section) => (
                <PlanSectionComponent
                  key={section.id}
                  section={section}
                  defaultExpanded={false}
                />
              ))}
            </div>
          </div>

          {/* Right: Reviewer actions (sticky) */}
          <div className="w-[380px] shrink-0 sticky top-6 self-start hidden lg:block space-y-5">
            {/* Reviewer actions header */}
            <div className="bg-white rounded-xl border border-[var(--warm-200)] p-5">
              <h2 className="font-[family-name:var(--font-display)] font-semibold text-lg text-[var(--text-primary)] mb-4">
                Reviewer Actions
              </h2>

              {/* User summary card */}
              <div className="bg-[var(--warm-50)] rounded-lg p-4 mb-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--slate-950)] flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-body)] text-sm font-semibold text-[var(--text-primary)]">
                      {item.userAlias}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <TierBadge tier={item.tier} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="font-[family-name:var(--font-body)] text-[11px] text-[var(--text-muted)] uppercase tracking-wider">
                      Age
                    </p>
                    <p className="font-[family-name:var(--font-body)] text-sm font-medium text-[var(--text-primary)]">
                      {item.age}
                    </p>
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-body)] text-[11px] text-[var(--text-muted)] uppercase tracking-wider">
                      Province
                    </p>
                    <p className="font-[family-name:var(--font-body)] text-sm font-medium text-[var(--text-primary)]">
                      {item.province}
                    </p>
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-body)] text-[11px] text-[var(--text-muted)] uppercase tracking-wider">
                      Risk Score
                    </p>
                    <p className="font-[family-name:var(--font-body)] text-sm font-semibold text-[var(--emerald)] tabular-nums">
                      {item.riskScore}
                    </p>
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-body)] text-[11px] text-[var(--text-muted)] uppercase tracking-wider">
                      Risk Label
                    </p>
                    <p className="font-[family-name:var(--font-body)] text-sm font-medium text-[var(--text-primary)]">
                      {item.riskLabel}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2.5">
                <button
                  onClick={() => setModalAction("approve")}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[var(--emerald)] text-white font-[family-name:var(--font-display)] text-sm font-semibold hover:bg-[var(--emerald-dark)] transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve & Deliver
                </button>

                <button
                  onClick={() => setModalAction("edit_approve")}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[var(--slate-950)] text-white font-[family-name:var(--font-display)] text-sm font-semibold hover:bg-[var(--slate-950)]/90 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit & Approve
                </button>

                <button
                  onClick={() => setModalAction("reject")}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-[var(--error)] text-[var(--error)] font-[family-name:var(--font-display)] text-sm font-semibold hover:bg-red-50 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Reject — Request More Info
                </button>
              </div>
            </div>

            {/* Internal notes */}
            <div className="bg-white rounded-xl border border-[var(--warm-200)] p-5">
              <label className="font-[family-name:var(--font-display)] font-medium text-sm text-[var(--text-primary)] mb-2 block">
                Review Notes
              </label>
              <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)] mb-3">
                Internal only — not shown to user
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Add review notes…"
                className="w-full px-3 py-2 rounded-lg border border-[var(--warm-200)] bg-[var(--warm-50)] font-[family-name:var(--font-body)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)] focus:border-transparent resize-none"
              />
            </div>

            {/* Audit info */}
            <div className="bg-white rounded-xl border border-[var(--warm-200)] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-[var(--text-muted)]" />
                <h3 className="font-[family-name:var(--font-display)] font-medium text-sm text-[var(--text-primary)]">
                  Audit Trail
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="font-[family-name:var(--font-body)] text-[11px] text-[var(--text-muted)] uppercase tracking-wider">
                    Submitted by
                  </p>
                  <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-primary)]">
                    {audit.submittedBy}
                  </p>
                </div>
                <div>
                  <p className="font-[family-name:var(--font-body)] text-[11px] text-[var(--text-muted)] uppercase tracking-wider">
                    Submitted at
                  </p>
                  <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)]">
                    {formatDateTime(audit.submittedAt)}
                  </p>
                </div>
                <div>
                  <p className="font-[family-name:var(--font-body)] text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    SLA Deadline
                  </p>
                  <SlaIndicator deadline={audit.slaDeadline} />
                </div>
                <div>
                  <p className="font-[family-name:var(--font-body)] text-[11px] text-[var(--text-muted)] uppercase tracking-wider">
                    Reviewer
                  </p>
                  <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-primary)]">
                    {reviewer?.name ?? "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
