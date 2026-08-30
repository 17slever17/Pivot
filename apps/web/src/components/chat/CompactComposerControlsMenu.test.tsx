import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

import { Select } from "../ui/select";
import { CompactComposerControlsMenu } from "./CompactComposerControlsMenu";

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (!isValidElement(node)) return "";
  return textOf((node as ReactElement<{ children?: ReactNode }>).props.children);
}

describe("CompactComposerControlsMenu", () => {
  it("keeps agent mode as a visible compact control instead of hiding it in More", () => {
    type CompactProps = Parameters<typeof CompactComposerControlsMenu>[0];
    const props: CompactProps = {
      interactionMode: "default",
      agentMode: "single",
      agentModeChangeDisabled: false,
      runtimeMode: "full-access",
      showInteractionModeToggle: true,
      onToggleInteractionMode: vi.fn(),
      onAgentModeChange: vi.fn(),
      onRuntimeModeChange: vi.fn(),
    };
    const output = (
      CompactComposerControlsMenu as unknown as {
        type: (props: CompactProps) => ReactElement<{ children?: ReactNode }>;
      }
    ).type(props);
    const children = Children.toArray(output.props.children);
    const agentSelect = children[0] as ReactElement<{ children?: ReactNode }>;
    const agentTrigger = Children.toArray(agentSelect.props.children)[0] as ReactElement<{
      "aria-label"?: string;
      children?: ReactNode;
    }>;
    const moreMenu = children[1] as ReactElement<{ children?: ReactNode }>;

    expect(agentSelect.type).toBe(Select);
    expect(agentTrigger.props["aria-label"]).toBe("Agent mode");
    expect(textOf(agentTrigger.props.children)).toContain("Single");
    expect(JSON.stringify(moreMenu.props.children)).not.toContain("Agent mode");
  });
});
