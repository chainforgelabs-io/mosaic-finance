"use client";

import { useMarketStore } from "@/stores/market-store";
import { useCommentary, useGenerateCommentary } from "../hooks/useCommentary";
import { PERSONAS, getPersona } from "@/lib/ai-commentary/personas";
import { InvestorCard } from "./InvestorCard";
import { CommentaryDetail } from "./CommentaryDetail";
import { AlertTriangle, Brain } from "lucide-react";
import type { PersonaSlug } from "@/lib/market-data/types";

export function AICommentary() {
  const {
    commentaries,
    commentariesLoading,
    selectedPersona,
    setSelectedPersona,
  } = useMarketStore();

  useCommentary();
  const { generate, generating, error } = useGenerateCommentary();

  // Detail view
  if (selectedPersona) {
    const persona = getPersona(selectedPersona as PersonaSlug);
    const commentary = commentaries.find((c) => c.persona === selectedPersona);

    if (persona && commentary) {
      return (
        <CommentaryDetail
          persona={persona}
          commentary={commentary}
          onBack={() => setSelectedPersona(null)}
        />
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-[var(--warm-50)] flex items-center justify-center shrink-0">
          <Brain className="w-[18px] h-[18px] text-[var(--text-secondary)]" />
        </div>
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-semibold text-lg text-[var(--text-primary)]">
            AI Investor Commentary
          </h2>
          <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)] mt-0.5">
            Market analysis through the lens of legendary investors, powered by Grok + Claude.
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-3 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-[var(--warning)] mt-0.5 shrink-0" />
        <p className="font-[family-name:var(--font-body)] text-[13px] text-amber-800">
          These AI commentaries simulate investment philosophies for educational purposes.
          They do not represent actual views of any named investor and are not investment advice.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="font-[family-name:var(--font-body)] text-sm text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* Persona cards grid */}
      {commentariesLoading && commentaries.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white border border-[var(--warm-200)] rounded-lg p-5 animate-pulse"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[var(--warm-100)]" />
                <div>
                  <div className="h-4 w-28 bg-[var(--warm-100)] rounded" />
                  <div className="h-3 w-40 bg-[var(--warm-50)] rounded mt-1" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-[var(--warm-50)] rounded" />
                <div className="h-3 w-3/4 bg-[var(--warm-50)] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PERSONAS.map((persona) => {
            const commentary = commentaries.find(
              (c) => c.persona === persona.slug,
            );

            return (
              <InvestorCard
                key={persona.slug}
                persona={persona}
                commentary={commentary || null}
                onExpand={() => setSelectedPersona(persona.slug)}
                onGenerate={() => generate(persona.slug)}
                isGenerating={generating === persona.slug}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
