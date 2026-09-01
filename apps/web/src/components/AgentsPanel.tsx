/**
 * Agents right-panel surface: the fleet view over the native subagent fold,
 * and the ONLY place the roster renders (the chat carries one CTA row per
 * spawn batch).
 *
 * Visualization rules (from live-test feedback):
 * - Spawn order is stable. Activity and completion update rows in place.
 * - Agent rows reserve three fixed lines for identity, activity, and metrics;
 *   changing data must never change their height.
 * - Workflow expansion is presentation state. A live run stays expanded when
 *   it settles; older collapsed runs can still be opened at run granularity.
 * - Static status dots, DOM-write elapsed timers, plain token counters.
 * - Clicking an agent opens a read-only omp transcript pane with parent-session controls.
 */
import { useAtomValue } from "@effect/atom-react";
import type {
  AgentPanelModel,
  AgentPanelWorkflowGroup,
  RuntimeSubagent,
} from "@t3tools/client-runtime/state/subagentRuntime";
import {
  formatSubagentModelLabel,
  formatSubagentTokenCount,
} from "@t3tools/client-runtime/state/subagentRuntime";
import type { EnvironmentId, ThreadId } from "@t3tools/contracts";
import {
  Bot,
  Braces,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { cn } from "~/lib/utils";
import { orchestrationEnvironment } from "~/state/orchestration";
import { serverEnvironment } from "~/state/server";
import { threadEnvironment } from "~/state/threads";
import { useAtomCommand } from "~/state/use-atom-command";
import { ScrollArea } from "~/components/ui/scroll-area";

type OmpTranscriptRecord = Record<string, unknown>;

export type OmpTranscriptTool = {
  readonly id: string | null;
  readonly label: string;
  /** A compact command/path preview; full arguments stay behind disclosure. */
  readonly summary?: string;
  readonly detail: string;
  readonly isError: boolean;
};

export type OmpTranscriptView =
  | {
      readonly kind: "message";
      readonly role: "user" | "assistant";
      readonly text: string;
      readonly reasoning: string;
      readonly tools: ReadonlyArray<OmpTranscriptTool>;
    }
  | {
      readonly kind: "tool";
      readonly id: string | null;
      readonly label: string;
      readonly summary?: string;
      readonly detail: string;
      readonly isError: boolean;
    }
  | {
      readonly kind: "compaction";
      readonly summary: string;
      readonly detail: string;
    }
  | {
      readonly kind: "session";
      readonly summary: string;
    }
  | {
      readonly kind: "status";
      readonly label: string;
      readonly detail: string;
    }
  | {
      readonly kind: "unknown";
      readonly label: string;
      readonly detail: string;
    }
  | { readonly kind: "hidden" };

function isOmpTranscriptRecord(value: unknown): value is OmpTranscriptRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringifyTranscriptValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 2) ?? "";
  } catch {
    return String(value);
  }
}

function transcriptTextFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (!isOmpTranscriptRecord(part)) return "";
      if (
        part.type === "thinking" ||
        part.type === "reasoning" ||
        part.type === "reasoning_text" ||
        part.type === "redactedThinking"
      ) {
        return "";
      }
      if (typeof part.text === "string") return part.text;
      return "";
    })
    .filter((part) => part.length > 0)
    .join("");
}

function transcriptReasoningFromContent(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (!isOmpTranscriptRecord(part)) return "";
      if (part.type === "thinking" && typeof part.thinking === "string") return part.thinking;
      if (
        (part.type === "reasoning" || part.type === "reasoning_text") &&
        typeof part.text === "string"
      ) {
        return part.text;
      }
      if (
        (part.type === "reasoning" || part.type === "reasoning_text") &&
        typeof part.summary === "string"
      ) {
        return part.summary;
      }
      if (part.type === "thinking" && typeof part.summary === "string") {
        return part.summary;
      }
      if (part.type === "redactedThinking") return "Reasoning unavailable.";
      return "";
    })
    .filter((part) => part.length > 0)
    .join("\n\n");
}

function compactTranscriptToolValue(value: unknown): string {
  if (typeof value !== "string") return "";
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= 180) return compact;
  return compact.slice(0, 177) + "...";
}

function readTranscriptToolField(
  sources: ReadonlyArray<unknown>,
  keys: ReadonlyArray<string>,
): string {
  for (const source of sources) {
    if (!isOmpTranscriptRecord(source)) continue;
    for (const key of keys) {
      const value = compactTranscriptToolValue(source[key]);
      if (value.length > 0) return value;
    }
  }
  return "";
}

function transcriptToolSummary(record: OmpTranscriptRecord, args: unknown, name: string): string {
  const sources = [record, args, record.input, record.result, record.details];
  const parts = [
    ["Command", ["command", "cmd", "shellCommand"]],
    ["Path", ["path", "filePath", "file", "filename"]],
    ["Query", ["query"]],
    ["Pattern", ["pattern"]],
  ] as const;
  const summary = parts
    .map(([label, keys]) => {
      const value = readTranscriptToolField(sources, keys);
      return value.length > 0 ? label + ": " + value : "";
    })
    .filter((part) => part.length > 0);
  if (summary.length > 0) return summary.join(" · ");

  if (typeof args === "string" && /^(bash|sh|shell|exec|command|terminal)$/i.test(name)) {
    const command = compactTranscriptToolValue(args);
    if (command.length > 0) return "Command: " + command;
  }
  return "";
}

function transcriptToolFromRecord(record: OmpTranscriptRecord): OmpTranscriptTool {
  const name =
    (typeof record.name === "string" && record.name) ||
    (typeof record.toolName === "string" && record.toolName) ||
    (typeof record.tool === "string" && record.tool) ||
    "unknown";
  const args = record.arguments ?? record.args ?? record.input;
  const intent = typeof record.intent === "string" ? record.intent : "";
  const partialResult = record.partialResult ?? record.result;
  const summary = transcriptToolSummary(record, args, name);
  const detailParts = [
    intent ? `Intent: ${intent}` : "",
    args === undefined ? "" : stringifyTranscriptValue(args),
    partialResult === undefined
      ? ""
      : `Partial result:\n${stringifyTranscriptValue(partialResult)}`,
  ];
  return {
    id:
      typeof record.id === "string"
        ? record.id
        : typeof record.toolCallId === "string"
          ? record.toolCallId
          : null,
    label: `Tool: ${name}`,
    ...(summary.length > 0 ? { summary } : {}),
    detail: detailParts.filter((part) => part.length > 0).join("\n\n"),
    isError: record.isError === true,
  };
}

function transcriptToolResultFromRecord(record: OmpTranscriptRecord): OmpTranscriptTool {
  const name =
    (typeof record.toolName === "string" && record.toolName) ||
    (typeof record.name === "string" && record.name) ||
    (typeof record.tool === "string" && record.tool) ||
    "unknown";
  const content = transcriptTextFromContent(record.content);
  const detailSource =
    content || record.result || record.output || record.details || record.message || record.error;
  const args = record.arguments ?? record.args ?? record.input;
  const summary = transcriptToolSummary(record, args, name);
  return {
    id:
      typeof record.toolCallId === "string"
        ? record.toolCallId
        : typeof record.id === "string"
          ? record.id
          : null,
    label: `${record.isError === true ? "Tool error" : "Tool result"}: ${name}`,
    ...(summary.length > 0 ? { summary } : {}),
    detail: stringifyTranscriptValue(detailSource),
    isError: record.isError === true,
  };
}

