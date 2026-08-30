import type { OmpSettingsSurfaceEntry } from "@t3tools/contracts";

export interface OmpModelRolePreset {
  readonly id: string;
  readonly description: string;
}

/** OMP v18.0.11's built-in model-routing roles, stored without the `@` prefix. */
export const OMP_MODEL_ROLE_PRESETS: ReadonlyArray<OmpModelRolePreset> = [
  { id: "default", description: "Primary model for ordinary work." },
  {
    id: "smol",
    description: "Fast mechanical task agents (scout, librarian, and sonic).",
  },
  { id: "slow", description: "Slower reviewer for careful analysis." },
  { id: "vision", description: "Image and visual-understanding tasks." },
  { id: "plan", description: "Planning and decomposition." },
  { id: "designer", description: "Design and UI-focused work." },
  { id: "commit", description: "Small commit/message-oriented tasks." },
  { id: "tiny", description: "Lightweight background work and thread titles." },
  { id: "task", description: "Full subagents for substantial tasks." },
  { id: "advisor", description: "Secondary advice/reasoning model." },
];

/**
 * The omp `modelRoles` record as a flat `{ role: modelSlug }` map.
 *
 * The capabilities surface can represent it two ways:
 * - the global view keeps it as one `modelRoles` entry whose `value` is the
 *   whole record;
 * - the project view flattens it into `modelRoles.<role>` scalar entries.
 * Either shape is normalized to the same map.
 */
export function modelRolesFromSettingsEntries(
  entries: ReadonlyArray<OmpSettingsSurfaceEntry>,
): Readonly<Record<string, string>> {
  const roles: Record<string, string> = {};

  const recordEntry = entries.find((entry) => entry.key === "modelRoles");
  if (recordEntry !== undefined && isRecordValue(recordEntry.value)) {
    for (const [role, value] of Object.entries(recordEntry.value)) {
      if (typeof value === "string" && value.trim().length > 0) {
        roles[role] = value.trim();
      }
    }
    return roles;
  }

  const prefix = "modelRoles.";
  for (const entry of entries) {
    if (!entry.key.startsWith(prefix)) continue;
    const role = entry.key.slice(prefix.length);
    if (role.length === 0 || typeof entry.value !== "string" || entry.value.trim().length === 0) {
      continue;
    }
    roles[role] = entry.value.trim();
  }

  return roles;
}

/** Return only built-in roles that have not already been configured. */
export function availableOmpModelRolePresets(
  roles: Readonly<Record<string, string>>,
): ReadonlyArray<OmpModelRolePreset> {
  const assignedRoles = new Set(Object.keys(roles));
  return OMP_MODEL_ROLE_PRESETS.filter((preset) => !assignedRoles.has(preset.id));
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
