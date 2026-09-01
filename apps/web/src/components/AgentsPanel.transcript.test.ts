import type { RuntimeSubagent } from "@t3tools/client-runtime/state/subagentRuntime";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  closeAgentTranscriptTab,
  createSubagentTranscriptSync,
  describeOmpTranscriptEntry,
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
    const entry = {
      type: "tool_call",
      name: "read",
      arguments: { path: "src/index.ts" },
    };

    expect(formatOmpTranscriptEntry(entry)).toContain("Tool: read");
    expect(formatOmpTranscriptEntry(entry)).not.toContain('"tool_call"');
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

describe("describeOmpTranscriptEntry", () => {
  it("separates assistant text, reasoning, and multiple tool calls", () => {
    const view = describeOmpTranscriptEntry({
      type: "message",
      message: {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "Checking the dependency graph" },
          { type: "text", text: "I found two files." },
          { type: "toolCall", id: "call-1", name: "read", arguments: { path: "a.ts" } },
          { type: "toolCall", id: "call-2", name: "grep", arguments: { pattern: "TODO" } },
        ],
      },
    });

    expect(view).toMatchObject({
      kind: "message",
      role: "assistant",
      text: "I found two files.",
      reasoning: "Checking the dependency graph",
    });
    expect(view.kind === "message" ? view.tools.map((tool) => tool.label) : []).toEqual([
      "Tool: read",
      "Tool: grep",
    ]);
  });

  it("renders user content arrays as a normal user message", () => {
    expect(
      describeOmpTranscriptEntry({
        type: "message",
        message: {
          role: "user",
          content: [{ type: "text", text: "Please inspect the worker." }],
        },
      }),
    ).toEqual({
      kind: "message",
      role: "user",
      text: "Please inspect the worker.",
      reasoning: "",
      tools: [],
    });
  });

  it("keeps tool results independently expandable and marks errors", () => {
    expect(
      describeOmpTranscriptEntry({
        type: "tool_result",
        toolName: "read",
        toolCallId: "call-1",
        content: [{ type: "text", text: "file body" }],
        isError: true,
      }),
    ).toEqual({
      kind: "tool",
      id: "call-1",
      label: "Tool error: read",
      detail: "file body",
      isError: true,
    });
  });

  it("summarizes session init without exposing the harness system prompt", () => {
    const view = describeOmpTranscriptEntry({
      type: "session_init",
      systemPrompt: "SECRET ROOT INSTRUCTIONS",
      task: "Write a harmless PowerShell command",
      tools: ["read", "bash"],
      agent: "worker",
      resolvedModel: "openai-codex/gpt-5.6-luna",
    });

    expect(view).toEqual({
      kind: "session",
      summary:
        "Task: Write a harmless PowerShell command · Agent: worker · Model: openai-codex/gpt-5.6-luna · Tools: 2",
    });
    expect(JSON.stringify(view)).not.toContain("SECRET ROOT INSTRUCTIONS");
  });

  it("hides service transitions and formats compaction/status entries", () => {
    expect(
      describeOmpTranscriptEntry({
        type: "message",
        message: { role: "developer", content: "SECRET ROOT INSTRUCTIONS" },
      }),
    ).toEqual({ kind: "hidden" });
    expect(describeOmpTranscriptEntry({ type: "model_change", model: "provider/model" })).toEqual({
      kind: "hidden",
    });
    expect(describeOmpTranscriptEntry({ type: "session", id: "root" })).toEqual({
      kind: "hidden",
    });
    expect(
      describeOmpTranscriptEntry({ type: "thinking_level_change", thinkingLevel: "high" }),
    ).toEqual({
      kind: "hidden",
    });
    expect(
      describeOmpTranscriptEntry({ type: "service_tier_change", serviceTier: "fast" }),
    ).toEqual({
      kind: "hidden",
    });
    expect(
      describeOmpTranscriptEntry({
        type: "compaction",
        shortSummary: "Kept the active task context",
        tokensBefore: 1200,
        tokensAfter: 400,
      }),
    ).toEqual({
      kind: "compaction",
      summary: "Kept the active task context",
      detail: "Tokens before: 1200 · Tokens after: 400",
    });
    expect(
      describeOmpTranscriptEntry({ type: "status", status: "waiting for tool result" }),
    ).toEqual({ kind: "status", label: "Status", detail: "waiting for tool result" });
  });

  it("puts unknown entries behind a technical disclosure", () => {
    const view = describeOmpTranscriptEntry({ type: "future_entry", value: 42 });
    expect(view.kind).toBe("unknown");
    expect(view.kind === "unknown" ? view.label : "").toBe("Technical entry: future_entry");
    expect(view.kind === "unknown" ? view.detail : "").toContain('"value": 42');
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
