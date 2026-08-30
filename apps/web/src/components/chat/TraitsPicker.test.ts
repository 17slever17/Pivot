import { describe, expect, it } from "vite-plus/test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  ProviderDriverKind,
  type ProviderOptionDescriptor,
  type ServerProviderModel,
} from "@t3tools/contracts";
import { buildTraitsTriggerDisplay, TraitsMenuContent } from "./TraitsPicker";
import { Menu } from "../ui/menu";
import { reasoningEffortOptionLabel } from "./reasoningEffort";

function selectDescriptor(
  id: string,
  options: ReadonlyArray<{ id: string; label: string; isDefault?: boolean }>,
  currentValue: string,
): Extract<ProviderOptionDescriptor, { type: "select" }> {
  return { id, label: id, type: "select", options: [...options], currentValue };
}

function fastModeDescriptor(
  currentValue: boolean,
): Extract<ProviderOptionDescriptor, { type: "boolean" }> {
  return { id: "fastMode", label: "Fast Mode", type: "boolean", currentValue };
}

function modelWith(
  descriptors: ReadonlyArray<ProviderOptionDescriptor>,
): ReadonlyArray<ServerProviderModel> {
  return [
    {
      slug: "test-model",
      name: "Test Model",
      isCustom: false,
      capabilities: { optionDescriptors: descriptors },
    },
  ];
}

const EFFORT = selectDescriptor(
  "reasoningEffort",
  [
    { id: "high", label: "High" },
    { id: "max", label: "Max" },
  ],
  "high",
);
const CONTEXT_WINDOW = selectDescriptor(
  "contextWindow",
  [
    { id: "200k", label: "200k" },
    { id: "1m", label: "1M" },
  ],
  "1m",
);

const CODEX = ProviderDriverKind.make("codex");
const OMP = ProviderDriverKind.make("omp");

function displayFor(
  provider: ProviderDriverKind,
  descriptors: ReadonlyArray<ProviderOptionDescriptor>,
) {
  return buildTraitsTriggerDisplay({
    provider,
    descriptors,
    primarySelectDescriptorId: "reasoningEffort",
    ultrathinkPromptControlled: false,
  });
}

function display(descriptors: ReadonlyArray<ProviderOptionDescriptor>) {
  return displayFor(CODEX, descriptors);
}

describe("buildTraitsTriggerDisplay", () => {
  it("keeps reasoning effort labels in English", () => {
    expect(reasoningEffortOptionLabel("low", "Низкая")).toBe("Low");
    expect(reasoningEffortOptionLabel("medium", "Средняя")).toBe("Medium");
    expect(reasoningEffortOptionLabel("high", "Высокая")).toBe("High");
    expect(reasoningEffortOptionLabel("xhigh", "Очень высокая")).toBe("Extra High");
    expect(reasoningEffortOptionLabel("max", "Максимальная")).toBe("Max");
  });

  it("omits fast mode from the label entirely when it is off", () => {
    expect(display([EFFORT, fastModeDescriptor(false), CONTEXT_WINDOW])).toEqual({
      label: "High · 1M",
      showFastModeIcon: false,
    });
  });

  it("shows the bolt instead of a text label when fast mode is on", () => {
    expect(display([EFFORT, fastModeDescriptor(true), CONTEXT_WINDOW])).toEqual({
      label: "High · 1M",
      showFastModeIcon: true,
    });
  });

  it("renders Codex's Standard and Fast service tiers as fast mode", () => {
    const serviceTier = selectDescriptor(
      "serviceTier",
      [
        { id: "default", label: "Standard", isDefault: true },
        { id: "priority", label: "Fast" },
      ],
      "default",
    );

    expect(display([EFFORT, serviceTier])).toEqual({
      label: "High",
      showFastModeIcon: false,
    });
    expect(display([EFFORT, { ...serviceTier, currentValue: "priority" }])).toEqual({
      label: "High",
      showFastModeIcon: true,
    });
  });

  it("renders OMP Codex's Fast service tier with the bolt", () => {
    const serviceTier = selectDescriptor(
      "serviceTier",
      [
        { id: "default", label: "Standard", isDefault: true },
        { id: "priority", label: "Fast" },
      ],
      "priority",
    );

    expect(displayFor(OMP, [EFFORT, serviceTier])).toEqual({
      label: "High",
      showFastModeIcon: true,
    });
  });

  it("keeps Service Tier option labels in English in the menu", () => {
    const serviceTier = selectDescriptor(
      "serviceTier",
      [
        { id: "default", label: "Standard", isDefault: true },
        { id: "priority", label: "Fast" },
      ],
      "default",
    );

    const markup = renderToStaticMarkup(
      createElement(
        Menu,
        null,
        createElement(TraitsMenuContent, {
          provider: OMP,
          models: modelWith([serviceTier]),
          model: "test-model",
          prompt: "",
          onPromptChange: () => {},
          onModelOptionsChange: () => {},
        }),
      ),
    );

    expect(markup).toContain('data-i18n-skip="true">Standard</span>');
    expect(markup).toContain('data-i18n-skip="true">Fast</span>');
  });

  it("keeps non-fastMode booleans as text labels", () => {
    const thinking: Extract<ProviderOptionDescriptor, { type: "boolean" }> = {
      id: "thinking",
      label: "Thinking",
      type: "boolean",
      currentValue: true,
    };
    expect(display([EFFORT, thinking])).toEqual({
      label: "High · Thinking On",
      showFastModeIcon: false,
    });
  });

  it("falls back to a text label when fast mode is the only trait", () => {
    expect(display([fastModeDescriptor(true)])).toEqual({
      label: "Fast",
      showFastModeIcon: false,
    });
    expect(display([fastModeDescriptor(false)])).toEqual({
      label: "Normal",
      showFastModeIcon: false,
    });
  });

  it("stays blank when descriptors resolve to no label and there is no fast mode", () => {
    // A select with neither a currentValue nor an isDefault option yields no
    // label. Without a fastMode descriptor present that must stay blank rather
    // than falling through to a bogus "Normal".
    const unresolved: Extract<ProviderOptionDescriptor, { type: "select" }> = {
      id: "effort",
      label: "effort",
      type: "select",
      options: [
        { id: "low", label: "Low" },
        { id: "high", label: "High" },
      ],
    };
    expect(display([unresolved])).toEqual({ label: "", showFastModeIcon: false });
  });

  it("still renders the prompt-controlled ultrathink label alongside the bolt", () => {
    expect(
      buildTraitsTriggerDisplay({
        provider: CODEX,
        descriptors: [EFFORT, fastModeDescriptor(true)],
        primarySelectDescriptorId: "reasoningEffort",
        ultrathinkPromptControlled: true,
      }),
    ).toEqual({ label: "Ultrathink", showFastModeIcon: true });
  });
});
