import type { RuntimeSubagent } from "@t3tools/client-runtime/state/subagentRuntime";
import { describe, expect, it } from "vite-plus/test";

import { formatAgentActivityText, formatOmpTranscriptMessage } from "./AgentsPanel";

describe("formatAgentActivityText", () => {
  it("combines OMP intent, current tool args, and tool age", () => {
    const agent = {
      status: "running",
      progress: null,
      lastToolName: "bash",
      lastIntent: "Comparing validation tails",
      currentToolArgs: "python eval.py --split val",
      currentToolStartMs: 1_000,
      result: null,
      error: null,
    } satisfies Pick<
      RuntimeSubagent,
      | "status"
      | "progress"
      | "lastToolName"
      | "lastIntent"
      | "currentToolArgs"
      | "currentToolStartMs"
      | "result"
      | "error"
    >;

    expect(formatAgentActivityText(agent, 108_000)).toBe(
      "Comparing validation tails · ▸ bash python eval.py --split val · 1m 47s",
    );
  });
});

describe("formatOmpTranscriptMessage", () => {
  it("reads string content", () => {
    expect(formatOmpTranscriptMessage({ role: "assistant", content: "hello" })).toBe("hello");
  });

  it("joins text parts", () => {
    expect(
      formatOmpTranscriptMessage({
        content: [
          { type: "text", text: "a" },
          { type: "text", text: "b" },
        ],
      }),
    ).toBe("ab");
  });
});
