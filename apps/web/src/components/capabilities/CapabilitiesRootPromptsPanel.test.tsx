import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

import { RootPromptBundlesEditor } from "./CapabilitiesRootPromptsPanel";

function containsAriaLabel(node: ReactNode, label: string): boolean {
  if (Array.isArray(node)) return node.some((child) => containsAriaLabel(child, label));
  if (!isValidElement(node)) return false;
  const element = node as ReactElement<{ "aria-label"?: string; children?: ReactNode }>;
  return element.props["aria-label"] === label || containsAriaLabel(element.props.children, label);
}

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (!isValidElement(node)) return "";
  return textOf((node as ReactElement<{ children?: ReactNode }>).props.children);
}

describe("RootPromptBundlesEditor", () => {
  it("renders both complete alternatives and atomic save controls", () => {
    const output = RootPromptBundlesEditor({
      draft: {
        commonPrompt: "common",
        orchestratorPrompt: "common\norchestrator",
      },
      dirty: true,
      pending: false,
      error: null,
      onChange: vi.fn(),
      onCancel: vi.fn(),
      onReset: vi.fn(),
      onSave: vi.fn(),
    });

    expect(containsAriaLabel(output, "Base / Single root prompt bundle")).toBe(true);
    expect(containsAriaLabel(output, "Orchestrator root prompt bundle")).toBe(true);
    expect(textOf(output)).toContain("Save both bundles");
  });
});
