/**
 * OmpAdapter — maps omp RPC session frames onto ProviderRuntimeEvent.
 *
 * Turn completion (AC11): terminal `agent_end` (`isTerminal !== false`),
 * prompt `data.agentInvoked === false`, and `prompt_result` with
 * `agentInvoked: false`. Local slash results arrive as `command_output`
 * frames and become `status_text` deltas. Every completed assistant prose
 * run that is superseded by a later message (a rule interrupt, a trailing
 * tool call, the closing answer) is surfaced as a `reasoning` line item —
 * narration between tool calls renders as its own work-log row instead of
 * piling into the message body. Only the final run of the turn is flushed
 * as `assistant_text` at terminal completion. Empty assistant deltas are
 * not emitted (AC2).
 * Tools: `toolcall_end` / `tool_execution_*` → `item.*` (+ output deltas).
 * Thinking: `thinking_delta` → `content.delta` (`reasoning_text`).
 * Usage: `get_state.contextUsage` → `thread.token-usage.updated` on turn end.
 * Subagents (AC7): `set_subagent_subscription` + `subagent_*` → `task.*`.
 * Host UI: `extension_ui_request` confirm/select/input/editor → approval /
 * user-input events; replies via `extension_ui_response`.
 * Plan mode: on `interactionMode: "plan"` remember the current model via
 * `get_state`, `set_model` to the resolved plan role, and restore on exit.
 * While plan is active, turn `modelSelection` is ignored. The turn's final
 * text is surfaced as a proposed plan (`turn.proposed.completed`) so the
 * timeline renders the plan card.
 *
 * @module provider/omp/OmpAdapter
 */
import { ReviewBlockDecoder } from "./ReviewBlockDecoder.ts";
import { OmpCatalogDecoder } from "./OmpCatalogDecoder.ts";
import { formatOmpToolOutputText, OmpToolPresentation } from "./OmpToolPresentation.ts";
import {
  type ApprovalRequestId,
  EventId,
  OmpAgentProfileError,
  type ProviderApprovalDecision,
  type ProviderRuntimeEvent,
  type ProviderSession,
  type ProviderSessionStartInput,
  type OmpAgentProfileName,
  type OmpAgentProfileUpsertInput,
  type OmpRootPromptBundles,
  type ServerOmpAgentProfilesImportCodexResult,
  type ProviderSendTurnInput,
  type ProviderUserInputAnswers,
  RuntimeItemId,
  RuntimeRequestId,
  type RuntimeTaskStatus,
  type RuntimeTaskUsage,
  ProviderDriverKind,
  ReviewFileLineCoverage,
  RuntimeTaskId,
  type RuntimeMode,
  type ProviderTurnInteractionMode,
  ReviewFinding,
  ReviewRunVerdict,
  type ThreadId,
  TurnId,
} from "@t3tools/contracts";
import * as Cause from "effect/Cause";
import * as Clock from "effect/Clock";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Queue from "effect/Queue";
import * as Schema from "effect/Schema";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";

import {
  ProviderAdapterProcessError,
  ProviderAdapterRequestError,
  ProviderAdapterSessionNotFoundError,
  ProviderAdapterValidationError,
} from "../Errors.ts";
import type {
  OmpDeleteResourceInput,
  OmpMoveItemInput,
  OmpReadResourceInput,
  OmpResetSettingInput,
  OmpWriteResourceInput,
  OmpWriteSettingInput,
  ProjectId,
} from "@t3tools/contracts";
import type { OmpCapabilitiesService } from "./OmpCapabilitiesService.ts";
import { OmpSpawnError, type OmpRpcRuntime } from "./OmpRpcRuntime.ts";
import { OmpAgentProfileStore } from "./OmpAgentProfileStore.ts";
import { OmpSubagentTranscriptStore } from "./OmpSubagentTranscriptStore.ts";
import { OmpPreviewMcpInjector } from "../../mcp/OmpPreviewMcpInjector.ts";
import { readMcpProviderSession } from "../../mcp/McpProviderSession.ts";
import {
  formatOmpAssistantError,
  readOmpAgentEndError,
  readOmpAssistantOutcome,
  type OmpAssistantOutcome,
} from "./OmpErrorFormatting.ts";

const PROVIDER = ProviderDriverKind.make("omp");
const nowIso = Effect.map(DateTime.now, DateTime.formatIso);
const isProviderAdapterProcessError = Schema.is(ProviderAdapterProcessError);
const isOmpSpawnError = Schema.is(OmpSpawnError);

type OmpModelOption = { readonly id: string; readonly value: string | boolean };

/**
 * OMP exposes Fast mode as a boolean RPC, while the shared model selection uses
 * the provider-neutral serviceTier option. Keep the legacy fastMode fallback,
 * but let an explicitly selected serviceTier win even when both are present.
 */
function resolveOmpFastMode(options: ReadonlyArray<OmpModelOption>): {
  readonly hasServiceTier: boolean;
  readonly enabled: boolean | undefined;
} {
  const serviceTier = options.find((option) => option.id === "serviceTier");
  if (serviceTier !== undefined) {
    return {
      hasServiceTier: true,
      enabled:
        serviceTier.value === "priority"
          ? true
          : serviceTier.value === "default"
            ? false
            : undefined,
    };
  }
  const legacyFastMode = options.find((option) => option.id === "fastMode");
  return {
    hasServiceTier: false,
    enabled: typeof legacyFastMode?.value === "boolean" ? legacyFastMode.value : undefined,
  };
}

function mapOmpAgentProfileError(
  method: string,
  cause: OmpAgentProfileError,
): ProviderAdapterRequestError {
  return new ProviderAdapterRequestError({
    provider: PROVIDER,
    method,
    detail: cause.reason,
    cause,
  });
}

// ---------------------------------------------------------------------------
// Review findings block decoding (issue #42): the persona ends with one
// fenced JSON block. The adapter decodes it and emits one `review.finding`
// runtime event per finding; a missing or malformed block fails the turn so
// the review run surfaces the error instead of silently dropping findings.
// Decoding lives in ReviewBlockDecoder (this file keeps the emit orchestration).
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Normalize omp Rule condition/scope fields (string or string[]) to string[]. */
function toRuleStringArray(value: unknown): string[] | undefined {
  if (typeof value === "string") {
    return value.length > 0 ? [value] : undefined;
  }
  if (Array.isArray(value)) {
    const entries = value.filter(
      (entry): entry is string => typeof entry === "string" && entry.length > 0,
    );
    return entries.length > 0 ? entries : undefined;
  }
  return undefined;
}

function mapOmpSpawnError(threadId: ThreadId, cause: OmpSpawnError): ProviderAdapterProcessError {
  return new ProviderAdapterProcessError({
    provider: PROVIDER,
    threadId,
    detail: cause.message,
    cause,
  });
}

function isUnknownSubagentTranscriptCause(
  cause: Cause.Cause<ProviderAdapterProcessError>,
): boolean {
  const error = Cause.squash(cause);
  if (!isProviderAdapterProcessError(error) || !isOmpSpawnError(error.cause)) {
    return false;
  }
  return (
    error.cause.operation === "get_subagent_messages" &&
    /Unknown subagent(?: or session file unavailable| session file)/u.test(error.cause.detail)
  );
}

export interface OmpOpenUrlRequest {
  readonly url: string;
  readonly launchUrl?: string;
  readonly instructions?: string;
}

interface TrackedOmpToolCall {
  readonly toolName: string;
  readonly args: unknown;
  readonly intent: string | undefined;
}

type PendingExtensionUiKind = "confirm" | "select" | "input" | "editor" | "host_uri";

interface PendingExtensionUiRequest {
  readonly kind: PendingExtensionUiKind;
  readonly ompId: string;
}

interface LiveAdapterSession {
  readonly threadId: ThreadId;
  readonly sessionFile: string;
  readonly runtimeMode: RuntimeMode;
  readonly cwd: string;
  readonly snapshot: ProviderSession;
  readonly scope: Scope.Scope;
  readonly toolCalls: Map<string, TrackedOmpToolCall>;
  readonly pendingUiRequests: Map<string, PendingExtensionUiRequest>;
  /** Metadata needed to fold raw child events into task activity. */
  readonly subagentStates: Map<string, OmpSubagentState>;
  turnId: TurnId | undefined;
  /** Set by interruptTurn; cleared when the terminal agent_end confirms stop. */
  stopRequested: boolean;
  /** Wall-clock ms of the last mid-turn token-usage emit (throttle). */
  lastTokenUsageEmitAtMs: number;
  /** Text deltas of the currently-open assistant run (null = no open run). */
  openRunText: string | null;
  /** Text of the most recently closed run, parked as candidate-final. */
  heldBackRunText: string | null;
  /** Latest assistant outcome for compacted terminal agent_end frames. */
  lastAssistantOutcome: OmpAssistantOutcome | undefined;
  interactionMode: ProviderTurnInteractionMode;
  prePlanModelSlug: string | undefined;
  preReviewModelSlug: string | undefined;
  onOpenUrl: ((request: OmpOpenUrlRequest) => Effect.Effect<void>) | undefined;
}

interface OmpSubagentState {
  readonly id: string;
  description: string;
  role: string | undefined;
  toolUseId: string | undefined;
  agentIndex: number | undefined;
  model: string | undefined;
  effort: string | undefined;
  summary: string | undefined;
  error: string | undefined;
  usage: unknown;
  typedUsage: RuntimeTaskUsage | undefined;
}

const TOKEN_USAGE_EMIT_MIN_INTERVAL_MS = 1_000;
/** How long interruptTurn waits for omp to acknowledge `abort` before force-stopping. */
const OMP_ABORT_ACK_TIMEOUT = "10 seconds";

export type OmpResolveRoleModel = (role: string) => Effect.Effect<string | undefined>;

export interface OmpAdapterOptions {
  readonly resolveRoleModel?: OmpResolveRoleModel;
  readonly capabilitiesService?: Pick<
    OmpCapabilitiesService,
    | "getSnapshot"
    | "writeSetting"
    | "resetSetting"
    | "readResource"
    | "writeResource"
    | "deleteResource"
    | "moveItemToOmp"
  >;
  readonly previewMcpInjector?: OmpPreviewMcpInjector;
  readonly agentDir?: string;
  readonly agentProfileStore?: OmpAgentProfileStore;
  readonly subagentTranscriptStore?: OmpSubagentTranscriptStore;
}

export type OmpSubagentSubscriptionLevel = "off" | "progress" | "events";

export interface OmpSubagentTranscriptPage {
  readonly sessionFile: string;
  readonly fromByte: number;
  readonly nextByte: number;
  readonly reset: boolean;
  /** All complete JSONL entries, including tool/status records. */
  readonly entries: ReadonlyArray<unknown>;
  readonly messages: ReadonlyArray<unknown>;
}

/**
 * Structural RPC client used by the adapter. Tests pass a fake; production
 * passes `OmpRpcRuntime`.
 */
export type OmpRpcClient = Pick<
  OmpRpcRuntime,
  "ensureSession" | "send" | "write" | "streamFrames" | "dispose"
>;

export class OmpAdapter {
  readonly provider = PROVIDER;
  readonly capabilities = { sessionModelSwitch: "in-session" as const };
  readonly #events = Effect.runSync(Queue.unbounded<ProviderRuntimeEvent>());
  readonly #sessions = new Map<ThreadId, LiveAdapterSession>();
  readonly #runtime: OmpRpcClient;
  readonly #randomUUID: Effect.Effect<string>;
  readonly #resolveRoleModel: OmpResolveRoleModel;
  readonly #capabilitiesService: OmpAdapterOptions["capabilitiesService"];
  readonly #previewMcpInjector: OmpPreviewMcpInjector | undefined;
  readonly #agentDir: string | undefined;
  readonly #agentProfileStore: OmpAgentProfileStore | undefined;
  readonly #subagentTranscriptStore: OmpSubagentTranscriptStore | undefined;
  readonly #reviewBlockDecoder = new ReviewBlockDecoder();
  readonly #toolPresentation = new OmpToolPresentation();
  readonly #catalogDecoder = new OmpCatalogDecoder();

