import type { OmpAgentProfile, OmpAgentProfileEffort } from "@t3tools/contracts";

export const OMP_AGENT_PROFILE_EFFORTS: readonly OmpAgentProfileEffort[] = [
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
];

export type AgentProfileDraft = {
  name: string;
  description: string;
  usageHint: string;
  model: string;
  effort: OmpAgentProfileEffort;
  systemPrompt: string;
  readOnly: boolean;
  canSpawn: boolean;
};

export function createAgentProfileDraft(
  profile: OmpAgentProfile | null = null,
  fallbackModel = "",
): AgentProfileDraft {
  return {
    name: profile?.name ?? "",
    description: profile?.description ?? "",
    usageHint: profile?.usageHint ?? "",
    model: profile?.model ?? fallbackModel,
    effort: profile?.effort ?? "medium",
    systemPrompt: profile?.systemPrompt ?? "",
    readOnly: profile?.readOnly ?? false,
    canSpawn: profile?.canSpawn ?? false,
  };
}

export function validateAgentProfileDraft(draft: AgentProfileDraft): string | null {
  const name = draft.name.trim();
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(name) || name.length > 64) {
    return "Profile names must start with a letter and use only letters, numbers, _ or -.";
  }
  if (draft.description.trim().length === 0) return "Add a short description for this profile.";
  if (draft.model.trim().length === 0) return "Choose a model for this profile.";
  return null;
}

export type ImportedProfileCategory = "common" | "orchestrator" | "worker" | "verifier" | "other";

export function importedProfileCategory(name: string): ImportedProfileCategory {
  const normalized = name.trim().toLowerCase();
  if (normalized === "common") return "common";
  if (normalized === "orchestrator") return "orchestrator";
  if (normalized === "worker") return "worker";
  if (normalized === "verifier") return "verifier";
  return "other";
}

export function summarizeImportedProfiles(
  profiles: ReadonlyArray<Pick<OmpAgentProfile, "name">>,
): Readonly<Record<ImportedProfileCategory, readonly string[]>> {
  const summary: Record<ImportedProfileCategory, string[]> = {
    common: [],
    orchestrator: [],
    worker: [],
    verifier: [],
    other: [],
  };
  for (const profile of profiles) {
    summary[importedProfileCategory(profile.name)].push(profile.name);
  }
  return summary;
}