function transcriptMessageView(message: unknown): OmpTranscriptView {
  if (!isOmpTranscriptRecord(message)) {
    return {
      kind: "message",
      role: "assistant",
      text: transcriptTextFromContent(message),
      reasoning: "",
      tools: [],
    };
  }
  const role = message.role;
  if (role === "system" || role === "developer") return { kind: "hidden" };
  if (role === "toolResult" || role === "tool") {
    return { kind: "tool", ...transcriptToolResultFromRecord(message) };
  }
  const messageRole = role === "user" || role === "assistant" ? role : "assistant";
  const content = message.content;
  const tools = Array.isArray(content)
    ? content
        .filter(
          (part): part is OmpTranscriptRecord =>
            isOmpTranscriptRecord(part) && (part.type === "toolCall" || part.type === "tool_call"),
        )
        .map(transcriptToolFromRecord)
    : [];
  const text =
    transcriptTextFromContent(content) ||
    (typeof message.text === "string" ? message.text : "") ||
    (typeof message.output === "string" ? message.output : "");
  const reasoning = [
    transcriptReasoningFromContent(content),
    typeof message.reasoning === "string" ? message.reasoning : "",
    typeof message.reasoningSummary === "string" ? message.reasoningSummary : "",
    typeof message.thinking === "string" ? message.thinking : "",
  ]
    .filter((part) => part.length > 0)
    .filter((part, index, parts) => parts.indexOf(part) === index)
    .join("\n\n");
  return {
    kind: "message",
    role: messageRole,
    text,
    reasoning,
    tools,
  };
}

function transcriptStatusDetail(record: OmpTranscriptRecord): string {
  const values = [record.detail, record.message, record.status, record.text, record.mode];
  for (const value of values) {
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (isOmpTranscriptRecord(value) && typeof value.message === "string") return value.message;
  }
  return "";
}

function transcriptSessionSummary(record: OmpTranscriptRecord): string {
  const parts = [
    typeof record.task === "string" && record.task.length > 0 ? `Task: ${record.task}` : "",
    typeof record.agent === "string" && record.agent.length > 0 ? `Agent: ${record.agent}` : "",
    typeof record.modelRole === "string" && record.modelRole.length > 0
      ? `Role: ${record.modelRole}`
      : "",
    typeof record.resolvedModel === "string" && record.resolvedModel.length > 0
      ? `Model: ${record.resolvedModel}`
      : "",
    Array.isArray(record.tools) ? `Tools: ${record.tools.length}` : "",
  ];
  return parts.filter((part) => part.length > 0).join(" · ") || "Session initialized";
}

/**
 * Converts an OMP JSONL entry into the subset that is safe and useful in a
 * human-readable child journal. Known protocol entries never fall through to
 * raw JSON; the unknown branch is intentionally reserved for technical data.
 */
export function describeOmpTranscriptEntry(entry: unknown): OmpTranscriptView {
  if (!isOmpTranscriptRecord(entry)) {
    return { kind: "unknown", label: "Technical entry", detail: stringifyTranscriptValue(entry) };
  }
  const type = typeof entry.type === "string" ? entry.type : "";
  if (type === "message") return transcriptMessageView(entry.message);
  if (type === "assistant_message" || type === "user_message") {
    const message = isOmpTranscriptRecord(entry.message) ? entry.message : entry;
    return transcriptMessageView({
      ...message,
      role: type === "user_message" ? "user" : "assistant",
    });
  }
  if (type === "reasoning" || type === "thinking") {
    const reasoning =
      (typeof entry.text === "string" && entry.text) ||
      (typeof entry.thinking === "string" && entry.thinking) ||
      (typeof entry.summary === "string" && entry.summary) ||
      "";
    return {
      kind: "message",
      role: "assistant",
      text: "",
      reasoning,
      tools: [],
    };
  }
  if (type === "session_init") return { kind: "session", summary: transcriptSessionSummary(entry) };
  if (
    type === "session" ||
    type === "title" ||
    type === "title_change" ||
    type === "label" ||
    type === "custom" ||
    type === "custom_message"
  ) {
    return { kind: "hidden" };
  }
  if (
    type === "model_change" ||
    type === "thinking_level_change" ||
    type === "service_tier_change"
  ) {
    return { kind: "hidden" };
  }
  if (
    type === "tool_call" ||
    type === "toolCall" ||
    type === "tool_execution_start" ||
    type === "tool_execution_update"
  ) {
    return { kind: "tool", ...transcriptToolFromRecord(entry) };
  }
  if (type === "tool_result" || type === "toolResult" || type === "tool_execution_end") {
    return { kind: "tool", ...transcriptToolResultFromRecord(entry) };
  }
  if (type === "compaction") {
    const summary =
      (typeof entry.shortSummary === "string" && entry.shortSummary) ||
      (typeof entry.summary === "string" && entry.summary) ||
      "Context compacted";
    const metadata = [
      typeof entry.tokensBefore === "number" ? `Tokens before: ${entry.tokensBefore}` : "",
      typeof entry.tokensAfter === "number" ? `Tokens after: ${entry.tokensAfter}` : "",
      typeof entry.method === "string" ? `Method: ${entry.method}` : "",
      typeof entry.warning === "string" ? `Warning: ${entry.warning}` : "",
    ];
    return {
      kind: "compaction",
      summary,
      detail: metadata.filter((part) => part.length > 0).join(" · "),
    };
  }
  if (
    type === "status" ||
    type === "agent_status" ||
    type === "mode_change" ||
    type === "branch_summary"
  ) {
    return {
      kind: "status",
      label:
        type === "mode_change"
          ? "Mode changed"
          : type === "branch_summary"
            ? "Branch summary"
            : "Status",
      detail: transcriptStatusDetail(entry),
    };
  }
  return {
    kind: "unknown",
    label: type.length > 0 ? `Technical entry: ${type}` : "Technical entry",
    detail: stringifyTranscriptValue(entry),
  };
}

/** Extract plain text from an OMP transcript message for the nested pane. */
export function formatOmpTranscriptMessage(message: unknown): string {
  const view = transcriptMessageView(message);
  if (view.kind === "tool") return view.detail;
  if (view.kind !== "message") return "";
  const record = isOmpTranscriptRecord(message) ? message : null;
  const text = view.text || (typeof record?.text === "string" ? record.text : "");
  const parts = [text, view.reasoning ? `Reasoning summary: ${view.reasoning}` : ""];
  return parts.filter((part) => part.length > 0).join("\n\n");
}