  public constructor(
    runtime: OmpRpcClient,
    randomUUID: Effect.Effect<string>,
    options: OmpAdapterOptions = {},
  ) {
    this.#runtime = runtime;
    this.#randomUUID = randomUUID;
    this.#resolveRoleModel = options.resolveRoleModel ?? (() => Effect.succeed(undefined));
    this.#capabilitiesService = options.capabilitiesService;
    this.#previewMcpInjector = options.previewMcpInjector;
    this.#agentDir = options.agentDir;
    this.#agentProfileStore = options.agentProfileStore;
    this.#subagentTranscriptStore = options.subagentTranscriptStore;
  }

  private requireCapabilitiesService(): Effect.Effect<
    NonNullable<OmpAdapterOptions["capabilitiesService"]>,
    ProviderAdapterRequestError
  > {
    if (this.#capabilitiesService === undefined) {
      return Effect.fail(
        new ProviderAdapterRequestError({
          provider: PROVIDER,
          method: "capabilities",
          detail: "omp capabilities service is not configured",
        }),
      );
    }
    return Effect.succeed(this.#capabilitiesService);
  }

  /** omp Capabilities: snapshot of the discovered OMP config surface (non-thread op). */
  public capabilitiesSnapshot(
    projectId?: ProjectId,
    options?: { readonly includeAllProjects?: boolean },
  ) {
    return this.requireCapabilitiesService().pipe(
      Effect.flatMap((service) => service.getSnapshot(projectId, options)),
    );
  }

  /** omp Capabilities: scoped setting write (non-thread op). */
  public capabilitiesWriteSetting(input: OmpWriteSettingInput) {
    return this.requireCapabilitiesService().pipe(
      Effect.flatMap((service) => service.writeSetting(input)),
    );
  }

  /** omp Capabilities: destructive setting reset, confirm-gated (non-thread op). */
  public capabilitiesResetSetting(input: OmpResetSettingInput) {
    return this.requireCapabilitiesService().pipe(
      Effect.flatMap((service) => service.resetSetting(input)),
    );
  }

  /** omp Capabilities: read one rule/skill item (non-thread op). */
  public capabilitiesReadResource(input: OmpReadResourceInput) {
    return this.requireCapabilitiesService().pipe(
      Effect.flatMap((service) => service.readResource(input)),
    );
  }

  /** omp Capabilities: create/replace a rule/skill item (non-thread op). */
  public capabilitiesWriteResource(input: OmpWriteResourceInput) {
    return this.requireCapabilitiesService().pipe(
      Effect.flatMap((service) => service.writeResource(input)),
    );
  }

  /** omp Capabilities: destructive rule/skill delete, confirm-gated (non-thread op). */
  public capabilitiesDeleteResource(input: OmpDeleteResourceInput) {
    return this.requireCapabilitiesService().pipe(
      Effect.flatMap((service) => service.deleteResource(input)),
    );
  }

  /** omp Capabilities: move a foreign-root global skill into the omp agent directory. */
  public capabilitiesMoveItem(input: OmpMoveItemInput) {
    return this.requireCapabilitiesService().pipe(
      Effect.flatMap((service) => service.moveItemToOmp(input)),
    );
  }

  public agentProfilesList() {
    return this.#agentProfileStore === undefined
      ? Effect.fail(
          new ProviderAdapterRequestError({
            provider: PROVIDER,
            method: "agentProfilesList",
            detail: "omp agent profile store is not configured",
          }),
        )
      : this.#agentProfileStore
          .list()
          .pipe(Effect.mapError((cause) => mapOmpAgentProfileError("agentProfilesList", cause)));
  }

  public agentProfileUpsert(input: OmpAgentProfileUpsertInput) {
    return this.#agentProfileStore === undefined
      ? Effect.fail(
          new ProviderAdapterRequestError({
            provider: PROVIDER,
            method: "agentProfileUpsert",
            detail: "omp agent profile store is not configured",
          }),
        )
      : this.#agentProfileStore
          .upsert(input)
          .pipe(Effect.mapError((cause) => mapOmpAgentProfileError("agentProfileUpsert", cause)));
  }

  public agentProfileDelete(name: OmpAgentProfileName) {
    return this.#agentProfileStore === undefined
      ? Effect.fail(
          new ProviderAdapterRequestError({
            provider: PROVIDER,
            method: "agentProfileDelete",
            detail: "omp agent profile store is not configured",
          }),
        )
      : this.#agentProfileStore
          .delete(name)
          .pipe(Effect.mapError((cause) => mapOmpAgentProfileError("agentProfileDelete", cause)));
  }

  public agentProfilesImportCodex(): Effect.Effect<
    ServerOmpAgentProfilesImportCodexResult,
    ProviderAdapterRequestError
  > {
    return this.#agentProfileStore === undefined
      ? Effect.fail(
          new ProviderAdapterRequestError({
            provider: PROVIDER,
            method: "agentProfilesImportCodex",
            detail: "omp agent profile store is not configured",
          }),
        )
      : this.#agentProfileStore
          .importCodex()
          .pipe(
            Effect.mapError((cause) => mapOmpAgentProfileError("agentProfilesImportCodex", cause)),
          );
  }

  public rootPromptBundlesGet(): Effect.Effect<OmpRootPromptBundles, ProviderAdapterRequestError> {
    return this.#agentProfileStore === undefined
      ? Effect.fail(
          new ProviderAdapterRequestError({
            provider: PROVIDER,
            method: "rootPromptBundlesGet",
            detail: "omp agent profile store is not configured",
          }),
        )
      : this.#agentProfileStore
          .rootPromptBundles()
          .pipe(Effect.mapError((cause) => mapOmpAgentProfileError("rootPromptBundlesGet", cause)));
  }

  public rootPromptBundlesUpdate(
    input: OmpRootPromptBundles,
  ): Effect.Effect<OmpRootPromptBundles, ProviderAdapterRequestError> {
    return this.#agentProfileStore === undefined
      ? Effect.fail(
          new ProviderAdapterRequestError({
            provider: PROVIDER,
            method: "rootPromptBundlesUpdate",
            detail: "omp agent profile store is not configured",
          }),
        )
      : this.#agentProfileStore
          .updateRootPromptBundles(input)
          .pipe(
            Effect.mapError((cause) => mapOmpAgentProfileError("rootPromptBundlesUpdate", cause)),
          );
  }

  public get streamEvents(): Stream.Stream<ProviderRuntimeEvent> {
    return Stream.fromQueue(this.#events);
  }

  public startSession(input: ProviderSessionStartInput) {
    return Effect.gen({ self: this }, function* () {
      const cwd = input.cwd;
      if (cwd === undefined) {
        return yield* new ProviderAdapterValidationError({
          provider: PROVIDER,
          operation: "startSession",
          issue: "cwd is required",
        });
      }
      const resumeCursor = typeof input.resumeCursor === "string" ? input.resumeCursor : null;
      const extraEnv = yield* this.#installPreviewMcp(input.threadId);
      const appendSystemPromptFile =
        input.agentMode !== undefined && this.#agentProfileStore !== undefined
          ? yield* this.#agentProfileStore
              .rootPromptPath(input.threadId, input.agentMode)
              .pipe(Effect.mapError((cause) => mapOmpAgentProfileError("startSession", cause)))
          : undefined;
      const managedAgentDir =
        input.agentMode === "orchestrator" && this.#agentProfileStore !== undefined
          ? yield* this.#agentProfileStore
              .managedAgentDirectory()
              .pipe(Effect.mapError((cause) => mapOmpAgentProfileError("startSession", cause)))
          : undefined;
      const handle = yield* this.#runtime
        .ensureSession({
          sessionKey: input.threadId,
          cwd,
          resumeCursor,
          ...(extraEnv !== undefined ? { extraEnv } : {}),
          // `PI_CODING_AGENT_DIR` replaces OMP's whole agent state directory,
          // including auth/settings databases. Use OMP's supported extension
          // discovery lane for Pivot-managed task-agent definitions instead.
          ...(managedAgentDir !== undefined ? { extraArgs: ["--extension", managedAgentDir] } : {}),
          ...(appendSystemPromptFile ? { appendSystemPromptFile } : {}),
        })
        .pipe(
          Effect.tapError(() => this.#uninstallPreviewMcp(input.threadId)),
          Effect.mapError((cause) => mapOmpSpawnError(input.threadId, cause)),
        );
      const createdAt = yield* nowIso;
      const scope = yield* Scope.make("sequential");
      const snapshot: ProviderSession = {
        provider: PROVIDER,
        status: "ready",
        runtimeMode: input.runtimeMode,
        cwd,
        threadId: input.threadId,
        resumeCursor: handle.sessionFile,
        createdAt,
        updatedAt: createdAt,
      };
      const session: LiveAdapterSession = {
        threadId: input.threadId,
        sessionFile: handle.sessionFile,
        runtimeMode: input.runtimeMode,
        cwd,
        snapshot,
        scope,
        toolCalls: new Map(),
        pendingUiRequests: new Map(),
        subagentStates: new Map<string, OmpSubagentState>(),
        turnId: undefined,
        stopRequested: false,
        // Negative so the first mid-turn emit is not throttled when Clock is 0 (TestClock).
        lastTokenUsageEmitAtMs: -TOKEN_USAGE_EMIT_MIN_INTERVAL_MS,
        openRunText: null,
        heldBackRunText: null,
        lastAssistantOutcome: undefined,
        interactionMode: "default",
        prePlanModelSlug: undefined,
        preReviewModelSlug: undefined,
        onOpenUrl: undefined,
      };
      this.#sessions.set(input.threadId, session);
      // Frame transport runs in the session scope. When it ends (child exit,
      // stream failure) or when deliberate teardown closes the scope, the fiber
      // completes; if the child died while the session is still registered,
      // settle the in-flight turn and the session instead of leaving the thread
      // permanently "running".
      yield* Effect.gen({ self: this }, function* () {
        yield* this.#runtime.streamFrames(input.threadId).pipe(
          Stream.mapError((cause) => mapOmpSpawnError(input.threadId, cause)),
          Stream.runForEach((frame) => this.#onFrame(session, frame)),
          Effect.exit,
        );
        yield* this.#onSessionTransportEnded(session);
      }).pipe(Effect.forkIn(scope));
      yield* this.#runtime
        .send(input.threadId, {
          type: "set_subagent_subscription",
          level: "events",
        })
        .pipe(Effect.mapError((cause) => mapOmpSpawnError(input.threadId, cause)));
      yield* this.#applyModelSelection(input.threadId, input.modelSelection?.model);
      yield* this.#applyTurnOptions(input.threadId, input.modelSelection?.options);
      return snapshot;
    });
  }

  public sendTurn(input: ProviderSendTurnInput) {
    return Effect.gen({ self: this }, function* () {
      const session = this.#sessions.get(input.threadId);
      if (!session) {
        return yield* new ProviderAdapterSessionNotFoundError({
          provider: PROVIDER,
          threadId: input.threadId,
        });
      }
      const turnId = yield* this.#randomUUID.pipe(Effect.map(TurnId.make));
      session.turnId = turnId;
      session.stopRequested = false;
      session.openRunText = null;
      session.heldBackRunText = null;
      session.lastAssistantOutcome = undefined;
      yield* this.#applyInteractionMode(session, input.interactionMode);
      if (session.interactionMode !== "plan") {
        yield* this.#applyModelSelection(input.threadId, input.modelSelection?.model);
      }
      yield* this.#applyTurnOptions(input.threadId, input.modelSelection?.options);
      yield* this.#emit({
        type: "turn.started",
        threadId: input.threadId,
        turnId,
        payload: input.modelSelection?.model ? { model: input.modelSelection.model } : {},
      });
      const response = yield* this.#send(input.threadId, {
        type: "prompt",
        ...(input.input === undefined ? {} : { message: input.input }),
      });
      if (isLocalOnlyPromptResponse(response)) {
        yield* this.#emitTurnCompleted(session);
      }
      return {
        threadId: input.threadId,
        turnId,
        resumeCursor: session.sessionFile,
      };
    });
  }

  public hasSession(threadId: ThreadId) {
    return Effect.succeed(this.#sessions.has(threadId));
  }

  public listSessions() {
    return Effect.succeed(Array.from(this.#sessions.values(), (session) => session.snapshot));
  }

  public stopSession(threadId: ThreadId) {
    return this.#clearLiveSession(threadId);
  }

  public stopAll() {
    return Effect.gen({ self: this }, function* () {
      const threadIds = Array.from(this.#sessions.keys());
      yield* Effect.forEach(threadIds, (threadId) => this.#clearLiveSession(threadId), {
        discard: true,
      });
    });
  }

  public interruptTurn(threadId: ThreadId, _turnId?: TurnId) {
    return Effect.gen({ self: this }, function* () {
      const session = this.#sessions.get(threadId);
      if (!session) {
        return yield* new ProviderAdapterSessionNotFoundError({
          provider: PROVIDER,
          threadId,
        });
      }
      session.stopRequested = true;
      const abortOutcome = yield* Effect.exit(
        this.#send(threadId, { type: "abort" }).pipe(Effect.timeout(OMP_ABORT_ACK_TIMEOUT)),
      );
      if (Exit.isFailure(abortOutcome)) {
        // omp did not acknowledge the abort within the timeout (child dead or
        // wedged, e.g. host restart). No terminal agent_end will arrive, so
        // settle the turn and session here instead of leaving the thread
        // permanently "running".
        yield* this.#onSessionTransportEnded(session);
      }
    });
  }

  public fetchSubagentTranscript(
    threadId: ThreadId,
    subagentId: string,
    fromByte?: number,
  ): Effect.Effect<
    OmpSubagentTranscriptPage,
    ProviderAdapterProcessError | ProviderAdapterRequestError | ProviderAdapterSessionNotFoundError
  > {
    return Effect.gen({ self: this }, function* () {
      const session = this.#sessions.get(threadId);
      if (!session) {
        return yield* new ProviderAdapterSessionNotFoundError({
          provider: PROVIDER,
          threadId,
        });
      }
      const nativeExit = yield* Effect.exit(
        this.#send(threadId, {
          type: "get_subagent_messages",
          subagentId,
          ...(fromByte === undefined ? {} : { fromByte }),
        }),
      );
      if (Exit.isFailure(nativeExit)) {
        if (
          this.#subagentTranscriptStore !== undefined &&
          isUnknownSubagentTranscriptCause(nativeExit.cause)
        ) {
          const fallback = yield* this.#subagentTranscriptStore.readPage({
            threadId,
            subagentId,
            rootSessionFile: session.sessionFile,
            ...(fromByte === undefined ? {} : { fromByte }),
          });
          if (fallback !== undefined) return fallback;
        }
        return yield* Effect.failCause(nativeExit.cause);
      }
      const response = nativeExit.value;
      if (!isRecord(response) || !isRecord(response.data)) {
        return yield* new ProviderAdapterRequestError({
          provider: PROVIDER,
          method: "get_subagent_messages",
          detail: "response data missing",
        });
      }
      const data = response.data;
      const messages = Array.isArray(data.messages) ? data.messages : [];
      // OMP v18.0.11+ includes `entries`; retain the message projection as a
      // compatibility fallback for an older managed binary.
      const entries = Array.isArray(data.entries) ? data.entries : messages;
      return {
        sessionFile: typeof data.sessionFile === "string" ? data.sessionFile : "",
        fromByte: typeof data.fromByte === "number" ? data.fromByte : 0,
        nextByte: typeof data.nextByte === "number" ? data.nextByte : 0,
        reset: data.reset === true,
        entries,
        messages,
      } satisfies OmpSubagentTranscriptPage;
    });
  }

  public steerSession(threadId: ThreadId, message: string) {
    return Effect.gen({ self: this }, function* () {
      if (!this.#sessions.has(threadId)) {
        return yield* new ProviderAdapterSessionNotFoundError({
          provider: PROVIDER,
          threadId,
        });
      }
      yield* this.#send(threadId, { type: "steer", message });
    });
  }

  public setSubagentSubscription(threadId: ThreadId, level: OmpSubagentSubscriptionLevel) {
    return Effect.gen({ self: this }, function* () {
      if (!this.#sessions.has(threadId)) {
        return yield* new ProviderAdapterSessionNotFoundError({
          provider: PROVIDER,
          threadId,
        });
      }
      yield* this.#send(threadId, { type: "set_subagent_subscription", level });
    });
  }

  public readThread(threadId: ThreadId) {
    return Effect.gen({ self: this }, function* () {
      if (!this.#sessions.has(threadId)) {
        return yield* new ProviderAdapterSessionNotFoundError({
          provider: PROVIDER,
          threadId,
        });
      }
      return { threadId, turns: [] as const };
    });
  }

  public setThinkingLevel(threadId: ThreadId, level: string) {
    return Effect.gen({ self: this }, function* () {
      if (!this.#sessions.has(threadId)) {
        return yield* new ProviderAdapterSessionNotFoundError({
          provider: PROVIDER,
          threadId,
        });
      }
      yield* this.#send(threadId, { type: "set_thinking_level", level });
    });
  }

  public setFastMode(threadId: ThreadId, enabled: boolean) {
    return Effect.gen({ self: this }, function* () {
      if (!this.#sessions.has(threadId)) {
        return yield* new ProviderAdapterSessionNotFoundError({
          provider: PROVIDER,
          threadId,
        });
      }
      yield* this.#send(threadId, { type: "set_fast_mode", enabled });
    });
  }

  public setAutoCompaction(threadId: ThreadId, enabled: boolean) {
    return Effect.gen({ self: this }, function* () {
      if (!this.#sessions.has(threadId)) {
        return yield* new ProviderAdapterSessionNotFoundError({
          provider: PROVIDER,
          threadId,
        });
      }
      yield* this.#send(threadId, { type: "set_auto_compaction", enabled });
    });
  }

  public setAutoRetry(threadId: ThreadId, enabled: boolean) {
    return Effect.gen({ self: this }, function* () {
      if (!this.#sessions.has(threadId)) {
        return yield* new ProviderAdapterSessionNotFoundError({
          provider: PROVIDER,
          threadId,
        });
      }
      yield* this.#send(threadId, { type: "set_auto_retry", enabled });
    });
  }

  public compact(threadId: ThreadId, customInstructions?: string) {
    return Effect.gen({ self: this }, function* () {
      if (!this.#sessions.has(threadId)) {
        return yield* new ProviderAdapterSessionNotFoundError({
          provider: PROVIDER,
          threadId,
        });
      }
      yield* this.#send(threadId, {
        type: "compact",
        ...(customInstructions === undefined ? {} : { customInstructions }),
      });
    });
  }

  public rollbackThread(threadId: ThreadId, numTurns: number) {
    return Effect.gen({ self: this }, function* () {
      if (!this.#sessions.has(threadId)) {
        return yield* new ProviderAdapterSessionNotFoundError({
          provider: PROVIDER,
          threadId,
        });
      }
      if (numTurns <= 0) {
        return { threadId, turns: [] as const };
      }
      const response = yield* this.#send(threadId, {
        type: "get_branch_messages",
      });
      if (
        !isRecord(response) ||
        !isRecord(response.data) ||
        !Array.isArray(response.data.messages)
      ) {
        return yield* new ProviderAdapterRequestError({
          provider: PROVIDER,
          method: "rollbackThread",
          detail: "get_branch_messages returned no messages",
        });
      }
      const messages = response.data.messages;
      if (messages.length < numTurns) {
        return yield* new ProviderAdapterRequestError({
          provider: PROVIDER,
          method: "rollbackThread",
          detail: `cannot rollback ${numTurns} turns; only ${messages.length} branch messages available`,
        });
      }
      const target = messages[messages.length - numTurns];
      if (!isRecord(target) || typeof target.entryId !== "string" || target.entryId.length === 0) {
        return yield* new ProviderAdapterRequestError({
          provider: PROVIDER,
          method: "rollbackThread",
          detail: "branch message missing entryId",
        });
      }
      yield* this.#send(threadId, { type: "branch", entryId: target.entryId });
      return { threadId, turns: [] as const };
    });
  }

  public respondToRequest(
    threadId: ThreadId,
    requestId: ApprovalRequestId,
    decision: ProviderApprovalDecision,
  ) {
    return Effect.gen({ self: this }, function* () {
      const session = this.#sessions.get(threadId);
      if (!session) {
        return yield* new ProviderAdapterSessionNotFoundError({
          provider: PROVIDER,
          threadId,
        });
      }
      const pending = session.pendingUiRequests.get(requestId);
      if (!pending || (pending.kind !== "confirm" && pending.kind !== "host_uri")) {
        return yield* new ProviderAdapterRequestError({
          provider: PROVIDER,
          method: "respondToRequest",
          detail: `no pending extension_ui confirm for ${requestId}`,
        });
      }
      const accepted = decision === "accept" || decision === "acceptForSession";
      const response =
        pending.kind === "host_uri"
          ? decision === "cancel" || !accepted
            ? {
                type: "host_uri_result" as const,
                id: pending.ompId,
                isError: true as const,
                error: "rejected by user",
              }
            : { type: "host_uri_result" as const, id: pending.ompId }
          : decision === "cancel"
            ? {
                type: "extension_ui_response" as const,
                id: pending.ompId,
                cancelled: true as const,
              }
            : {
                type: "extension_ui_response" as const,
                id: pending.ompId,
                confirmed: accepted,
              };
      yield* this.#runtime.write(threadId, response).pipe(
        Effect.mapError((cause) =>
          isOmpSpawnError(cause)
            ? mapOmpSpawnError(threadId, cause)
            : new ProviderAdapterRequestError({
                provider: PROVIDER,
                method: "respondToRequest",
                detail: String(cause),
                cause,
              }),
        ),
      );
      session.pendingUiRequests.delete(requestId);
      yield* this.#emit({
        type: "request.resolved",
        threadId,
        turnId: session.turnId,
        requestId: RuntimeRequestId.make(pending.ompId),
        payload: {
          requestType: "command_execution_approval",
          decision,
        },
      });
    });
  }

  public respondToUserInput(
    threadId: ThreadId,
    requestId: ApprovalRequestId,
    answers: ProviderUserInputAnswers,
  ) {
    return Effect.gen({ self: this }, function* () {
      const session = this.#sessions.get(threadId);
      if (!session) {
        return yield* new ProviderAdapterSessionNotFoundError({
          provider: PROVIDER,
          threadId,
        });
      }
      const pending = session.pendingUiRequests.get(requestId);
      if (
        !pending ||
        (pending.kind !== "select" && pending.kind !== "input" && pending.kind !== "editor")
      ) {
        return yield* new ProviderAdapterRequestError({
          provider: PROVIDER,
          method: "respondToUserInput",
          detail: `no pending extension_ui user-input for ${requestId}`,
        });
      }
      const value = firstUserInputAnswer(answers);
      if (value === undefined) {
        return yield* new ProviderAdapterRequestError({
          provider: PROVIDER,
          method: "respondToUserInput",
          detail: "user-input answers did not include a string value",
        });
      }
      yield* this.#runtime
        .write(threadId, {
          type: "extension_ui_response",
          id: pending.ompId,
          value,
        })
        .pipe(
          Effect.mapError((cause) =>
            isOmpSpawnError(cause)
              ? mapOmpSpawnError(threadId, cause)
              : new ProviderAdapterRequestError({
                  provider: PROVIDER,
                  method: "respondToUserInput",
                  detail: String(cause),
                  cause,
                }),
          ),
        );
      session.pendingUiRequests.delete(requestId);
      yield* this.#emit({
        type: "user-input.resolved",
        threadId,
        turnId: session.turnId,
        requestId: RuntimeRequestId.make(pending.ompId),
        payload: { answers },
      });
    });
  }

  public discoverModels(threadId: ThreadId) {
    return Effect.gen({ self: this }, function* () {
      if (!this.#sessions.has(threadId)) {
        return yield* new ProviderAdapterSessionNotFoundError({
          provider: PROVIDER,
          threadId,
        });
      }
      const response = yield* this.#send(threadId, {
        type: "get_available_models",
      });
      return yield* this.#catalogDecoder.decodeModels(response);
    });
  }

  public discoverSlashCommands(threadId: ThreadId) {
    return Effect.gen({ self: this }, function* () {
      if (!this.#sessions.has(threadId)) {
        return yield* new ProviderAdapterSessionNotFoundError({
          provider: PROVIDER,
          threadId,
        });
      }
      const response = yield* this.#send(threadId, {
        type: "get_available_commands",
      });
      return yield* this.#catalogDecoder.decodeSlashCommands(response);
    });
  }

  public listLoginProviders(threadId: ThreadId) {
    return Effect.gen({ self: this }, function* () {
      if (!this.#sessions.has(threadId)) {
        return yield* new ProviderAdapterSessionNotFoundError({
          provider: PROVIDER,
          threadId,
        });
      }
      const response = yield* this.#send(threadId, {
        type: "get_login_providers",
      });
      return yield* this.#catalogDecoder.decodeLoginProviders(response);
    });
  }

  public login(
    threadId: ThreadId,
    providerId: string,
    onOpenUrl: (request: OmpOpenUrlRequest) => Effect.Effect<void>,
  ) {
    return Effect.gen({ self: this }, function* () {
      const session = this.#sessions.get(threadId);
      if (!session) {
        return yield* new ProviderAdapterSessionNotFoundError({
          provider: PROVIDER,
          threadId,
        });
      }
      session.onOpenUrl = onOpenUrl;
      return yield* this.#send(threadId, { type: "login", providerId }).pipe(
        Effect.timeout("10 minutes"),
        Effect.mapError((cause) =>
          isProviderAdapterProcessError(cause)
            ? cause
            : new ProviderAdapterRequestError({
                provider: PROVIDER,
                method: "login",
                detail: cause instanceof Error ? cause.message : String(cause),
                cause,
              }),
        ),
        Effect.map(() => ({ providerId })),
        Effect.ensuring(
          Effect.sync(() => {
            session.onOpenUrl = undefined;
          }),
        ),
      );
    });
  }

  #onFrame(session: LiveAdapterSession, frame: object): Effect.Effect<void> {
    if (!isRecord(frame) || typeof frame.type !== "string") {
      return Effect.void;
    }
    if (frame.type === "extension_ui_request") {
      return this.#onExtensionUiRequest(session, frame);
    }
    if (frame.type === "host_uri_request") {
      return this.#onHostUriRequest(session, frame);
    }
    if (frame.type === "host_uri_cancel") {
      return this.#onHostUriCancel(session, frame);
    }
    if (frame.type === "agent_end" && frame.isTerminal !== false) {
      const agentErrorMessage = readOmpAgentEndError(frame, session.lastAssistantOutcome);
      session.lastAssistantOutcome = undefined;
      return this.#emitTurnCompleted(session, agentErrorMessage);
    }
    if (frame.type === "prompt_result" && frame.agentInvoked === false) {
      session.lastAssistantOutcome = undefined;
      return this.#emitTurnCompleted(session);
    }
    if (frame.type === "command_output") {
      return this.#onCommandOutput(session, frame);
    }
    if (frame.type === "ttsr_triggered") {
      return this.#onTtsrTriggered(session, frame);
    }
    if (frame.type === "message_start") {
      return this.#onMessageStart(session, frame);
    }
    if (frame.type === "message_end") {
      return this.#onMessageEnd(session, frame);
    }
    if (frame.type === "message_update") {
      return this.#onMessageUpdate(session, frame).pipe(
        Effect.tap(() =>
          this.#maybeEmitLiveTokenUsage(session).pipe(Effect.forkDetach, Effect.asVoid),
        ),
      );
    }
    if (frame.type === "tool_execution_start") {
      return this.#onToolExecutionStart(session, frame);
    }
    if (frame.type === "tool_execution_update") {
      return this.#onToolExecutionUpdate(session, frame);
    }
    if (frame.type === "tool_execution_end") {
      return this.#onToolExecutionEnd(session, frame);
    }
    if (frame.type === "subagent_lifecycle") {
      return this.#onSubagentLifecycle(session, frame);
    }
    if (frame.type === "subagent_progress") {
      return this.#onSubagentProgress(session, frame);
    }
    if (frame.type === "subagent_event") {
      return this.#onSubagentEvent(session, frame);
    }
    return Effect.void;
  }

  #onSubagentLifecycle(
    session: LiveAdapterSession,
    frame: Record<string, unknown>,
  ): Effect.Effect<void> {
    const payload = frame.payload;
    if (!isRecord(payload) || typeof payload.id !== "string") {
      return Effect.void;
    }
    const state = this.#getOrCreateSubagentState(session, payload.id);
    const role = readNonEmptyText(payload.agent);
    const description = readNonEmptyText(payload.description);
    const toolUseId = readNonEmptyText(payload.parentToolCallId);
    const agentIndex = readNonNegativeInt(payload.index);
    const model = readOmpPayloadModel(payload);
    const effort = readOmpEffort(payload);
    if (description !== undefined) {
      state.description = description;
    }
    if (role !== undefined) {
      state.role = role;
    }
    if (toolUseId !== undefined) {
      state.toolUseId = toolUseId;
    }
    if (agentIndex !== undefined) {
      state.agentIndex = agentIndex;
    }
    if (model !== undefined) {
      state.model = model;
    }
    if (effort !== undefined) {
      state.effort = effort;
    }
    const taskId = RuntimeTaskId.make(payload.id);
    const rememberTranscript = this.#rememberSubagentTranscript(
      session,
      payload.id,
      payload.sessionFile,
    );
    const linkage = {
      ...(state.role === undefined ? {} : { role: state.role }),
      ...(state.description.length === 0 ? {} : { title: state.description }),
      ...(state.toolUseId === undefined ? {} : { toolUseId: state.toolUseId }),
      ...(state.agentIndex === undefined ? {} : { agentIndex: state.agentIndex }),
      ...(state.model === undefined ? {} : { model: state.model }),
      ...(state.effort === undefined ? {} : { effort: state.effort }),
    };
    if (payload.status === "started") {
      return rememberTranscript.pipe(
        Effect.andThen(
          this.#emit({
            type: "task.started",
            threadId: session.threadId,
            turnId: session.turnId,
            payload: {
              taskId,
              description: state.description,
              ...linkage,
            },
          }),
        ),
      );
    }
    const status =
      payload.status === "completed"
        ? ("completed" as const)
        : payload.status === "failed"
          ? ("failed" as const)
          : payload.status === "aborted"
            ? ("stopped" as const)
            : undefined;
    if (status === undefined) {
      return rememberTranscript;
    }
    const summary = status === "failed" ? (state.error ?? state.summary) : state.summary;
    const completed = this.#emit({
      type: "task.completed",
      threadId: session.threadId,
      turnId: session.turnId,
      payload: {
        taskId,
        status,
        ...(summary === undefined ? {} : { summary }),
        ...(state.usage === undefined ? {} : { usage: state.usage }),
        ...(state.typedUsage === undefined ? {} : { typedUsage: state.typedUsage }),
        ...linkage,
      },
    });
    session.subagentStates.delete(payload.id);
    return rememberTranscript.pipe(Effect.andThen(completed));
  }

  #onSubagentProgress(
    session: LiveAdapterSession,
    frame: Record<string, unknown>,
  ): Effect.Effect<void> {
    const payload = frame.payload;
    if (!isRecord(payload)) {
      return Effect.void;
    }
    const progress = payload.progress;
    if (!isRecord(progress) || typeof progress.id !== "string") {
      return Effect.void;
    }
    const state = this.#getOrCreateSubagentState(session, progress.id);
    const description = readNonEmptyText(progress.task) ?? readNonEmptyText(payload.task);
    const role = readNonEmptyText(progress.agent) ?? readNonEmptyText(payload.agent);
    const toolUseId = readNonEmptyText(payload.parentToolCallId);
    const lastToolName =
      typeof progress.currentTool === "string" && progress.currentTool.length > 0
        ? progress.currentTool
        : undefined;
    const lastIntent =
      typeof progress.lastIntent === "string" && progress.lastIntent.length > 0
        ? progress.lastIntent
        : undefined;
    const currentToolArgs =
      typeof progress.currentToolArgs === "string" && progress.currentToolArgs.length > 0
        ? progress.currentToolArgs
        : undefined;
    const currentToolStartMs =
      typeof progress.currentToolStartMs === "number" &&
      Number.isFinite(progress.currentToolStartMs) &&
      progress.currentToolStartMs >= 0
        ? Math.floor(progress.currentToolStartMs)
        : undefined;
    const model = readOmpPayloadModel(progress);
    const effort = readOmpEffort(progress);
    const totalTokens =
      typeof progress.tokens === "number" &&
      Number.isFinite(progress.tokens) &&
      progress.tokens >= 0
        ? Math.floor(progress.tokens)
        : undefined;
    const toolUses =
      typeof progress.toolCount === "number" &&
      Number.isFinite(progress.toolCount) &&
      progress.toolCount >= 0
        ? Math.floor(progress.toolCount)
        : undefined;
    const durationMs =
      typeof progress.durationMs === "number" &&
      Number.isFinite(progress.durationMs) &&
      progress.durationMs >= 0
        ? Math.floor(progress.durationMs)
        : undefined;
    const typedUsage: RuntimeTaskUsage | undefined =
      totalTokens === undefined
        ? undefined
        : {
            totalTokens,
            ...(toolUses === undefined ? {} : { toolUses }),
            ...(durationMs === undefined ? {} : { durationMs }),
          };
    const status = runtimeTaskStatusFromOmpProgress(progress.status);
    const agentIndex = readNonNegativeInt(progress.index);
    if (description !== undefined) {
      state.description = description;
    }
    if (role !== undefined) {
      state.role = role;
    }
    if (toolUseId !== undefined) {
      state.toolUseId = toolUseId;
    }
    if (agentIndex !== undefined) {
      state.agentIndex = agentIndex;
    }
    if (model !== undefined) {
      state.model = model;
    }
    if (effort !== undefined) {
      state.effort = effort;
    }
    if (typedUsage !== undefined) {
      state.typedUsage = typedUsage;
    }
    if (progress.usage !== undefined) {
      state.usage = progress.usage;
    }
    const summary = readOmpRecentOutput(progress.recentOutput) ?? lastIntent;
    const error = readOmpErrorText(progress.retryFailure);
    return this.#rememberSubagentTranscript(
      session,
      progress.id,
      progress.sessionFile ?? payload.sessionFile,
    ).pipe(
      Effect.andThen(
        this.#emitSubagentTaskProgress(session, state, {
          ...(status === undefined ? {} : { status }),
          ...(summary === undefined ? {} : { summary }),
          ...(error === undefined ? {} : { error }),
          ...(lastToolName === undefined ? {} : { lastToolName }),
          ...(lastIntent === undefined ? {} : { lastIntent }),
          ...(currentToolArgs === undefined ? {} : { currentToolArgs }),
          ...(currentToolStartMs === undefined ? {} : { currentToolStartMs }),
        }),
      ),
    );
  }

  #rememberSubagentTranscript(
    session: LiveAdapterSession,
    subagentId: string,
    sessionFile: unknown,
  ): Effect.Effect<void> {
    const store = this.#subagentTranscriptStore;
    const childSessionFile = readNonEmptyText(sessionFile);
    if (store === undefined || childSessionFile === undefined) {
      return Effect.void;
    }
    return store
      .remember({
        threadId: session.threadId,
        subagentId,
        rootSessionFile: session.sessionFile,
        sessionFile: childSessionFile,
      })
      .pipe(Effect.asVoid, Effect.ignore);
  }

  #getOrCreateSubagentState(session: LiveAdapterSession, id: string): OmpSubagentState {
    const existing = session.subagentStates.get(id);
    if (existing !== undefined) {
      return existing;
    }
    const state: OmpSubagentState = {
      id,
      description: id,
      role: undefined,
      toolUseId: undefined,
      agentIndex: undefined,
      model: undefined,
      effort: undefined,
      summary: undefined,
      error: undefined,
      usage: undefined,
      typedUsage: undefined,
    };
    session.subagentStates.set(id, state);
    return state;
  }

  #emitSubagentTaskProgress(
    session: LiveAdapterSession,
    state: OmpSubagentState,
    input: {
      readonly status?: RuntimeTaskStatus;
      readonly summary?: string;
      readonly error?: string;
      readonly lastToolName?: string;
      readonly lastIntent?: string;
      readonly currentToolArgs?: string;
      readonly currentToolStartMs?: number;
    } = {},
  ): Effect.Effect<void> {
    if (input.summary !== undefined) {
      state.summary = truncateSubagentActivity(input.summary);
    }
    if (input.error !== undefined) {
      state.error = truncateSubagentActivity(input.error);
    }
    return this.#emit({
      type: "task.progress",
      threadId: session.threadId,
      turnId: session.turnId,
      payload: {
        taskId: RuntimeTaskId.make(state.id),
        description: state.description,
        ...(state.summary === undefined ? {} : { summary: state.summary }),
        ...(input.status === undefined ? {} : { status: input.status }),
        ...(state.error === undefined ? {} : { error: state.error }),
        ...(state.usage === undefined ? {} : { usage: state.usage }),
        ...(state.typedUsage === undefined ? {} : { typedUsage: state.typedUsage }),
        ...(state.model === undefined ? {} : { model: state.model }),
        ...(state.effort === undefined ? {} : { effort: state.effort }),
        ...(state.role === undefined ? {} : { role: state.role }),
        ...(state.toolUseId === undefined ? {} : { toolUseId: state.toolUseId }),
        ...(state.agentIndex === undefined ? {} : { agentIndex: state.agentIndex }),
        ...(input.lastToolName === undefined ? {} : { lastToolName: input.lastToolName }),
        ...(input.lastIntent === undefined ? {} : { lastIntent: input.lastIntent }),
        ...(input.currentToolArgs === undefined ? {} : { currentToolArgs: input.currentToolArgs }),
        ...(input.currentToolStartMs === undefined
          ? {}
          : { currentToolStartMs: input.currentToolStartMs }),
      },
    });
  }

  #onSubagentEvent(
    session: LiveAdapterSession,
    frame: Record<string, unknown>,
  ): Effect.Effect<void> {
    const payload = frame.payload;
    if (!isRecord(payload) || typeof payload.id !== "string" || !isRecord(payload.event)) {
      return Effect.void;
    }
    const event = payload.event;
    if (typeof event.type !== "string") {
      return Effect.void;
    }
    const state = this.#getOrCreateSubagentState(session, payload.id);
    const model = readOmpPayloadModel(event);
    const effort = readOmpEffort(event);
    const usage = readOmpTaskUsage(event.usage);
    if (model !== undefined) {
      state.model = model;
    }
    if (effort !== undefined) {
      state.effort = effort;
    }
    if (usage !== undefined) {
      state.typedUsage = usage;
    }
    if (event.usage !== undefined) {
      state.usage = event.usage;
    }

    if (event.type === "turn_start") {
      state.error = undefined;
      state.summary = undefined;
    }

    if (event.type === "tool_execution_start") {
      return this.#emitSubagentToolProgress(session, state, event);
    }
    if (event.type === "tool_execution_update") {
      return Effect.void;
    }
    if (event.type === "tool_execution_end") {
      return this.#emitSubagentToolProgress(session, state, event);
    }

    const isRetryOrCompaction = event.type.includes("retry") || event.type.includes("compaction");
    const isBoundary =
      event.type === "message_end" ||
      event.type === "agent_end" ||
      (isRetryOrCompaction && (event.type.endsWith("start") || event.type.endsWith("end")));
    if (!isBoundary) {
      return Effect.void;
    }

    let summary = readOmpEventText(event);
    let error: string | undefined;
    if (event.type === "agent_end") {
      error = readOmpAgentEndError(event);
      summary = readLatestAssistantText(event.messages) ?? summary;
      if (Array.isArray(event.messages)) {
        for (const message of event.messages) {
          const assistantModel = readOmpAssistantModel(message);
          if (assistantModel !== undefined) {
            state.model = assistantModel;
          }
        }
      }
    } else if (event.type === "message_end") {
      const message = event.message;
      const outcome = readOmpAssistantOutcome(message);
      error = outcome === undefined ? undefined : formatOmpAssistantError(outcome);
      summary = readOmpMessageText(message) ?? summary;
      const assistantModel = readOmpAssistantModel(message);
      if (assistantModel !== undefined) {
        state.model = assistantModel;
      }
    }
    if (isRetryOrCompaction) {
      error = readOmpErrorText(event.errorMessage ?? event.error) ?? error;
      if (error === undefined && event.type.endsWith("end")) {
        state.error = undefined;
      }
    }
    const status = isRetryOrCompaction
      ? event.type.endsWith("start")
        ? ("waiting" as const)
        : ("running" as const)
      : undefined;
    return this.#emitSubagentTaskProgress(session, state, {
      ...(status === undefined ? {} : { status }),
      ...(summary === undefined
        ? isRetryOrCompaction
          ? { summary: event.type }
          : {}
        : { summary }),
      ...(error === undefined ? {} : { error }),
    });
  }

  #emitSubagentToolProgress(
    session: LiveAdapterSession,
    state: OmpSubagentState,
    event: Record<string, unknown>,
  ): Effect.Effect<void> {
    const toolUseId = readNonEmptyText(event.toolCallId) ?? readNonEmptyText(event.toolUseId);
    const toolName = readNonEmptyText(event.toolName);
    const output = formatOmpToolOutputText(event.partialResult ?? event.result);
    const summary =
      readNonEmptyText(event.intent) ??
      (output.length > 0 ? truncateSubagentActivity(output) : toolName);
    const toolProgress = this.#emit({
      type: "tool.progress",
      threadId: session.threadId,
      turnId: session.turnId,
      payload: {
        taskId: RuntimeTaskId.make(state.id),
        ...(toolUseId === undefined ? {} : { toolUseId }),
        ...(toolName === undefined ? {} : { toolName }),
        ...(summary === undefined ? {} : { summary }),
        ...(state.toolUseId === undefined ? {} : { parentToolUseId: state.toolUseId }),
      },
    });
    if (event.type !== "tool_execution_end" || event.isError !== true) {
      return toolProgress;
    }
    const error = summary ?? "subagent tool execution failed";
    return toolProgress.pipe(
      Effect.flatMap(() =>
        this.#emitSubagentTaskProgress(session, state, { error, summary: error }),
      ),
    );
  }

  #onMessageStart(
    session: LiveAdapterSession,
    frame: Record<string, unknown>,
  ): Effect.Effect<void> {
    const message = frame.message;
    if (isRecord(message) && message.role === "custom" && message.customType === "advisor") {
      return this.#onAdvisorMessage(session, message);
    }
    if (!isRecord(message) || message.role !== "assistant") {
      return Effect.void;
    }
    return this.#demoteHeldBackRun(session);
  }

  /**
   * omp advisor cards arrive as message_start frames with role "custom" and
   * customType "advisor". The batched notes live in details.notes; the
   * formatted <advisory> content stays out of the assistant text stream.
   */
  #onAdvisorMessage(
    session: LiveAdapterSession,
    message: Record<string, unknown>,
  ): Effect.Effect<void> {
    const details = message.details;
    if (!isRecord(details) || !Array.isArray(details.notes)) {
      return Effect.void;
    }
    const notes: Array<{
      note: string;
      severity?: "nit" | "concern" | "blocker";
      advisor?: string;
    }> = [];
    for (const entry of details.notes) {
      if (!isRecord(entry) || typeof entry.note !== "string" || entry.note.length === 0) {
        continue;
      }
      const severity =
        entry.severity === "nit" || entry.severity === "concern" || entry.severity === "blocker"
          ? entry.severity
          : undefined;
      const advisor =
        typeof entry.advisor === "string" && entry.advisor.length > 0 ? entry.advisor : undefined;
      notes.push({
        note: entry.note,
        ...(severity === undefined ? {} : { severity }),
        ...(advisor === undefined ? {} : { advisor }),
      });
    }
    if (notes.length === 0) {
      return Effect.void;
    }
    return this.#emit({
      type: "advisor.comment",
      threadId: session.threadId,
      turnId: session.turnId,
      payload: { notes },
    });
  }

  /**
   * Time-traveling stream rule firings arrive as raw session events with a
   * rules array. The wire payload is bounded to name/path/description/
   * condition/scope/interruptMode; the full rule content stays on disk.
   */
  #onTtsrTriggered(
    session: LiveAdapterSession,
    frame: Record<string, unknown>,
  ): Effect.Effect<void> {
    if (!Array.isArray(frame.rules)) {
      return Effect.void;
    }
    const rules: Array<{
      name: string;
      path: string;
      description?: string;
      condition?: string[];
      scope?: string[];
      interruptMode?: "never" | "prose-only" | "tool-only" | "always";
    }> = [];
    for (const rule of frame.rules) {
      if (!isRecord(rule) || typeof rule.name !== "string" || typeof rule.path !== "string") {
        continue;
      }
      const description =
        typeof rule.description === "string" && rule.description.length > 0
          ? rule.description
          : undefined;
      const condition = toRuleStringArray(rule.condition);
      const scope = toRuleStringArray(rule.scope);
      const interruptMode =
        rule.interruptMode === "never" ||
        rule.interruptMode === "prose-only" ||
        rule.interruptMode === "tool-only" ||
        rule.interruptMode === "always"
          ? rule.interruptMode
          : undefined;
      rules.push({
        name: rule.name,
        path: rule.path,
        ...(description === undefined ? {} : { description }),
        ...(condition === undefined ? {} : { condition }),
        ...(scope === undefined ? {} : { scope }),
        ...(interruptMode === undefined ? {} : { interruptMode }),
      });
    }
    if (rules.length === 0) {
      return Effect.void;
    }
    return this.#emit({
      type: "ttsr.triggered",
      threadId: session.threadId,
      turnId: session.turnId,
      payload: { rules },
    });
  }

  #onMessageEnd(session: LiveAdapterSession, frame: Record<string, unknown>): Effect.Effect<void> {
    const message = frame.message;
    const outcome = readOmpAssistantOutcome(message);
    if (outcome === undefined) {
      return Effect.void;
    }
    session.lastAssistantOutcome = outcome;
    session.heldBackRunText = session.openRunText;
    session.openRunText = null;
    return Effect.void;
  }

  #onCommandOutput(
    session: LiveAdapterSession,
    frame: Record<string, unknown>,
  ): Effect.Effect<void> {
    const text = typeof frame.text === "string" ? frame.text : "";
    if (text.length === 0) {
      return Effect.void;
    }
    return this.#emit({
      type: "content.delta",
      threadId: session.threadId,
      turnId: session.turnId,
      payload: {
        streamKind: "status_text",
        delta: text,
      },
    });
  }

  #onMessageUpdate(
    session: LiveAdapterSession,
    frame: Record<string, unknown>,
  ): Effect.Effect<void> {
    const event = frame.assistantMessageEvent;
    if (!isRecord(event) || typeof event.type !== "string") {
      return Effect.void;
    }
    if (event.type === "text_delta") {
      const delta = event.delta;
      if (typeof delta !== "string" || delta.length === 0) {
        return Effect.void;
      }
      session.openRunText = `${session.openRunText ?? ""}${delta}`;
      return Effect.void;
    }
    if (event.type === "thinking_delta") {
      const delta = event.delta;
      if (typeof delta !== "string" || delta.length === 0) {
        return Effect.void;
      }
      return this.#emit({
        type: "content.delta",
        threadId: session.threadId,
        turnId: session.turnId,
        payload: {
          streamKind: "reasoning_text",
          delta,
        },
      });
    }
    if (event.type === "toolcall_end") {
      const toolCall = event.toolCall;
      if (
        !isRecord(toolCall) ||
        typeof toolCall.id !== "string" ||
        typeof toolCall.name !== "string"
      ) {
        return Effect.void;
      }
      return this.#emitToolItemStarted(session, {
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        args: toolCall.arguments,
        intent: typeof toolCall.intent === "string" ? toolCall.intent : undefined,
      });
    }
    return Effect.void;
  }

  #onToolExecutionStart(
    session: LiveAdapterSession,
    frame: Record<string, unknown>,
  ): Effect.Effect<void> {
    if (typeof frame.toolCallId !== "string" || typeof frame.toolName !== "string") {
      return Effect.void;
    }
    return this.#emitToolItemStarted(session, {
      toolCallId: frame.toolCallId,
      toolName: frame.toolName,
      args: frame.args,
      intent: typeof frame.intent === "string" ? frame.intent : undefined,
    });
  }

  #onToolExecutionUpdate(
    session: LiveAdapterSession,
    frame: Record<string, unknown>,
  ): Effect.Effect<void> {
    if (typeof frame.toolCallId !== "string") {
      return Effect.void;
    }
    const delta = formatOmpToolOutputText(frame.partialResult);
    if (delta.length === 0) {
      return Effect.void;
    }
    return this.#emit({
      type: "content.delta",
      threadId: session.threadId,
      turnId: session.turnId,
      itemId: RuntimeItemId.make(frame.toolCallId),
      payload: {
        streamKind: "command_output",
        delta,
      },
    });
  }

  #onToolExecutionEnd(
    session: LiveAdapterSession,
    frame: Record<string, unknown>,
  ): Effect.Effect<void> {
    if (typeof frame.toolCallId !== "string" || typeof frame.toolName !== "string") {
      return Effect.void;
    }
    const toolCallId = frame.toolCallId;
    const toolName = frame.toolName;
    const isError = frame.isError === true;
    const tracked = session.toolCalls.get(toolCallId);
    const args = frame.args !== undefined ? frame.args : tracked?.args;
    const intent = typeof frame.intent === "string" ? frame.intent : tracked?.intent;
    const presentation = this.#toolPresentation.present({
      toolCallId,
      toolName,
      args,
      intent,
      result: frame.result,
      isError,
    });
    session.toolCalls.delete(toolCallId);
    return this.#emit({
      type: "item.completed",
      threadId: session.threadId,
      turnId: session.turnId,
      itemId: RuntimeItemId.make(toolCallId),
      payload: {
        itemType: presentation.itemType,
        status: isError ? "failed" : "completed",
        title: presentation.title,
        ...(presentation.detail !== undefined ? { detail: presentation.detail } : {}),
        data: presentation.data,
      },
    });
  }

  #emitToolItemStarted(
    session: LiveAdapterSession,
    input: {
      readonly toolCallId: string;
      readonly toolName: string;
      readonly args: unknown;
      readonly intent: string | undefined;
    },
  ): Effect.Effect<void> {
    if (session.toolCalls.has(input.toolCallId)) {
      return Effect.void;
    }
    session.toolCalls.set(input.toolCallId, {
      toolName: input.toolName,
      args: input.args,
      intent: input.intent,
    });
    const presentation = this.#toolPresentation.present(input);
    return this.#emit({
      type: "item.started",
      threadId: session.threadId,
      turnId: session.turnId,
      itemId: RuntimeItemId.make(input.toolCallId),
      payload: {
        itemType: presentation.itemType,
        status: "inProgress",
        title: presentation.title,
        ...(presentation.detail !== undefined ? { detail: presentation.detail } : {}),
        data: presentation.data,
      },
    });
  }

  #demoteHeldBackRun(session: LiveAdapterSession): Effect.Effect<void> {
    const text = session.heldBackRunText;
    session.heldBackRunText = null;
    if (text === null || text.length === 0) {
      return Effect.void;
    }
    if (session.interactionMode === "review") {
      // Review turns decode the findings block from the turn's assistant text,
      // and the agent may emit the block and then keep working (trailing tool
      // calls, a closing prose run). Park the closed run into the open buffer
      // instead of demoting it to status_text so the terminal extraction still
      // sees the block — the last fence in the accumulated text wins.
      session.openRunText = `${session.openRunText ?? ""}${text}`;
      return Effect.void;
    }
    // A completed prose run superseded by a later message (a rule interrupt,
    // a trailing tool call, the closing answer) is real assistant output the
    // user already saw. Surface it as a reasoning line item instead of
    // concatenating it into the message body — only the turn's final run
    // becomes the assistant message body.
    return Effect.gen({ self: this }, function* () {
      const itemId = RuntimeItemId.make(yield* this.#randomUUID);
      yield* this.#emit({
        type: "item.started",
        threadId: session.threadId,
        turnId: session.turnId,
        itemId,
        payload: {
          itemType: "reasoning",
          status: "inProgress",
          title: "Thinking",
          detail: text,
        },
      });
      yield* this.#emit({
        type: "item.completed",
        threadId: session.threadId,
        turnId: session.turnId,
        itemId,
        payload: {
          itemType: "reasoning",
          status: "completed",
          title: "Thinking",
          detail: text,
        },
      });
    });
  }

  #flushFinalAssistantRun(session: LiveAdapterSession): Effect.Effect<void> {
    const text = session.heldBackRunText ?? session.openRunText;
    session.heldBackRunText = null;
    session.openRunText = null;
    if (text === null || text.length === 0) {
      return Effect.void;
    }
    return this.#emit({
      type: "content.delta",
      threadId: session.threadId,
      turnId: session.turnId,
      payload: {
        streamKind: "assistant_text",
        delta: text,
      },
    });
  }

  #emitTurnCompleted(session: LiveAdapterSession, agentErrorMessage?: string): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      // Capture the final assistant text before the flush nulls it; a review
      // turn's findings are decoded from it.
      const runText = session.heldBackRunText ?? session.openRunText;
      // Plan-mode turns produce the plan as their final text. Surface it as a
      // first-class proposed plan so the timeline renders the plan card —
      // workflow-agnostic: any provider's plan mode lands here.
      if (session.interactionMode === "plan" && runText !== null && runText.trim().length > 0) {
        yield* this.#emit({
          type: "turn.proposed.completed",
          threadId: session.threadId,
          turnId: session.turnId,
          payload: {
            planMarkdown: runText,
          },
        });
      }
      yield* this.#flushFinalAssistantRun(session);
      const now = yield* Clock.currentTimeMillis;
      yield* this.#emitTokenUsageFromState(session, now).pipe(Effect.ignore);
      const aborted = session.stopRequested;
      session.stopRequested = false;
      const turnId = session.turnId;
      // Clear the in-flight marker so a later transport end (child exit while
      // idle) cannot emit a spurious turn.aborted for an already-finished turn.
      session.turnId = undefined;
      if (aborted) {
        yield* this.#emit({
          type: "turn.aborted",
          threadId: session.threadId,
          turnId,
          payload: { reason: "user_abort" },
        });
      } else if (agentErrorMessage !== undefined) {
        yield* this.#emit({
          type: "turn.completed",
          threadId: session.threadId,
          turnId,
          payload: { state: "failed", errorMessage: agentErrorMessage },
        });
      } else if (session.interactionMode === "review") {
        // Emit findings first so the stream carries them before the terminal
        // frame; a malformed findings block fails the turn so the run surfaces
        // the error rather than silently dropping findings.
        const outcome = yield* this.#emitReviewFindings(session, turnId, runText);
        yield* this.#emit({
          type: "turn.completed",
          threadId: session.threadId,
          turnId,
          payload:
            outcome._tag === "ok"
              ? {
                  state: "completed",
                  ...(outcome.verdict === undefined ? {} : { verdict: outcome.verdict }),
                  ...(outcome.summary === undefined ? {} : { summary: outcome.summary }),
                  ...(outcome.filesReviewed === undefined
                    ? {}
                    : { filesReviewed: outcome.filesReviewed }),
                  ...(outcome.lineCoverage === undefined
                    ? {}
                    : { lineCoverage: outcome.lineCoverage }),
                }
              : { state: "failed", errorMessage: outcome.errorMessage },
        });
      } else {
        yield* this.#emit({
          type: "turn.completed",
          threadId: session.threadId,
          turnId,
          payload: { state: "completed" },
        });
      }
      // OMP v18.0.11 has no child-targeted cancel RPC. A parent abort settles
      // only the parent turn; background task jobs retain their own lifecycle
      // and must not cause the root RPC session to be torn down.
    });
  }

  #extractReviewFindings(runText: string | null): Effect.Effect<{
    readonly findings: ReadonlyArray<ReviewFinding>;
    readonly verdict?: ReviewRunVerdict;
    readonly summary?: string;
    readonly filesReviewed?: ReadonlyArray<string>;
    readonly lineCoverage?: ReadonlyArray<ReviewFileLineCoverage>;
  } | null> {
    return Effect.gen({ self: this }, function* () {
      const decoded = this.#reviewBlockDecoder.decode(runText);
      if (decoded === null) {
        return null;
      }
      const findings: ReviewFinding[] = [];
      for (const entry of decoded.findings) {
        findings.push({ id: `finding-${yield* this.#randomUUID}`, ...entry });
      }
      return {
        findings,
        ...(decoded.verdict === undefined ? {} : { verdict: decoded.verdict }),
        ...(decoded.summary === undefined ? {} : { summary: decoded.summary }),
        ...(decoded.filesReviewed === undefined ? {} : { filesReviewed: decoded.filesReviewed }),
        ...(decoded.coverage === undefined ? {} : { lineCoverage: decoded.coverage }),
      };
    });
  }

  #emitReviewFindings(
    session: LiveAdapterSession,
    turnId: TurnId | undefined,
    runText: string | null,
  ): Effect.Effect<
    | {
        readonly _tag: "ok";
        readonly verdict?: ReviewRunVerdict;
        readonly summary?: string;
        readonly filesReviewed?: ReadonlyArray<string>;
        readonly lineCoverage?: ReadonlyArray<ReviewFileLineCoverage>;
      }
    | { readonly _tag: "error"; readonly errorMessage: string }
  > {
    return Effect.gen({ self: this }, function* () {
      const extracted = yield* this.#extractReviewFindings(runText);
      if (extracted === null) {
        return {
          _tag: "error",
          errorMessage: "Review run finished without a parseable findings block.",
        } as const;
      }
      for (const finding of extracted.findings) {
        yield* this.#emit({
          type: "review.finding",
          threadId: session.threadId,
          turnId,
          payload: finding,
        });
      }
      return {
        _tag: "ok",
        ...(extracted.verdict === undefined ? {} : { verdict: extracted.verdict }),
        ...(extracted.summary === undefined ? {} : { summary: extracted.summary }),
        ...(extracted.filesReviewed === undefined
          ? {}
          : { filesReviewed: extracted.filesReviewed }),
        ...(extracted.lineCoverage === undefined ? {} : { lineCoverage: extracted.lineCoverage }),
      } as const;
    });
  }

  #maybeEmitLiveTokenUsage(session: LiveAdapterSession): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      if (session.turnId === undefined) {
        return;
      }
      const now = yield* Clock.currentTimeMillis;
      if (now - session.lastTokenUsageEmitAtMs < TOKEN_USAGE_EMIT_MIN_INTERVAL_MS) {
        return;
      }
      yield* this.#emitTokenUsageFromState(session, now).pipe(Effect.ignore);
    });
  }

  #emitTokenUsageFromState(
    session: LiveAdapterSession,
    now: number,
  ): Effect.Effect<void, ProviderAdapterProcessError | ProviderAdapterSessionNotFoundError> {
    return Effect.gen({ self: this }, function* () {
      // D2/D3: claim the throttle slot synchronously, before any RPC yield. The
      // slot is consumed even if the emit later fails or early-returns (no tokens).
      session.lastTokenUsageEmitAtMs = now;
      const response = yield* this.#send(session.threadId, {
        type: "get_state",
      });
      if (!isRecord(response) || !isRecord(response.data)) {
        return;
      }
      const state = response.data;
      const contextUsage = state.contextUsage;
      if (!isRecord(contextUsage) || typeof contextUsage.tokens !== "number") {
        return;
      }
      const usedTokens = Math.max(0, Math.floor(contextUsage.tokens));
      if (usedTokens <= 0) {
        return;
      }
      const maxTokens =
        typeof contextUsage.contextWindow === "number" && contextUsage.contextWindow > 0
          ? Math.floor(contextUsage.contextWindow)
          : undefined;
      const contextUsedPercent =
        typeof contextUsage.percent === "number" && Number.isFinite(contextUsage.percent)
          ? Math.min(100, Math.max(0, Math.round(contextUsage.percent * 10) / 10))
          : undefined;
      const tokensPerSecond =
        typeof state.tokensPerSecond === "number" && Number.isFinite(state.tokensPerSecond)
          ? state.tokensPerSecond
          : undefined;
      const queuedMessageCount =
        typeof state.queuedMessageCount === "number" && state.queuedMessageCount >= 0
          ? Math.floor(state.queuedMessageCount)
          : undefined;
      const statsResponse = yield* this.#send(session.threadId, {
        type: "get_session_stats",
      }).pipe(Effect.orElseSucceed(() => undefined));
      const stats =
        statsResponse !== undefined && isRecord(statsResponse) && isRecord(statsResponse.data)
          ? statsResponse.data
          : undefined;
      const tokens = stats !== undefined && isRecord(stats.tokens) ? stats.tokens : undefined;
      yield* this.#emit({
        type: "thread.token-usage.updated",
        threadId: session.threadId,
        turnId: session.turnId,
        payload: {
          usage: {
            usedTokens,
            ...(maxTokens === undefined ? {} : { maxTokens }),
            ...(contextUsedPercent === undefined ? {} : { contextUsedPercent }),
            ...(tokensPerSecond === undefined ? {} : { tokensPerSecond }),
            ...(queuedMessageCount === undefined ? {} : { queuedMessageCount }),
            ...(tokens !== undefined && typeof tokens.input === "number"
              ? { inputTokens: Math.max(0, Math.floor(tokens.input)) }
              : {}),
            ...(tokens !== undefined && typeof tokens.output === "number"
              ? { outputTokens: Math.max(0, Math.floor(tokens.output)) }
              : {}),
            ...(tokens !== undefined && typeof tokens.reasoning === "number"
              ? {
                  reasoningOutputTokens: Math.max(0, Math.floor(tokens.reasoning)),
                }
              : {}),
            ...(stats !== undefined && typeof stats.toolUses === "number"
              ? { toolUses: Math.max(0, Math.floor(stats.toolUses)) }
              : {}),
            ...(stats !== undefined && typeof stats.durationMs === "number"
              ? { durationMs: Math.max(0, Math.floor(stats.durationMs)) }
              : {}),
          },
        },
      });
    });
  }

  #applyTurnOptions(threadId: ThreadId, options: ReadonlyArray<OmpModelOption> | undefined) {
    return Effect.gen({ self: this }, function* () {
      if (options === undefined) {
        return;
      }
      const fastMode = resolveOmpFastMode(options);
      let serviceTierSent = false;
      for (const option of options) {
        if (
          (option.id === "effort" ||
            option.id === "thinking" ||
            option.id === "reasoningEffort" ||
            option.id === "thinkingLevel") &&
          typeof option.value === "string"
        ) {
          yield* this.#send(threadId, {
            type: "set_thinking_level",
            level: option.value,
          });
        }
        if (option.id === "serviceTier" && !serviceTierSent) {
          serviceTierSent = true;
          if (fastMode.enabled !== undefined) {
            yield* this.#send(threadId, {
              type: "set_fast_mode",
              enabled: fastMode.enabled,
            });
          }
        }
        if (
          option.id === "fastMode" &&
          !fastMode.hasServiceTier &&
          typeof option.value === "boolean"
        ) {
          yield* this.#send(threadId, {
            type: "set_fast_mode",
            enabled: option.value,
          });
        }
      }
    });
  }

  #onHostUriRequest(
    session: LiveAdapterSession,
    frame: Record<string, unknown>,
  ): Effect.Effect<void> {
    if (typeof frame.id !== "string" || frame.id.length === 0) {
      return Effect.void;
    }
    const operation = frame.operation === "write" ? "write" : "read";
    const url = typeof frame.url === "string" ? frame.url : "";
    const title = operation === "write" ? "Accept proposed edit" : "Allow host URI read";
    const detail = url.length > 0 ? `${title}\n${url}` : title;
    session.pendingUiRequests.set(frame.id, {
      kind: "host_uri",
      ompId: frame.id,
    });
    return this.#emit({
      type: "request.opened",
      threadId: session.threadId,
      turnId: session.turnId,
      requestId: RuntimeRequestId.make(frame.id),
      payload: {
        requestType: operation === "write" ? "file_change_approval" : "file_read_approval",
        detail,
      },
    });
  }

  #onHostUriCancel(
    session: LiveAdapterSession,
    frame: Record<string, unknown>,
  ): Effect.Effect<void> {
    const targetId = typeof frame.targetId === "string" ? frame.targetId : undefined;
    if (targetId === undefined) {
      return Effect.void;
    }
    const pending = session.pendingUiRequests.get(targetId);
    if (!pending || pending.kind !== "host_uri") {
      return Effect.void;
    }
    session.pendingUiRequests.delete(targetId);
    return this.#emit({
      type: "request.resolved",
      threadId: session.threadId,
      turnId: session.turnId,
      requestId: RuntimeRequestId.make(targetId),
      payload: { requestType: "file_change_approval", decision: "cancel" },
    });
  }

  #applyInteractionMode(
    session: LiveAdapterSession,
    mode: ProviderTurnInteractionMode | undefined,
  ) {
    return Effect.gen({ self: this }, function* () {
      if (mode === undefined || mode === session.interactionMode) {
        return;
      }
      if (mode === "plan") {
        session.prePlanModelSlug = yield* this.#readCurrentModelSlug(session.threadId);
        const planSlug = yield* this.#resolveRoleModel("plan");
        if (planSlug !== undefined) {
          yield* this.#applyModelSelection(session.threadId, planSlug);
        }
        session.interactionMode = "plan";
        return;
      }
      if (mode === "review") {
        session.preReviewModelSlug = yield* this.#readCurrentModelSlug(session.threadId);
        const reviewSlug = yield* this.#resolveRoleModel("review");
        if (reviewSlug !== undefined) {
          yield* this.#applyModelSelection(session.threadId, reviewSlug);
        }
        session.interactionMode = "review";
        return;
      }
      const restoreSlug = session.prePlanModelSlug ?? session.preReviewModelSlug;
      session.prePlanModelSlug = undefined;
      session.preReviewModelSlug = undefined;
      session.interactionMode = "default";
      if (restoreSlug !== undefined) {
        yield* this.#applyModelSelection(session.threadId, restoreSlug);
      }
    });
  }

  #readCurrentModelSlug(threadId: ThreadId) {
    return Effect.gen({ self: this }, function* () {
      const response = yield* this.#send(threadId, { type: "get_state" });
      if (!isRecord(response) || !isRecord(response.data)) {
        return undefined;
      }
      const model = response.data.model;
      if (!isRecord(model)) {
        return undefined;
      }
      if (typeof model.provider !== "string" || typeof model.id !== "string") {
        return undefined;
      }
      return `${model.provider}/${model.id}`;
    });
  }

  #applyModelSelection(threadId: ThreadId, model: string | undefined) {
    return Effect.gen({ self: this }, function* () {
      if (model === undefined) {
        return;
      }
      const parsed = parseOmpModelSlug(model);
      if (!parsed) {
        yield* this.#clearLiveSession(threadId);
        return yield* new ProviderAdapterRequestError({
          provider: PROVIDER,
          method: "set_model",
          detail: `invalid omp model slug: ${model}`,
        });
      }
      const exit = yield* Effect.exit(
        this.#send(threadId, {
          type: "set_model",
          provider: parsed.provider,
          modelId: parsed.modelId,
        }),
      );
      if (Exit.isFailure(exit)) {
        yield* this.#clearLiveSession(threadId);
        const cause = Cause.squash(exit.cause);
        return yield* new ProviderAdapterRequestError({
          provider: PROVIDER,
          method: "set_model",
          detail: cause instanceof Error ? cause.message : String(cause),
        });
      }
    });
  }

  #send(threadId: ThreadId, command: Record<string, unknown>) {
    return this.#runtime
      .send(threadId, command)
      .pipe(Effect.mapError((cause) => mapOmpSpawnError(threadId, cause)));
  }

  #onSessionTransportEnded(session: LiveAdapterSession): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      if (this.#sessions.get(session.threadId) !== session) {
        // Session was already cleared (deliberate teardown or a racing stop);
        // do not double-settle.
        return;
      }
      const turnId = session.turnId;
      session.turnId = undefined;
      const stopRequested = session.stopRequested;
      session.stopRequested = false;
      if (turnId !== undefined) {
        yield* this.#emit({
          type: "turn.aborted",
          threadId: session.threadId,
          turnId,
          payload: { reason: stopRequested ? "user_abort" : "provider_exited" },
        });
      }
      yield* this.#emit({
        type: "session.exited",
        threadId: session.threadId,
        ...(turnId === undefined ? {} : { turnId }),
        payload: {
          reason: stopRequested
            ? "omp child exited before confirming the requested stop"
            : "omp rpc child exited unexpectedly",
          exitKind: "error",
        },
      });
      yield* this.#clearLiveSession(session.threadId);
    });
  }

  #clearLiveSession(threadId: ThreadId) {
    return Effect.gen({ self: this }, function* () {
      const session = this.#sessions.get(threadId);
      this.#sessions.delete(threadId);
      if (session) {
        yield* Scope.close(session.scope, Exit.void).pipe(Effect.ignore);
      }
      yield* this.#runtime.dispose(threadId);
      // The OMP process owns the MCP extension and, on Windows, may still
      // hold its SQLite cache while the adapter scope is closing. Remove the
      // process-private overlay only after both owners have been released.
      // The injector retains a bounded Busy fallback for residual handles.
      yield* this.#uninstallPreviewMcp(threadId);
    });
  }

  #installPreviewMcp(threadId: ThreadId): Effect.Effect<Record<string, string> | undefined> {
    const injector = this.#previewMcpInjector;
    const agentDir = this.#agentDir;
    const mcp = readMcpProviderSession(threadId);
    if (injector === undefined || agentDir === undefined || mcp === undefined) {
      return Effect.succeed(undefined);
    }
    return injector
      .install(threadId, mcp, agentDir)
      .pipe(Effect.map((installed) => installed.extraEnv));
  }

  #uninstallPreviewMcp(threadId: ThreadId): Effect.Effect<void> {
    const injector = this.#previewMcpInjector;
    if (injector === undefined) {
      return Effect.void;
    }
    return injector.uninstall(threadId);
  }

  #onExtensionUiRequest(
    session: LiveAdapterSession,
    frame: Record<string, unknown>,
  ): Effect.Effect<void> {
    const method = frame.method;
    if (method === "open_url") {
      const handler = session.onOpenUrl;
      if (handler && typeof frame.url === "string" && frame.url.length > 0) {
        return handler({
          url: frame.url,
          ...(typeof frame.launchUrl === "string" ? { launchUrl: frame.launchUrl } : {}),
          ...(typeof frame.instructions === "string" ? { instructions: frame.instructions } : {}),
        });
      }
      return Effect.void;
    }
    if (method === "cancel") {
      const targetId = typeof frame.targetId === "string" ? frame.targetId : undefined;
      if (targetId === undefined) {
        return Effect.void;
      }
      const pending = session.pendingUiRequests.get(targetId);
      if (!pending) {
        return Effect.void;
      }
      session.pendingUiRequests.delete(targetId);
      if (pending.kind === "confirm") {
        return this.#emit({
          type: "request.resolved",
          threadId: session.threadId,
          turnId: session.turnId,
          requestId: RuntimeRequestId.make(targetId),
          payload: {
            requestType: "command_execution_approval",
            decision: "cancel",
          },
        });
      }
      return this.#emit({
        type: "user-input.resolved",
        threadId: session.threadId,
        turnId: session.turnId,
        requestId: RuntimeRequestId.make(targetId),
        payload: { answers: {} },
      });
    }
    if (method === "notify") {
      const message = typeof frame.message === "string" ? frame.message : undefined;
      if (message === undefined || message.length === 0) {
        return Effect.void;
      }
      return this.#emit({
        type: "runtime.warning",
        threadId: session.threadId,
        turnId: session.turnId,
        payload: { message },
      });
    }
    if (typeof frame.id !== "string" || frame.id.length === 0) {
      return Effect.void;
    }
    if (method === "confirm") {
      const title = typeof frame.title === "string" ? frame.title : "Confirm";
      const message = typeof frame.message === "string" ? frame.message : "";
      const detail = message.length > 0 ? `${title}\n${message}` : title;
      session.pendingUiRequests.set(frame.id, {
        kind: "confirm",
        ompId: frame.id,
      });
      return this.#emit({
        type: "request.opened",
        threadId: session.threadId,
        turnId: session.turnId,
        requestId: RuntimeRequestId.make(frame.id),
        payload: {
          requestType: "command_execution_approval",
          detail,
        },
      });
    }
    if (method === "select") {
      const title = typeof frame.title === "string" ? frame.title : "Select";
      const options = Array.isArray(frame.options)
        ? frame.options.filter((option): option is string => typeof option === "string")
        : [];
      session.pendingUiRequests.set(frame.id, {
        kind: "select",
        ompId: frame.id,
      });
      return this.#emit({
        type: "user-input.requested",
        threadId: session.threadId,
        turnId: session.turnId,
        requestId: RuntimeRequestId.make(frame.id),
        payload: {
          questions: [
            {
              id: "choice",
              header: title,
              question: title,
              options: options.map((option) => ({
                label: option,
                description: option,
              })),
            },
          ],
        },
      });
    }
    if (method === "input" || method === "editor") {
      const title = typeof frame.title === "string" ? frame.title : "Input";
      const placeholder =
        typeof frame.placeholder === "string"
          ? frame.placeholder
          : typeof frame.prefill === "string"
            ? frame.prefill
            : "";
      session.pendingUiRequests.set(frame.id, {
        kind: method === "editor" ? "editor" : "input",
        ompId: frame.id,
      });
      return this.#emit({
        type: "user-input.requested",
        threadId: session.threadId,
        turnId: session.turnId,
        requestId: RuntimeRequestId.make(frame.id),
        payload: {
          questions: [
            {
              id: "input",
              header: title,
              question: placeholder.length > 0 ? placeholder : title,
              options: [],
            },
          ],
        },
      });
    }
    return Effect.void;
  }

  #emit(
    event: Omit<ProviderRuntimeEvent, "eventId" | "provider" | "createdAt"> & {
      readonly turnId?: TurnId | undefined;
    },
  ): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      const createdAt = yield* nowIso;
      const eventId = yield* this.#randomUUID.pipe(Effect.map(EventId.make));
      const { turnId, ...rest } = event;
      yield* Queue.offer(this.#events, {
        ...rest,
        eventId,
        provider: PROVIDER,
        createdAt,
        ...(turnId === undefined ? {} : { turnId }),
      } as ProviderRuntimeEvent);
    });
  }
}

