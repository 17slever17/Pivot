import {
  CommandId,
  DEFAULT_PROVIDER_INTERACTION_MODE,
  EventId,
  MessageId,
  ProjectId,
  ProviderInstanceId,
  ThreadId,
  TurnId,
} from "@t3tools/contracts";
import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as NodeServices from "@effect/platform-node/NodeServices";

import { decideOrchestrationCommand } from "./decider.ts";
import { createEmptyReadModel, projectEvent } from "./projector.ts";

const eventId = (value: string): EventId => EventId.make(value);
const messageId = (value: string): MessageId => MessageId.make(value);
const projectId = (value: string): ProjectId => ProjectId.make(value);
const threadId = (value: string): ThreadId => ThreadId.make(value);
const turnId = (value: string): TurnId => TurnId.make(value);

it.layer(NodeServices.layer)("decider turn steering", (it) => {
  it.effect("records a clarification on the active OMP turn without starting a new turn", () =>
    Effect.gen(function* () {
      const now = "2026-01-01T00:00:00.000Z";
      const root = createEmptyReadModel(now);
      const withProject = yield* projectEvent(root, {
        sequence: 1,
        eventId: eventId("evt-project"),
        aggregateKind: "project",
        aggregateId: projectId("project-1"),
        type: "project.created",
        occurredAt: now,
        commandId: CommandId.make("cmd-project"),
        causationEventId: null,
        correlationId: CommandId.make("cmd-project"),
        metadata: {},
        payload: {
          projectId: projectId("project-1"),
          title: "Project",
          workspaceRoot: "/tmp/project",
          defaultModelSelection: null,
          scripts: [],
          createdAt: now,
          updatedAt: now,
        },
      });
      const withThread = yield* projectEvent(withProject, {
        sequence: 2,
        eventId: eventId("evt-thread"),
        aggregateKind: "thread",
        aggregateId: threadId("thread-1"),
        type: "thread.created",
        occurredAt: now,
        commandId: CommandId.make("cmd-thread"),
        causationEventId: null,
        correlationId: CommandId.make("cmd-thread"),
        metadata: {},
        payload: {
          threadId: threadId("thread-1"),
          projectId: projectId("project-1"),
          title: "Thread",
          modelSelection: {
            instanceId: ProviderInstanceId.make("omp"),
            model: "gpt-5.6-luna",
          },
          interactionMode: DEFAULT_PROVIDER_INTERACTION_MODE,
          runtimeMode: "full-access",
          agentMode: "single",
          branch: null,
          worktreePath: null,
          createdAt: now,
          updatedAt: now,
        },
      });
      const readModel = yield* projectEvent(withThread, {
        sequence: 3,
        eventId: eventId("evt-session"),
        aggregateKind: "thread",
        aggregateId: threadId("thread-1"),
        type: "thread.session-set",
        occurredAt: now,
        commandId: CommandId.make("cmd-session"),
        causationEventId: null,
        correlationId: CommandId.make("cmd-session"),
        metadata: {},
        payload: {
          threadId: threadId("thread-1"),
          session: {
            threadId: threadId("thread-1"),
            status: "running",
            providerName: "omp",
            runtimeMode: "full-access",
            activeTurnId: turnId("turn-1"),
            lastError: null,
            updatedAt: now,
          },
        },
      });

      const result = yield* decideOrchestrationCommand({
        command: {
          type: "thread.turn.steer",
          commandId: CommandId.make("cmd-steer"),
          threadId: threadId("thread-1"),
          turnId: turnId("turn-1"),
          message: {
            messageId: messageId("message-steer"),
            role: "user",
            text: "focus on the failing test",
            attachments: [],
          },
          createdAt: now,
        },
        readModel,
      });

      const events = Array.isArray(result) ? result : [result];
      expect(events.map((event) => event.type)).toEqual([
        "thread.message-sent",
        "thread.turn-steer-requested",
      ]);
      expect(events[0]?.payload).toMatchObject({
        threadId: threadId("thread-1"),
        messageId: messageId("message-steer"),
        role: "user",
        text: "focus on the failing test",
        turnId: turnId("turn-1"),
      });
      expect(events[1]?.payload).toEqual({
        threadId: threadId("thread-1"),
        turnId: turnId("turn-1"),
        messageId: messageId("message-steer"),
        createdAt: now,
      });
      expect(events[1]?.causationEventId).toBe(events[0]?.eventId ?? null);

      const rejected = yield* Effect.exit(
        decideOrchestrationCommand({
          command: {
            type: "thread.turn.steer",
            commandId: CommandId.make("cmd-steer-stale"),
            threadId: threadId("thread-1"),
            turnId: turnId("turn-stale"),
            message: {
              messageId: messageId("message-stale-steer"),
              role: "user",
              text: "this must stay queued instead",
              attachments: [],
            },
            createdAt: now,
          },
          readModel,
        }),
      );
      expect(rejected._tag).toBe("Failure");
    }),
  );
});