/** Formats one OMP entry for callers that need a plain-text representation. */
export function formatOmpTranscriptEntry(entry: unknown): string {
  const view = describeOmpTranscriptEntry(entry);
  switch (view.kind) {
    case "message":
      return [
        `${view.role}:`,
        view.text,
        view.reasoning ? `Reasoning summary: ${view.reasoning}` : "",
        ...view.tools.map(
          (tool) =>
            tool.label +
            (tool.summary ? " · " + tool.summary : "") +
            (tool.detail ? "\n" + tool.detail : ""),
        ),
      ]
        .filter((part) => part.length > 0)
        .join(" ");
    case "tool":
      return `${view.label}${view.summary ? ` · ${view.summary}` : ""}${view.detail ? `\n${view.detail}` : ""}`;
    case "compaction":
      return `Context compacted: ${view.summary}${view.detail ? `\n${view.detail}` : ""}`;
    case "session":
      return `Session details: ${view.summary}`;
    case "status":
      return `${view.label}${view.detail ? `: ${view.detail}` : ""}`;
    case "unknown":
      return `${view.label}\n${view.detail}`;
    case "hidden":
      return "";
  }
}

function ompTranscriptEntryKey(entry: unknown, index: number): string {
  if (typeof entry === "object" && entry !== null) {
    const record = entry as Record<string, unknown>;
    if (typeof record.id === "string" && record.id.length > 0) {
      return record.id;
    }
    if (typeof record.type === "string") {
      return `${record.type}:${index}`;
    }
  }
  return `entry:${index}`;
}

function OmpTranscriptToolDetails({ tool }: { readonly tool: OmpTranscriptTool }) {
  return (
    <details
      className={cn(
        "rounded-md border border-border/40 bg-background/40 px-2 py-1 text-xs",
        tool.isError && "border-destructive/50",
      )}
    >
      <summary className="flex min-w-0 cursor-pointer select-none outline-none focus-visible:ring-1 focus-visible:ring-ring">
        <span className="shrink-0 font-medium text-muted-foreground">{tool.label}</span>
        {tool.summary ? (
          <span className="min-w-0 truncate text-foreground/80"> · {tool.summary}</span>
        ) : null}
      </summary>
      {tool.detail ? (
        <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[.7rem] leading-relaxed text-foreground/80">
          {tool.detail}
        </pre>
      ) : (
        <p className="mt-1 text-[.7rem] text-muted-foreground">No details available.</p>
      )}
    </details>
  );
}

function OmpTranscriptEntryView({ entry }: { readonly entry: unknown }) {
  const view = describeOmpTranscriptEntry(entry);
  switch (view.kind) {
    case "hidden":
      return null;
    case "message": {
      const roleLabel = view.role === "user" ? "User" : "Assistant";
      return (
        <article
          className={cn(
            "flex flex-col gap-1 rounded-md border px-2.5 py-2 text-sm",
            view.role === "user"
              ? "ml-4 border-border/40 bg-muted/30"
              : "mr-4 border-border/40 bg-background/50",
          )}
        >
          <div className="text-xs font-medium text-muted-foreground">{roleLabel}</div>
          {view.text ? (
            <p className="whitespace-pre-wrap break-words leading-relaxed">{view.text}</p>
          ) : null}
          {view.reasoning ? (
            <p className="whitespace-pre-wrap break-words leading-relaxed text-foreground/85">
              <span className="font-medium text-muted-foreground">Reasoning:</span> {view.reasoning}
            </p>
          ) : null}
          {view.tools.map((tool) => (
            <OmpTranscriptToolDetails key={tool.id ?? `${tool.label}:${tool.detail}`} tool={tool} />
          ))}
        </article>
      );
    }
    case "tool":
      return <OmpTranscriptToolDetails tool={view} />;
    case "session":
      return (
        <details className="rounded-md border border-border/40 px-2 py-1 text-xs">
          <summary className="cursor-pointer select-none text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring">
            Session details
          </summary>
          <p className="mt-1 whitespace-pre-wrap break-words text-[.7rem] leading-relaxed text-muted-foreground">
            {view.summary}
          </p>
        </details>
      );
    case "compaction":
      return (
        <details className="rounded-md border border-border/40 px-2 py-1 text-xs">
          <summary className="cursor-pointer select-none text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring">
            Context compacted: {view.summary}
          </summary>
          {view.detail ? (
            <p className="mt-1 whitespace-pre-wrap break-words text-[.7rem] leading-relaxed text-muted-foreground">
              {view.detail}
            </p>
          ) : null}
        </details>
      );
    case "status":
      return (
        <p className="whitespace-pre-wrap break-words px-0.5 py-0.5 text-sm leading-relaxed text-foreground/85">
          <span className="font-medium text-muted-foreground">{view.label}:</span>{" "}
          {view.detail || "No details available."}
        </p>
      );
    case "unknown":
      return (
        <details className="rounded-md border border-border/40 px-2 py-1 text-xs">
          <summary className="cursor-pointer select-none text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring">
            {view.label}
          </summary>
          <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[.7rem] leading-relaxed text-muted-foreground">
            {view.detail}
          </pre>
        </details>
      );
  }
}

type ParentAction = "steer" | "stop";

type ParentActionResult = { readonly _tag: "Success" } | { readonly _tag: "Failure" };

export type AgentTranscriptTabsState = {
  readonly openIds: ReadonlyArray<string>;
  readonly activeId: string | null;
};

export function openAgentTranscriptTab(
  state: AgentTranscriptTabsState,
  agentId: string,
): AgentTranscriptTabsState {
  return {
    openIds: state.openIds.includes(agentId) ? state.openIds : [...state.openIds, agentId],
    activeId: agentId,
  };
}

export function closeAgentTranscriptTab(
  state: AgentTranscriptTabsState,
  agentId: string,
): AgentTranscriptTabsState {
  const index = state.openIds.indexOf(agentId);
  if (index < 0) return state;
  const openIds = state.openIds.filter((id) => id !== agentId);
  if (state.activeId !== agentId) {
    return { openIds, activeId: state.activeId };
  }
  return {
    openIds,
    activeId: openIds[index] ?? openIds[index - 1] ?? null,
  };
}

export function resolveParentActionOutcome(
  action: ParentAction,
  result: ParentActionResult,
): { readonly clearSteerText: boolean; readonly error: string | null } {
  if (result._tag === "Success") {
    return { clearSteerText: action === "steer", error: null };
  }
  return {
    clearSteerText: false,
    error: action === "steer" ? "Could not steer parent session." : "Could not stop parent turn.",
  };
}

/**
 * OMP transcript synchronization follows the parent roster's activity
 * version, with a slow safety net for provider output that does not emit a
 * coarse activity event (for example prose-only JSONL entries). The returned
 * handle is deliberately independent of React so its lifecycle can be tested
 * without mounting the full panel.
 */
export const SUBAGENT_TRANSCRIPT_FALLBACK_INTERVAL_MS = 3_000;

export interface SubagentTranscriptSync {
  /** Fetch the next transcript page immediately after a roster activity. */
  readonly wake: () => void;
  /** Stop future fetches and release the fallback timer. */
  readonly dispose: () => void;
}

