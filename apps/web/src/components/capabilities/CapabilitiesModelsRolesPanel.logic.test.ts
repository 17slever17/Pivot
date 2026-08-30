import type { OmpSettingsSurfaceEntry } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  availableOmpModelRolePresets,
  modelRolesFromSettingsEntries,
  OMP_MODEL_ROLE_PRESETS,
} from "./CapabilitiesModelsRolesPanel.logic";

function entry(overrides: Partial<OmpSettingsSurfaceEntry>): OmpSettingsSurfaceEntry {
  return {
    key: "x",
    type: "string",
    description: "",
    masked: false,
    scope: "global",
    ...overrides,
  } as OmpSettingsSurfaceEntry;
}

describe("modelRolesFromSettingsEntries", () => {
  it("reads roles from the record-valued modelRoles entry (global shape)", () => {
    const roles = modelRolesFromSettingsEntries([
      entry({
        key: "modelRoles",
        type: "record",
        value: { default: "cursor/cursor-grok-4.5-high", review: "openai/gpt-5.6" },
      }),
    ]);
    expect(roles).toEqual({
      default: "cursor/cursor-grok-4.5-high",
      review: "openai/gpt-5.6",
    });
  });

  it("reads roles from flattened modelRoles.<role> entries (project shape)", () => {
    const roles = modelRolesFromSettingsEntries([
      entry({ key: "modelRoles.default", type: "string", value: "cursor/cursor-grok-4.5-high" }),
      entry({ key: "modelRoles.review", type: "string", value: "openai/gpt-5.6" }),
    ]);
    expect(roles).toEqual({
      default: "cursor/cursor-grok-4.5-high",
      review: "openai/gpt-5.6",
    });
  });

  it("returns an empty map when modelRoles is absent", () => {
    expect(modelRolesFromSettingsEntries([entry({ key: "some.other" })])).toEqual({});
  });

  it("skips roles with empty or non-string values", () => {
    const roles = modelRolesFromSettingsEntries([
      entry({ key: "modelRoles.empty", type: "string", value: "" }),
      entry({ key: "modelRoles.record", type: "record", value: { nested: true } }),
    ]);
    expect(roles).toEqual({});
  });

  it("prefers the record entry over flattened keys when both are present", () => {
    const roles = modelRolesFromSettingsEntries([
      entry({ key: "modelRoles", type: "record", value: { default: "a", review: "b" } }),
      entry({ key: "modelRoles.review", type: "string", value: "stale" }),
    ]);
    expect(roles.review).toBe("b");
  });
});

describe("OMP model role presets", () => {
  it("lists the built-in roles in OMP's canonical order", () => {
    expect(OMP_MODEL_ROLE_PRESETS.map((preset) => preset.id)).toEqual([
      "default",
      "smol",
      "slow",
      "vision",
      "plan",
      "designer",
      "commit",
      "tiny",
      "task",
      "advisor",
    ]);
    expect(OMP_MODEL_ROLE_PRESETS.find((preset) => preset.id === "smol")?.description).toBe(
      "Fast mechanical task agents (scout, librarian, and sonic).",
    );
    expect(OMP_MODEL_ROLE_PRESETS.find((preset) => preset.id === "slow")?.description).toBe(
      "Slower reviewer for careful analysis.",
    );
    expect(OMP_MODEL_ROLE_PRESETS.find((preset) => preset.id === "task")?.description).toBe(
      "Full subagents for substantial tasks.",
    );
    expect(OMP_MODEL_ROLE_PRESETS.find((preset) => preset.id === "tiny")?.description).toBe(
      "Lightweight background work and thread titles.",
    );
  });

  it("filters assigned presets without treating custom roles as built-ins", () => {
    const available = availableOmpModelRolePresets({
      smol: "provider/fast",
      task: "provider/strong",
      review: "provider/reviewer",
      worker: "provider/worker",
      verifier: "provider/verifier",
    });

    expect(available.map((preset) => preset.id)).toEqual([
      "default",
      "slow",
      "vision",
      "plan",
      "designer",
      "commit",
      "tiny",
      "advisor",
    ]);
    expect(available.some((preset) => preset.id === "review")).toBe(false);
    expect(available.some((preset) => preset.id === "worker")).toBe(false);
    expect(available.some((preset) => preset.id === "verifier")).toBe(false);
  });

  it("keeps a custom role in saved settings while offering built-in presets separately", () => {
    const roles = modelRolesFromSettingsEntries([
      entry({
        key: "modelRoles",
        type: "record",
        value: { review: "provider/reviewer" },
      }),
    ]);

    expect(roles).toEqual({ review: "provider/reviewer" });
    expect(availableOmpModelRolePresets(roles).map((preset) => preset.id)).toContain("smol");
  });
});
