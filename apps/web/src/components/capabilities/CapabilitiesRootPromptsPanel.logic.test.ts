import { describe, expect, it } from "vite-plus/test";

import {
  areRootPromptBundlesEqual,
  isRootPromptBundlesEmpty,
} from "./CapabilitiesRootPromptsPanel.logic";

const bundles = {
  commonPrompt: "common instructions",
  orchestratorPrompt: "common instructions\norchestrator instructions",
} as const;

describe("root prompt bundles", () => {
  it("treats the two complete alternatives as one atomic draft", () => {
    expect(areRootPromptBundlesEqual(bundles, { ...bundles })).toBe(true);
    expect(
      areRootPromptBundlesEqual(bundles, {
        ...bundles,
        orchestratorPrompt: "updated orchestrator instructions",
      }),
    ).toBe(false);
  });

  it("recognizes an empty server response without inventing a default prompt", () => {
    expect(isRootPromptBundlesEmpty({ commonPrompt: "", orchestratorPrompt: "" })).toBe(true);
    expect(isRootPromptBundlesEmpty(bundles)).toBe(false);
  });
});