export function createSubagentTranscriptSync({
  live,
  poll,
}: {
  readonly live: boolean;
  readonly poll: () => void;
}): SubagentTranscriptSync {
  let disposed = false;
  const interval = live
    ? globalThis.setInterval(() => {
        if (!disposed) poll();
      }, SUBAGENT_TRANSCRIPT_FALLBACK_INTERVAL_MS)
    : null;

  return {
    wake: () => {
      if (!disposed && live) poll();
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      if (interval !== null) globalThis.clearInterval(interval);
    },
  };
}

export const SUBAGENT_TRANSCRIPT_BOTTOM_THRESHOLD_PX = 24;

export type SubagentTranscriptScrollMetrics = {
  readonly scrollTop: number;
  readonly scrollHeight: number;
  readonly clientHeight: number;
};

/** Whether a transcript viewport is close enough to its end to keep following. */
export function isSubagentTranscriptNearBottom(
  metrics: SubagentTranscriptScrollMetrics,
  threshold = SUBAGENT_TRANSCRIPT_BOTTOM_THRESHOLD_PX,
): boolean {
  return metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight <= Math.max(0, threshold);
}

/**
 * Translate a viewport scroll event into the follow state used by the live
 * transcript. The state is intentionally derived from the user's current
 * position, so returning to the end re-enables following without another
 * toggle or a scroll animation.
 */
export function resolveSubagentTranscriptFollowState(
  metrics: SubagentTranscriptScrollMetrics,
  threshold = SUBAGENT_TRANSCRIPT_BOTTOM_THRESHOLD_PX,
): boolean {
  return isSubagentTranscriptNearBottom(metrics, threshold);
}

/**
 * In-flight states all present as Working (one steady state, per the
 * monitoring-pill design: detail belongs in the activity sub-line, and a
 * stalled/waiting/queued subagent is still the fleet doing its job, not a
 * user problem). Only settled states differentiate.
 */
const STATUS_VISUALS: Record<RuntimeSubagent["status"], { dotClass: string; label: string }> = {
  pending: { dotClass: "bg-info", label: "Working" },
  running: { dotClass: "bg-info", label: "Working" },
  waiting: { dotClass: "bg-info", label: "Working" },
  // Idle reads as settled (muted, not sky): a resting Codex child looks done
  // unless resumed — live-test: sky idle dots read as stuck in-progress.
  idle: { dotClass: "bg-muted-foreground/50", label: "Idle · resumable" },
  completed: { dotClass: "bg-success", label: "Completed" },
  failed: { dotClass: "bg-destructive", label: "Failed" },
  cancelled: { dotClass: "bg-muted-foreground/60", label: "Stopped" },
  interrupted: { dotClass: "bg-muted-foreground/60", label: "Stopped" },
};

function StatusDot({ status }: { status: RuntimeSubagent["status"] }) {
  return (
    <span
      aria-hidden
      className={cn("size-1.5 shrink-0 rounded-full", STATUS_VISUALS[status].dotClass)}
    />
  );
}

