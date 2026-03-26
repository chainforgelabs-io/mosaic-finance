import fs from "fs";
import path from "path";

const KNOWLEDGE_DIR = path.join(process.cwd(), "src", "lib", "knowledge");

const MODULE_MAP: Record<string, string> = {
  "fact-find": "01-fact-find-process.md",
  "risk-profiling": "02-risk-profiling-behavioural-finance.md",
  insurance: "03-insurance-planning.md",
  "family-law": "04-family-law-divorce.md",
  business: "05-business-structures-legal.md",
  "cross-border": "06-cross-border-snowbirds.md",
};

export type KnowledgeModuleKey = keyof typeof MODULE_MAP;

export interface UserProfileFlags {
  isDivorced?: boolean;
  isSeparated?: boolean;
  isBusinessOwner?: boolean;
  isSelfEmployed?: boolean;
  hasUSProperty?: boolean;
  hasUSIncome?: boolean;
  isSnowbird?: boolean;
}

export type ConversationStage =
  | "onboarding"
  | "fact-find"
  | "risk-assessment"
  | "plan-generation"
  | "walkthrough"
  | "annual-review"
  | "ad-hoc";

export function loadKnowledgeModules(moduleKeys: string[]): string {
  return moduleKeys
    .map((key) => {
      const file = MODULE_MAP[key];
      if (!file) return "";
      const filePath = path.join(KNOWLEDGE_DIR, file);
      try {
        return fs.readFileSync(filePath, "utf-8");
      } catch {
        return "";
      }
    })
    .filter(Boolean)
    .join("\n\n---\n\n");
}

export function getModulesForStage(
  stage: ConversationStage,
  userFlags: UserProfileFlags = {},
): string[] {
  const modules: string[] = [];

  if (["onboarding", "fact-find", "walkthrough", "annual-review"].includes(stage)) {
    modules.push("fact-find");
  }

  if (stage === "risk-assessment") {
    modules.push("risk-profiling");
  }

  if (stage === "ad-hoc") {
    modules.push("fact-find");
    modules.push("risk-profiling");
  }

  if (userFlags.isDivorced || userFlags.isSeparated) {
    modules.push("family-law");
  }
  if (userFlags.isBusinessOwner || userFlags.isSelfEmployed) {
    modules.push("business");
  }
  if (userFlags.hasUSProperty || userFlags.hasUSIncome || userFlags.isSnowbird) {
    modules.push("cross-border");
  }

  if (stage === "plan-generation") {
    modules.push("insurance");
    if (!modules.includes("family-law") && (userFlags.isDivorced || userFlags.isSeparated)) {
      modules.push("family-law");
    }
    if (!modules.includes("business") && (userFlags.isBusinessOwner || userFlags.isSelfEmployed)) {
      modules.push("business");
    }
    if (
      !modules.includes("cross-border") &&
      (userFlags.hasUSProperty || userFlags.hasUSIncome || userFlags.isSnowbird)
    ) {
      modules.push("cross-border");
    }
  }

  return [...new Set(modules)];
}

export function buildKnowledgeContext(
  stage: ConversationStage,
  userFlags: UserProfileFlags = {},
): string {
  const moduleKeys = getModulesForStage(stage, userFlags);
  if (moduleKeys.length === 0) return "";

  const content = loadKnowledgeModules(moduleKeys);
  if (!content) return "";

  return `\n<reference_knowledge>\n${content}\n</reference_knowledge>\n`;
}
