import type { RuntimeSubagent } from "@t3tools/client-runtime/state/subagentRuntime";
import { describe, expect, it } from "vite-plus/test";

import {
  formatAgentActivityText,
  formatOmpTranscriptMessage,
  resolveParentActionOutcome,
} from "./AgentsPanel";

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

  it("compacts multiline tool args without inventing a tool age", () => {
    const agent = {
      status: "running",
      progress: null,
      lastToolName: "bash",
      lastIntent: null,
      currentToolArgs: "python   eval.py\n--split val",
      currentToolStartMs: null,
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

    expect(formatAgentActivityText(agent, 108_000)).toBe("▸ bash python eval.py --split val");
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

describe("resolveParentActionOutcome", () => {
  it("clears steering text only after a successful parent-session steer", () => {
    expect(resolveParentActionOutcome("steer", { _tag: "Success" })).toEqual({
      clearSteerText: true,
      error: null,
    });
  });

  it("preserves steering text and exposes a failure for the parent session", () => {
    expect(resolveParentActionOutcome("steer", { _tag: "Failure" })).toEqual({
      clearSteerText: false,
      error: "Could not steer parent session.",
    });
  });

  it("reports a parent-turn stop failure without implying child control", () => {
    expect(resolveParentActionOutcome("stop", { _tag: "Failure" })).toEqual({
      clearSteerText: false,
      error: "Could not stop parent turn.",
    });
  });
});