function formatElapsedSeconds(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  if (minutes === 0) {
    return `${seconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours === 0) {
    return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
  }
  return `${hours}h ${String(minutes % 60).padStart(2, "0")}m`;
}

function elapsedBetween(startedAt: string, endIso: string | null): string {
  const start = Date.parse(startedAt);
  const end = endIso ? Date.parse(endIso) : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return "";
  }
  return formatElapsedSeconds((end - start) / 1000);
}

/**
 * Elapsed time for the current activation. Live agents self-tick via DOM
 * writes (zero React commits per tick); settled agents freeze at completedAt.
 */
function AgentElapsed({ agent }: { agent: RuntimeSubagent }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const live = agent.status === "running" || agent.status === "waiting";
  const startedAt = agent.startedAt;

  useEffect(() => {
    if (!live || !startedAt) {
      return;
    }
    const update = () => {
      if (textRef.current) {
        textRef.current.textContent = elapsedBetween(startedAt, null);
      }
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [live, startedAt]);

  if (!startedAt) {
    return null;
  }
  return (
    <span ref={textRef} className="tabular-nums">
      {elapsedBetween(startedAt, live ? null : agent.completedAt)}
    </span>
  );
}

/**
 * Status-dependent activity line. Live rows lead with what is happening now;
 * settled rows lead with the outcome. Errors are the only inline previews on
 * failed rows because they explain a red row at a glance.
 */
type AgentActivityFields = Pick<
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

function currentToolActivityText(agent: AgentActivityFields, nowMs: number): string | null {
  if (!agent.lastToolName) {
    return null;
  }
  const args = agent.currentToolArgs?.replace(/\s+/g, " ").trim();
  const tool = args ? `▸ ${agent.lastToolName} ${args}` : `▸ ${agent.lastToolName}`;
  if (agent.currentToolStartMs === null) {
    return tool;
  }
  const elapsed = formatElapsedSeconds(
    (Math.max(agent.currentToolStartMs, nowMs) - agent.currentToolStartMs) / 1000,
  );
  return `${tool} · ${elapsed}`;
}

export function formatAgentActivityText(
  agent: AgentActivityFields,
  nowMs = Date.now(),
): string | null {
  const live =
    agent.status === "running" || agent.status === "pending" || agent.status === "waiting";
  const tool = currentToolActivityText(agent, nowMs);
  if (live) {
    const intent = agent.lastIntent ?? agent.progress;
    if (intent && tool) {
      return `${intent} · ${tool}`;
    }
    return intent ?? tool ?? agent.result ?? agent.error;
  }
  return agent.error ?? agent.result ?? agent.lastIntent ?? agent.progress ?? tool;
}

/** Flat agent status line; click opens the nested omp transcript pane. */
function AgentRow({
  agent,
  selected,
  onSelect,
}: {
  agent: RuntimeSubagent;
  selected?: boolean;
  onSelect?: (agent: RuntimeSubagent) => void;
}) {
  const visuals = STATUS_VISUALS[agent.status];
  const activity = formatAgentActivityText(agent);
  const modelLabel = formatSubagentModelLabel(agent.model, agent.effort);
  const role =
    agent.role?.trim().toLocaleLowerCase() === agent.title.trim().toLocaleLowerCase()
      ? null
      : agent.role;
  const usageMetadata = [
    agent.usage ? `${formatSubagentTokenCount(agent.usage.totalTokens)} tok` : "— tok",
    agent.usage?.toolUses !== undefined ? `${agent.usage.toolUses} tools` : null,
    agent.activationCount > 1 ? `run ${agent.activationCount}` : null,
  ].filter((value): value is string => value !== null);

  const body = (
    <>
      <span className="col-start-1 row-start-1 flex items-center">
        <StatusDot status={agent.status} />
      </span>
      <span className="col-start-2 row-start-1 flex min-w-0 items-baseline gap-2">
        <span className="min-w-0 truncate text-sm font-medium">{agent.title}</span>
        {role ? (
          <span className="max-w-28 shrink-0 truncate rounded-sm border border-border/60 px-1 font-mono text-[.65rem] text-muted-foreground">
            {role}
          </span>
        ) : null}
        <span className="shrink-0 rounded-sm border border-border/60 px-1 font-mono text-[.65rem] text-muted-foreground">
          {visuals.label}
        </span>
      </span>
      <span className="col-start-3 row-start-1 min-w-14 text-right font-mono text-[.7rem] text-muted-foreground/80">
        <span className="inline-flex items-center gap-1">
          <AgentElapsed agent={agent} />
          {agent.status === "completed" ? (
            <Check aria-hidden className="size-3 text-success" />
          ) : null}
        </span>
      </span>
      <span
        className={cn(
          "col-start-2 col-end-4 row-start-2 block truncate text-xs",
          agent.status === "failed" ? "text-destructive-foreground" : "text-muted-foreground",
        )}
      >
        {activity ?? visuals.label}
      </span>
      <span
        className="col-start-2 col-end-4 row-start-3 truncate font-mono text-[.7rem] tabular-nums text-muted-foreground/70"
        title={modelLabel ?? undefined}
      >
        {modelLabel ? <span className="text-foreground/80">{modelLabel}</span> : null}
        {usageMetadata.length > 0 ? `${modelLabel ? " · " : ""}${usageMetadata.join(" · ")}` : null}
      </span>
      <span className="sr-only">{visuals.label}</span>
    </>
  );

  const className = cn(
    "grid h-[3.875rem] w-full grid-cols-[0.375rem_minmax(0,1fr)_auto] grid-rows-[1.25rem_1.125rem_1rem] items-center gap-x-2 rounded-md px-1.5 py-1 text-left",
    onSelect && "hover:bg-accent/40",
    selected && "bg-accent/50",
  );

  if (!onSelect) {
    return <div className={className}>{body}</div>;
  }

  return (
    <button type="button" onClick={() => onSelect(agent)} className={className}>
      {body}
    </button>
  );
}

function NestedSubagentTranscriptPane({
  environmentId,
  threadId,
  agent,
  onClose,
}: {
  environmentId: EnvironmentId;
  threadId: ThreadId;
  agent: RuntimeSubagent;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<ReadonlyArray<unknown>>([]);
  const [steerText, setSteerText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialReady, setInitialReady] = useState(false);
  const [parentAction, setParentAction] = useState<ParentAction | null>(null);
  const [parentActionError, setParentActionError] = useState<string | null>(null);
  const getMessages = useAtomCommand(serverEnvironment.ompGetSubagentMessages, {
    reportFailure: false,
  });
  const steer = useAtomCommand(serverEnvironment.ompSteer, { reportFailure: false });
  const interruptTurn = useAtomCommand(threadEnvironment.interruptTurn, { reportFailure: false });
  const cursorRef = useRef(0);
  const sessionFileRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const loadGenerationRef = useRef(0);
  const transcriptSyncRef = useRef<SubagentTranscriptSync | null>(null);
  const transcriptScrollAreaRootRef = useRef<HTMLDivElement | null>(null);
  const transcriptViewportRef = useRef<HTMLElement | null>(null);
  const transcriptFollowRef = useRef(true);
  const transcriptLive =
    agent.status === "running" || agent.status === "pending" || agent.status === "waiting";

  const loadMessages = useCallback(
    async (mode: "initial" | "refresh" | "poll") => {
      if (mode === "poll" && inFlightRef.current) return;
      inFlightRef.current = true;
      const generation = loadGenerationRef.current + 1;
      loadGenerationRef.current = generation;
      if (mode === "initial") {
        setLoading(true);
      } else if (mode === "refresh") {
        setRefreshing(true);
      }
      setError(null);
      let result;
      try {
        const fromByte = mode === "initial" ? undefined : cursorRef.current;
        result = await getMessages({
          environmentId,
          input: {
            threadId,
            subagentId: agent.id,
            ...(fromByte === undefined ? {} : { fromByte }),
          },
        });
      } catch {
        if (generation !== loadGenerationRef.current) {
          inFlightRef.current = false;
          return;
        }
        setError("Failed to load transcript");
        setLoading(false);
        if (mode === "refresh") setRefreshing(false);
        inFlightRef.current = false;
        return;
      }
      if (generation !== loadGenerationRef.current) {
        inFlightRef.current = false;
        return;
      }
      if (result._tag === "Success") {
        const nextEntries = Array.isArray(result.value.entries)
          ? result.value.entries
          : result.value.messages;
        const sessionFile = result.value.sessionFile || null;
        const sessionChanged =
          sessionFileRef.current !== null &&
          sessionFile !== null &&
          sessionFileRef.current !== sessionFile;
        sessionFileRef.current = sessionFile;
        cursorRef.current = result.value.nextByte;
        if (mode === "initial" || result.value.reset || sessionChanged) {
          setEntries(nextEntries);
        } else if (nextEntries.length > 0) {
          setEntries((current) => [...current, ...nextEntries]);
        }
        setError(null);
      } else {
        setError("Failed to load transcript");
      }
      setLoading(false);
      if (mode === "refresh") setRefreshing(false);
      inFlightRef.current = false;
    },
    [agent.id, environmentId, getMessages, threadId],
  );

  useEffect(() => {
    let cancelled = false;
    setInitialReady(false);
    transcriptFollowRef.current = true;
    cursorRef.current = 0;
    sessionFileRef.current = null;
    setEntries([]);
    void (async () => {
      await loadMessages("initial");
      if (cancelled) {
        return;
      }
      setInitialReady(true);
    })();
    return () => {
      cancelled = true;
      loadGenerationRef.current += 1;
      inFlightRef.current = false;
    };
  }, [agent.id, environmentId, loadMessages, threadId]);

  // OMP tails the child JSONL by byte offset. Activity/status folds update
  // RuntimeSubagent.updatedAt, so transcript pages wake immediately while the
  // open live pane is active. The fallback picks up prose-only messages and
  // tool/status entries even when no coarse task activity event was emitted.
  // Requests remain single-flight inside loadMessages.
  useEffect(() => {
    if (!initialReady) return;
    const sync = createSubagentTranscriptSync({
      live: transcriptLive,
      poll: () => void loadMessages("poll"),
    });
    transcriptSyncRef.current = sync;
    return () => {
      sync.dispose();
      if (transcriptSyncRef.current === sync) transcriptSyncRef.current = null;
    };
  }, [initialReady, loadMessages, transcriptLive]);

  useEffect(() => {
    if (!initialReady || !transcriptLive) return;
    // updatedAt is the fold's activity/status version, not a wall-clock tick.
    transcriptSyncRef.current?.wake();
  }, [agent.status, agent.updatedAt, initialReady, transcriptLive]);

  useEffect(() => {
    const viewport = transcriptScrollAreaRootRef.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    if (!viewport) return;
    transcriptViewportRef.current = viewport;
    const handleScroll = () => {
      transcriptFollowRef.current = resolveSubagentTranscriptFollowState({
        scrollTop: viewport.scrollTop,
        scrollHeight: viewport.scrollHeight,
        clientHeight: viewport.clientHeight,
      });
    };
    viewport.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      viewport.removeEventListener("scroll", handleScroll);
      if (transcriptViewportRef.current === viewport) transcriptViewportRef.current = null;
    };
  }, [agent.id]);

  useLayoutEffect(() => {
    if (!transcriptFollowRef.current) return;
    const viewport = transcriptViewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [entries]);

  const live = transcriptLive;

  const handleSteerParent = async () => {
    const message = steerText.trim();
    if (!live || parentAction !== null || message.length === 0) return;
    setParentAction("steer");
    setParentActionError(null);
    try {
      const result = await steer({ environmentId, input: { threadId, message } });
      const outcome = resolveParentActionOutcome("steer", result);
      if (outcome.clearSteerText) {
        setSteerText("");
      }
      setParentActionError(outcome.error);
    } catch {
      setParentActionError("Could not steer parent session.");
    } finally {
      setParentAction(null);
    }
  };

  const handleStopParent = async () => {
    if (!live || parentAction !== null) return;
    setParentAction("stop");
    setParentActionError(null);
    try {
      const result = await interruptTurn({ environmentId, input: { threadId } });
      setParentActionError(resolveParentActionOutcome("stop", result).error);
    } catch {
      setParentActionError("Could not stop parent turn.");
    } finally {
      setParentAction(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-border/60">
      <div className="flex items-center gap-2 border-b border-border/50 px-2 py-1.5">
        <span className="min-w-0 truncate text-xs font-medium" title={agent.title}>
          {agent.title}
        </span>
        <span
          className="min-w-0 truncate font-mono text-[.65rem] text-muted-foreground"
          title={formatSubagentModelLabel(agent.model, agent.effort) ?? undefined}
        >
          {formatSubagentModelLabel(agent.model, agent.effort)}
        </span>
        <span className="shrink-0 rounded-sm border border-border/60 px-1 font-mono text-[.65rem] text-muted-foreground">
          {STATUS_VISUALS[agent.status].label}
        </span>
        <span className="hidden text-[.65rem] text-muted-foreground sm:inline">
          Parent session controls
        </span>
        <button
          type="button"
          onClick={() => void loadMessages("refresh")}
          disabled={loading || refreshing}
          aria-label="Refresh transcript"
          className="inline-flex items-center gap-1 rounded-sm border border-border/60 px-1.5 py-0.5 text-[.65rem] text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <RefreshCw aria-hidden className="size-3" />
          {refreshing ? "Refreshing transcript…" : "Refresh transcript"}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close transcript"
          className="ml-auto text-muted-foreground hover:text-foreground"
        >
          <X aria-hidden className="size-3" />
        </button>
      </div>
      <div ref={transcriptScrollAreaRootRef} className="min-h-0 flex-1">
        <ScrollArea className="size-full">
          <div className="flex flex-col gap-2 p-2">
            {loading && entries.length === 0 ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : error && entries.length === 0 ? (
              <p className="text-xs text-destructive-foreground">{error}</p>
            ) : entries.length === 0 ? (
              <p className="text-xs text-muted-foreground">No messages yet.</p>
            ) : (
              <>
                {entries.map((entry, index) => (
                  <OmpTranscriptEntryView key={ompTranscriptEntryKey(entry, index)} entry={entry} />
                ))}
                {error ? <p className="text-xs text-destructive-foreground">{error}</p> : null}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
      <div className="flex flex-col gap-1.5 border-t border-border/50 p-2">
        <p className="text-[.65rem] leading-4 text-muted-foreground">
          Child model and effort are selected at spawn; this OMP API cannot change them after
          launch.
        </p>
        {parentActionError ? (
          <p role="alert" className="text-xs text-destructive-foreground">
            {parentActionError}
          </p>
        ) : null}
        <div className="flex gap-1.5">
          <input
            value={steerText}
            onChange={(event) => setSteerText(event.target.value)}
            placeholder="Message for parent session…"
            className="min-w-0 flex-1 rounded-md border border-border/60 bg-background px-2 py-1 text-xs"
            disabled={!live || parentAction !== null}
          />
          <button
            type="button"
            disabled={!live || parentAction !== null || steerText.trim().length === 0}
            aria-label="Steer parent session"
            className="rounded-md border border-border/60 px-2 text-xs disabled:opacity-40"
            onClick={() => void handleSteerParent()}
          >
            {parentAction === "steer" ? "Steering…" : "Steer parent"}
          </button>
          <button
            type="button"
            disabled={!live || parentAction !== null}
            aria-label="Stop parent turn"
            className="rounded-md border border-border/60 px-2 text-xs disabled:opacity-40"
            onClick={() => void handleStopParent()}
          >
            {parentAction === "stop" ? "Stopping parent turn…" : "Stop parent turn"}
          </button>
        </div>
      </div>
    </div>
  );
}

function workflowIsLive(group: AgentPanelWorkflowGroup): boolean {
  const status = group.workflow.status;
  return (
    status !== "completed" &&
    status !== "failed" &&
    status !== "cancelled" &&
    status !== "interrupted"
  );
}

function workflowMembers(group: AgentPanelWorkflowGroup): ReadonlyArray<RuntimeSubagent> {
  return [...group.phases.flatMap((phase) => phase.members), ...group.unphasedMembers];
}

/**
 * Phase rail: the run's shape at a glance. One segment per phase in order,
 * separated by chevrons; each segment shows title + one dot per member.
 * The whole arc (done → live → pending) is visible without scrolling the
 * member list.
 */
function PhaseRail({ group }: { group: AgentPanelWorkflowGroup }) {
  if (group.phases.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1 px-1.5 pb-1 pt-1.5">
      {group.phases.map((phase, index) => (
        <div key={phase.index} className="flex items-center gap-1">
          {index > 0 ? (
            <ChevronRight aria-hidden className="size-3 text-muted-foreground/40" />
          ) : null}
          <div
            className={cn(
              "flex items-center gap-1 rounded-sm border px-1.5 py-0.5",
              phase.state === "running"
                ? "border-info/40"
                : phase.state === "done"
                  ? "border-success/30"
                  : "border-border/50",
            )}
          >
            <span
              className={cn(
                "font-mono text-[.65rem]",
                phase.state === "running"
                  ? "text-info-foreground"
                  : phase.state === "done"
                    ? "text-success-foreground"
                    : "text-muted-foreground/70",
              )}
            >
              {phase.state === "done" ? "✓ " : ""}
              {phase.title}
            </span>
            <span className="flex items-center gap-0.5">
              {phase.members.length === 0 ? (
                <span className="font-mono text-[.6rem] text-muted-foreground/50">–</span>
              ) : (
                phase.members.map((member) => <StatusDot key={member.id} status={member.status} />)
              )}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Read-only workflow script viewer, fetched through the contained
 * getWorkflowScript RPC (never a raw filesystem read from the client).
 */
function WorkflowScriptView({
  environmentId,
  threadId,
  scriptPath,
  onClose,
}: {
  environmentId: EnvironmentId;
  threadId: ThreadId;
  scriptPath: string;
  onClose: () => void;
}) {
  const result = useAtomValue(
    orchestrationEnvironment.workflowScript({ environmentId, input: { threadId, scriptPath } }),
  );
  return (
    <div className="mx-1.5 mb-1 rounded-md border border-border/60 bg-background/60">
      <div className="flex items-center gap-2 border-b border-border/50 px-2 py-1">
        <Braces aria-hidden className="size-3 text-muted-foreground" />
        <span className="truncate font-mono text-[.65rem] text-muted-foreground">
          {scriptPath.split("/").at(-1)}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close script"
          className="ml-auto text-muted-foreground hover:text-foreground"
        >
          <X aria-hidden className="size-3" />
        </button>
      </div>
      <div className="max-h-72 overflow-auto p-2">
        {result._tag === "Success" ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-[.7rem] leading-relaxed text-foreground/90">
            {result.value.contents}
            {result.value.truncated ? "\n… (truncated)" : ""}
          </pre>
        ) : result._tag === "Failure" ? (
          <p className="text-xs text-destructive-foreground">Could not load the script.</p>
        ) : (
          <p className="text-xs text-muted-foreground">Loading…</p>
        )}
      </div>
    </div>
  );
}

/**
 * Collapsible phase section. A phase opens when it becomes active, then keeps
 * that shape as it settles so completion never yanks rows out from under the
 * user. Manual toggles stick until a later activation begins.
 */
function PhaseSection({
  phase,
  defaultOpen = false,
  selectedAgentId,
  onSelectAgent,
}: {
  phase: AgentPanelWorkflowGroup["phases"][number];
  defaultOpen?: boolean;
  selectedAgentId?: string | null;
  onSelectAgent?: (agent: RuntimeSubagent) => void;
}) {
  const [open, setOpen] = useState(defaultOpen || phase.state === "running");
  const previousState = useRef(phase.state);

  useEffect(() => {
    if (previousState.current !== "running" && phase.state === "running") {
      setOpen(true);
    }
    previousState.current = phase.state;
  }, [phase.state]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          "mt-2 flex w-full items-center gap-1.5 rounded-sm px-1.5 text-left text-[.65rem] font-medium uppercase tracking-wider hover:bg-accent/40",
          phase.state === "done"
            ? "text-success-foreground"
            : phase.state === "running"
              ? "text-info-foreground"
              : "text-muted-foreground/70",
        )}
      >
        {open ? (
          <ChevronDown aria-hidden className="size-3 shrink-0" />
        ) : (
          <ChevronRight aria-hidden className="size-3 shrink-0" />
        )}
        {phase.state === "done" ? <Check aria-hidden className="size-3" /> : null}
        <span>{phase.title}</span>
        <span className="font-normal normal-case text-muted-foreground/70">
          {phase.state === "pending" && phase.members.length === 0
            ? "pending"
            : phase.state === "done"
              ? `${phase.settledCount} done`
              : `${phase.activeCount} active · ${phase.settledCount} done`}
        </span>
        {!open && phase.members.length > 0 ? (
          <span className="ml-auto flex items-center gap-0.5">
            {phase.members.map((member) => (
              <StatusDot key={member.id} status={member.status} />
            ))}
          </span>
        ) : null}
      </button>
      {open
        ? phase.members.map((member) => (
            <AgentRow
              key={member.id}
              agent={member}
              selected={selectedAgentId === member.id}
              {...(onSelectAgent ? { onSelect: onSelectAgent } : {})}
            />
          ))
        : null}
    </div>
  );
}

/** Expanded workflow: phase rail + full phase tree. */
function ExpandedWorkflowSection({
  group,
  environmentId,
  threadId,
  selectedAgentId,
  onSelectAgent,
  onCollapse,
}: {
  group: AgentPanelWorkflowGroup;
  environmentId: EnvironmentId | null;
  threadId: ThreadId | null;
  selectedAgentId?: string | null;
  onSelectAgent?: (agent: RuntimeSubagent) => void;
  onCollapse: () => void;
}) {
  const [scriptOpen, setScriptOpen] = useState(false);
  const members = workflowMembers(group);
  const settled = members.filter(
    (member) =>
      member.status === "completed" ||
      member.status === "failed" ||
      member.status === "cancelled" ||
      member.status === "interrupted",
  ).length;
  const scriptPath = group.workflow.runHandles?.scriptPath;
  const canShowScript = scriptPath !== undefined && environmentId !== null && threadId !== null;
  return (
    <section className="rounded-lg border border-border/50 bg-card/30 p-1.5">
      <div className="flex items-center gap-2 px-1.5 pt-0.5 text-[.65rem] font-medium uppercase tracking-wider text-muted-foreground">
        <StatusDot status={group.workflow.status} />
        <span className="min-w-0 truncate">
          {group.workflow.workflowName ?? group.workflow.title}
        </span>
        {canShowScript ? (
          <button
            type="button"
            onClick={() => setScriptOpen((value) => !value)}
            className={cn(
              "rounded-sm border border-border/60 px-1 font-mono normal-case hover:text-foreground",
              scriptOpen && "text-foreground",
            )}
            aria-expanded={scriptOpen}
          >
            {"{}"} script
          </button>
        ) : null}
        <span className="ml-auto font-mono normal-case text-muted-foreground/80">
          {settled}/{members.length} settled
        </span>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse workflow"
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronDown aria-hidden className="size-3" />
        </button>
      </div>
      <PhaseRail group={group} />
      {scriptOpen && canShowScript ? (
        <WorkflowScriptView
          environmentId={environmentId}
          threadId={threadId}
          scriptPath={scriptPath}
          onClose={() => setScriptOpen(false)}
        />
      ) : null}
      {group.phases.map((phase) => (
        <PhaseSection
          key={phase.index}
          phase={phase}
          defaultOpen={!workflowIsLive(group)}
          {...(selectedAgentId !== undefined ? { selectedAgentId } : {})}
          {...(onSelectAgent ? { onSelectAgent } : {})}
        />
      ))}
      {group.unphasedMembers.map((member) => (
        <AgentRow
          key={member.id}
          agent={member}
          selected={selectedAgentId === member.id}
          {...(onSelectAgent ? { onSelect: onSelectAgent } : {})}
        />
      ))}
      {group.phases.length === 0 && group.unphasedMembers.length === 0 ? (
        <AgentRow
          agent={group.workflow}
          selected={selectedAgentId === group.workflow.id}
          {...(onSelectAgent ? { onSelect: onSelectAgent } : {})}
        />
      ) : null}
    </section>
  );
}

/**
 * Collapsed workflow: one summary line. The parent owns expansion so a live
 * workflow keeps its shape when it settles.
 */
function CollapsedWorkflowSection({
  group,
  onExpand,
}: {
  group: AgentPanelWorkflowGroup;
  onExpand: () => void;
}) {
  const members = workflowMembers(group);
  const failed = members.filter((member) => member.status === "failed").length;
  // Coordinator usage may already aggregate members (panel-footer rule):
  // count it only when there are no member rows to sum.
  const totalTokens = members.reduce(
    (sum, member) => sum + (member.usage?.totalTokens ?? 0),
    members.length === 0 ? (group.workflow.usage?.totalTokens ?? 0) : 0,
  );
  const elapsed =
    group.workflow.startedAt && group.workflow.completedAt
      ? elapsedBetween(group.workflow.startedAt, group.workflow.completedAt)
      : null;
  return (
    <section>
      <button
        type="button"
        onClick={onExpand}
        className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-accent/40"
        aria-expanded={false}
      >
        <StatusDot status={failed > 0 ? "failed" : group.workflow.status} />
        <span className="truncate text-sm">
          {group.workflow.workflowName ?? group.workflow.title}
        </span>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[.7rem] text-muted-foreground/80">
          {failed > 0 ? <span className="text-destructive-foreground">{failed} failed</span> : null}
          <span>{members.length} agents</span>
          <span className="tabular-nums">· {formatSubagentTokenCount(totalTokens)} tok</span>
          {elapsed ? <span className="tabular-nums">· {elapsed}</span> : null}
          <ChevronRight aria-hidden className="size-3" />
        </span>
      </button>
    </section>
  );
}

/** A workflow's open state is presentation state, not a status derivative. */
function WorkflowSection({
  group,
  environmentId,
  threadId,
  selectedAgentId,
  onSelectAgent,
}: {
  group: AgentPanelWorkflowGroup;
  environmentId: EnvironmentId | null;
  threadId: ThreadId | null;
  selectedAgentId?: string | null;
  onSelectAgent?: (agent: RuntimeSubagent) => void;
}) {
  const [open, setOpen] = useState(() => workflowIsLive(group));
  return open ? (
    <ExpandedWorkflowSection
      group={group}
      environmentId={environmentId}
      threadId={threadId}
      {...(selectedAgentId !== undefined ? { selectedAgentId } : {})}
      {...(onSelectAgent ? { onSelectAgent } : {})}
      onCollapse={() => setOpen(false)}
    />
  ) : (
    <CollapsedWorkflowSection group={group} onExpand={() => setOpen(true)} />
  );
}

export function AgentsPanel({
  model,
  environmentId = null,
  threadId = null,
}: {
  model: AgentPanelModel;
  environmentId?: EnvironmentId | null;
  threadId?: ThreadId | null;
}) {
  const [transcriptTabs, setTranscriptTabs] = useState<AgentTranscriptTabsState>({
    openIds: [],
    activeId: null,
  });
  const agents = [
    ...model.directAgents,
    ...model.workflows.flatMap((group) => [group.workflow, ...workflowMembers(group)]),
  ];
  const activeAgent = agents.find((agent) => agent.id === transcriptTabs.activeId) ?? null;
  const canOpenTranscript = environmentId !== null && threadId !== null && activeAgent !== null;
  const tabAgents = transcriptTabs.openIds
    .map((id) => agents.find((agent) => agent.id === id) ?? null)
    .filter((agent): agent is RuntimeSubagent => agent !== null);
  const openTranscript = useCallback(
    (agent: RuntimeSubagent) => {
      if (environmentId === null || threadId === null) return;
      setTranscriptTabs((state) => openAgentTranscriptTab(state, agent.id));
    },
    [environmentId, threadId],
  );
  const closeTranscript = useCallback((agentId: string) => {
    setTranscriptTabs((state) => closeAgentTranscriptTab(state, agentId));
  }, []);
  const returnToAgentList = useCallback(() => {
    setTranscriptTabs((state) => ({ ...state, activeId: null }));
  }, []);

  if (!model.hasAgents) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <Bot aria-hidden className="size-6 text-muted-foreground/60" />
        <p className="text-sm font-medium">No agents yet</p>
        <p className="max-w-56 text-xs text-muted-foreground">
          When this thread spawns subagents or runs a workflow, they show up here with live status,
          activity, and token usage.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {canOpenTranscript ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-w-0 items-center gap-1 border-b border-border/60 px-1.5 py-1">
            <button
              type="button"
              onClick={returnToAgentList}
              aria-label="Back to agents list"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/40 hover:text-foreground"
            >
              <ChevronLeft aria-hidden className="size-4" />
            </button>
            <div
              role="tablist"
              aria-label="Open agent transcripts"
              className="flex min-w-0 flex-1 gap-1 overflow-x-auto"
            >
              {tabAgents.map((agent) => (
                <div
                  key={agent.id}
                  role="presentation"
                  className={cn(
                    "flex min-w-0 max-w-44 shrink-0 items-center rounded-md border border-border/50",
                    agent.id === transcriptTabs.activeId && "border-border bg-accent/40",
                  )}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={agent.id === transcriptTabs.activeId}
                    onClick={() =>
                      setTranscriptTabs((state) => openAgentTranscriptTab(state, agent.id))
                    }
                    className="min-w-0 flex-1 truncate px-2 py-1 text-left text-[.7rem] text-muted-foreground hover:text-foreground"
                    title={agent.title}
                  >
                    {agent.title}
                  </button>
                  <button
                    type="button"
                    aria-label={`Close ${agent.title} transcript`}
                    onClick={() => closeTranscript(agent.id)}
                    className="inline-flex size-6 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    <X aria-hidden className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <NestedSubagentTranscriptPane
            key={activeAgent.id}
            environmentId={environmentId}
            threadId={threadId}
            agent={activeAgent}
            onClose={() => closeTranscript(activeAgent.id)}
          />
        </div>
      ) : null}
      {!canOpenTranscript ? (
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-2 p-2">
            {model.workflows.map((group) => (
              <WorkflowSection
                key={group.workflow.id}
                group={group}
                environmentId={environmentId}
                threadId={threadId}
                selectedAgentId={transcriptTabs.activeId}
                onSelectAgent={openTranscript}
              />
            ))}
            {model.directAgents.length > 0 ? (
              <section>
                <div className="px-1.5 pt-1 text-[.65rem] font-medium uppercase tracking-wider text-muted-foreground">
                  Direct spawns
                </div>
                {model.directAgents.map((agent) => (
                  <AgentRow
                    key={agent.id}
                    agent={agent}
                    selected={transcriptTabs.activeId === agent.id}
                    onSelect={openTranscript}
                  />
                ))}
              </section>
            ) : null}
          </div>
        </ScrollArea>
      ) : null}
      <footer className="flex items-center justify-between border-t border-border/60 px-3 py-1.5 font-mono text-[.7rem] text-muted-foreground">
        <span className="flex items-center gap-2">
          {model.runningCount + model.waitingCount > 0 ? (
            <span className="text-info-foreground">
              ● {model.runningCount + model.waitingCount} working
            </span>
          ) : null}
          {model.idleCount > 0 ? <span>{model.idleCount} idle</span> : null}
          {model.settledCount > 0 ? <span>{model.settledCount} settled</span> : null}
        </span>
        <span className="tabular-nums">Σ {formatSubagentTokenCount(model.totalTokens)} tok</span>
      </footer>
    </div>
  );
}
