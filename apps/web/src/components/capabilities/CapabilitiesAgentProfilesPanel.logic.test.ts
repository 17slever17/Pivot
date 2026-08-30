import type { OmpAgentProfile } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  createAgentProfileDraft,
  summarizeImportedProfiles,
  validateAgentProfileDraft,
} from "./CapabilitiesAgentProfilesPanel.logic";

const profile = (name: string): Pick<OmpAgentProfile, "name"> => ({ name });

describe("agent profile editor", () => {
  it("starts a usable draft and keeps prompt/permissions editable", () => {
    expect(createAgentProfileDraft(null, "openai/gpt-5")).toEqual({
      name: "",
      description: "",
      usageHint: "",
      model: "openai/gpt-5",
      effort: "medium",
      systemPrompt: "",
      readOnly: false,
      canSpawn: false,
    });
  });

  it("validates the fields required by the typed profile contract", () => {
    const draft = createAgentProfileDraft(null, "openai/gpt-5");
    expect(validateAgentProfileDraft(draft)).toContain("Profile names");
    expect(
      validateAgentProfileDraft({
        ...draft,
        name: "worker",
        description: "Handles implementation tasks",
      }),
    ).toBeNull();
  });
});

describe("Codex import summary", () => {
  it("groups only profile names and never depends on prompt contents", () => {
    expect(
      summarizeImportedProfiles([
        profile("common"),
        profile("orchestrator"),
        profile("worker"),
        profile("verifier"),
        profile("custom-helper"),
      ]),
    ).toEqual({
      common: ["common"],
      orchestrator: ["orchestrator"],
      worker: ["worker"],
      verifier: ["verifier"],
      other: ["custom-helper"],
    });
  });
});
