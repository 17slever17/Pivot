import type { RuntimeSubagent } from "@t3tools/client-runtime/state/subagentRuntime";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  closeAgentTranscriptTab,
  createSubagentTranscriptSync,
  formatAgentActivityText,
  formatOmpTranscriptEntry,
  formatOmpTranscriptMessage,
  openAgentTranscriptTab,
  resolveParentActionOutcome,
  SUBAGENT_TRANSCRIPT_FALLBACK_INTERVAL_MS,
} from "./AgentsPanel";

afterEach(() => {
  vi.useRealTimers();
});

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

describe("formatOmpTranscriptEntry", () => {
  it("keeps non-message OMP entries in the journal", () => {
    expect(
      formatOmpTranscriptEntry({
        type: "tool_call",
        name: "read",
        arguments: { path: "src/index.ts" },
      }),
    ).toContain("tool_call");
  });

  it("renders provider-supplied reasoning summaries without requiring raw fields", () => {
    expect(
      formatOmpTranscriptEntry({
        type: "message",
        message: {
          role: "assistant",
          content: [{ type: "thinking", thinking: "Checking the dependency graph" }],
        },
      }),
    ).toBe("assistant: Reasoning summary: Checking the dependency graph");
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

describe("agent transcript tabs", () => {
  it("opens distinct agents while preserving earlier transcript tabs", () => {
    const first = openAgentTranscriptTab({ openIds: [], activeId: null }, "worker");
    const second = openAgentTranscriptTab(first, "reviewer");

    expect(second).toEqual({ openIds: ["worker", "reviewer"], activeId: "reviewer" });
    expect(openAgentTranscriptTab(second, "worker")).toEqual({
      openIds: ["worker", "reviewer"],
      activeId: "worker",
    });
  });

  it("selects a neighboring tab or the list when the active tab closes", () => {
    const state = { openIds: ["worker", "reviewer", "scout"], activeId: "reviewer" } as const;
    expect(closeAgentTranscriptTab(state, "reviewer")).toEqual({
      openIds: ["worker", "scout"],
      activeId: "scout",
    });
    expect(closeAgentTranscriptTab({ openIds: ["worker"], activeId: "worker" }, "worker")).toEqual({
      openIds: [],
      activeId: null,
    });
  });

  it("does not disturb the active tab when closing another tab", () => {
    expect(
      closeAgentTranscriptTab({ openIds: ["worker", "reviewer"], activeId: "reviewer" }, "worker"),
    ).toEqual({ openIds: ["reviewer"], activeId: "reviewer" });
  });
});

describe("agent transcript synchronization", () => {
  it("wakes immediately for activity and falls back slowly until disposed", () => {
    vi.useFakeTimers();
    const poll = vi.fn();
    const sync = createSubagentTranscriptSync({ live: true, poll });

    sync.wake();
    expect(poll).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(SUBAGENT_TRANSCRIPT_FALLBACK_INTERVAL_MS - 1);
    expect(poll).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(poll).toHaveBeenCalledTimes(2);

    sync.dispose();
    vi.advanceTimersByTime(SUBAGENT_TRANSCRIPT_FALLBACK_INTERVAL_MS);
    sync.wake();
    expect(poll).toHaveBeenCalledTimes(2);
  });

  it("does not schedule or poll closed and settled transcripts", () => {
    vi.useFakeTimers();
    const poll = vi.fn();
    const closed = createSubagentTranscriptSync({ live: false, poll });

    closed.wake();
    vi.advanceTimersByTime(SUBAGENT_TRANSCRIPT_FALLBACK_INTERVAL_MS * 2);
    expect(poll).not.toHaveBeenCalled();
    closed.dispose();

    const live = createSubagentTranscriptSync({ live: true, poll });
    live.dispose();
    vi.advanceTimersByTime(SUBAGENT_TRANSCRIPT_FALLBACK_INTERVAL_MS);
    expect(poll).not.toHaveBeenCalled();
  });
});