function firstUserInputAnswer(answers: ProviderUserInputAnswers): string | undefined {
  for (const value of Object.values(answers)) {
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
    if (Array.isArray(value)) {
      const first = value.find((entry) => typeof entry === "string" && entry.length > 0);
      if (typeof first === "string") {
        return first;
      }
    }
  }
  return undefined;
}

function parseOmpModelSlug(slug: string): { provider: string; modelId: string } | null {
  const slash = slug.indexOf("/");
  if (slash <= 0 || slash === slug.length - 1) {
    return null;
  }
  return { provider: slug.slice(0, slash), modelId: slug.slice(slash + 1) };
}

function runtimeTaskStatusFromOmpProgress(status: unknown): RuntimeTaskStatus | undefined {
  switch (status) {
    case "pending":
    case "running":
    case "completed":
    case "failed":
      return status;
    case "aborted":
      return "cancelled";
    default:
      return undefined;
  }
}

function readNonEmptyText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readOmpRecentOutput(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = readNonEmptyText(item);
      if (text !== undefined) {
        return text;
      }
    }
    return undefined;
  }
  return readNonEmptyText(value);
}

function truncateSubagentActivity(value: string, maxLength = 500): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1)}…`;
}

function readNonNegativeInt(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : undefined;
}

function readOmpTaskUsage(value: unknown): RuntimeTaskUsage | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const totalTokens = readNonNegativeInt(value.totalTokens ?? value.tokens);
  if (totalTokens === undefined) {
    return undefined;
  }
  const inputTokens = readNonNegativeInt(value.inputTokens);
  const cachedInputTokens = readNonNegativeInt(value.cachedInputTokens);
  const outputTokens = readNonNegativeInt(value.outputTokens);
  const reasoningOutputTokens = readNonNegativeInt(value.reasoningOutputTokens);
  const toolUses = readNonNegativeInt(value.toolUses ?? value.toolCount);
  const durationMs = readNonNegativeInt(value.durationMs);
  return {
    totalTokens,
    ...(inputTokens === undefined ? {} : { inputTokens }),
    ...(cachedInputTokens === undefined ? {} : { cachedInputTokens }),
    ...(outputTokens === undefined ? {} : { outputTokens }),
    ...(reasoningOutputTokens === undefined ? {} : { reasoningOutputTokens }),
    ...(toolUses === undefined ? {} : { toolUses }),
    ...(durationMs === undefined ? {} : { durationMs }),
  };
}

function readOmpPayloadModel(value: Record<string, unknown>): string | undefined {
  // OMP puts an explicit thinking selection on resolvedModel. Keep ordinary
  // model ids opaque: providers may legitimately use a colon in an id.
  return readOmpModel(value.resolvedModel, true) ?? readOmpModel(value.model);
}

function readOmpModel(value: unknown, fromResolvedModel = false): string | undefined {
  const direct = readNonEmptyText(value);
  if (direct !== undefined) {
    return fromResolvedModel ? splitOmpResolvedModel(direct).model : direct;
  }
  if (!isRecord(value)) {
    return undefined;
  }
  const provider = readNonEmptyText(value.provider);
  const modelId = readNonEmptyText(value.id ?? value.modelId);
  if (provider === undefined || modelId === undefined) {
    return undefined;
  }
  const model = `${provider}/${modelId}`;
  return fromResolvedModel ? splitOmpResolvedModel(model).model : model;
}

function readOmpEffort(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const explicit =
    readNonEmptyText(value.effort) ??
    readNonEmptyText(value.thinkingLevel) ??
    readNonEmptyText(value.level);
  if (explicit !== undefined) {
    return explicit;
  }
  const resolvedModel = readNonEmptyText(value.resolvedModel);
  return resolvedModel === undefined ? undefined : splitOmpResolvedModel(resolvedModel).effort;
}

function splitOmpResolvedModel(value: string): {
  readonly model: string;
  readonly effort?: string;
} {
  const separator = value.lastIndexOf(":");
  if (separator <= 0 || separator === value.length - 1) {
    return { model: value };
  }
  const effort = value.slice(separator + 1);
  if (!(OMP_THINKING_LEVELS as readonly string[]).includes(effort)) {
    return { model: value };
  }
  const model = value.slice(0, separator);
  return model.includes("/") ? { model, effort } : { model: value };
}

function readOmpMessageText(value: unknown): string | undefined {
  if (!isRecord(value) || value.role !== "assistant") {
    return undefined;
  }
  const text = formatOmpToolOutputText(value);
  return text.length > 0 ? truncateSubagentActivity(text) : undefined;
}

function readLatestAssistantText(value: unknown): string | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  let latest: string | undefined;
  for (const message of value) {
    const text = readOmpMessageText(message);
    if (text !== undefined) {
      latest = text;
    }
  }
  return latest;
}

function readOmpAssistantModel(value: unknown): string | undefined {
  const outcome = readOmpAssistantOutcome(value);
  if (outcome === undefined) {
    return undefined;
  }
  const model = readNonEmptyText(outcome.model);
  if (model === undefined) {
    return undefined;
  }
  const provider = readNonEmptyText(outcome.provider);
  return provider === undefined ? model : `${provider}/${model}`;
}

function readOmpEventText(event: Record<string, unknown>): string | undefined {
  const direct = readNonEmptyText(event.text ?? event.message ?? event.reason ?? event.detail);
  if (direct !== undefined) {
    return truncateSubagentActivity(direct);
  }
  return readLatestAssistantText(event.messages);
}

function readOmpErrorText(value: unknown): string | undefined {
  const direct = readNonEmptyText(value);
  if (direct !== undefined) {
    return truncateSubagentActivity(direct);
  }
  if (!isRecord(value)) {
    return undefined;
  }
  return readOmpErrorText(value.errorMessage ?? value.error ?? value.message ?? value.detail);
}

function isLocalOnlyPromptResponse(response: object): boolean {
  return isRecord(response) && isRecord(response.data) && response.data.agentInvoked === false;
}

const OMP_THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const;
