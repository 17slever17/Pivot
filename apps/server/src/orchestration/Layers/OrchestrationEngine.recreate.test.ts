import {
  CommandId,
  DEFAULT_PROVIDER_INTERACTION_MODE,
  ProjectId,
  ProviderInstanceId,
  ThreadId,
} from "@t3tools/contracts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import { expect, it } from "vite-plus/test";

import { ServerConfig } from "../../config.ts";
import { OrchestrationCommandReceiptRepositoryLive } from "../../persistence/Layers/OrchestrationCommandReceipts.ts";
import { OrchestrationEventStoreLive } from "../../persistence/Layers/OrchestrationEventStore.ts";
import { SqlitePersistenceMemory } from "../../persistence/Layers/Sqlite.ts";
import * as RepositoryIdentityResolver from "../../project/RepositoryIdentityResolver.ts";
import * as ThreadBackgroundLiveness from "../ThreadBackgroundLiveness.ts";
import * as ThreadPlanProgress from "../ThreadPlanProgress.ts";
import { OrchestrationEngineService } from "../Services/OrchestrationEngine.ts";
import { ProjectionSnapshotQuery } from "../Services/ProjectionSnapshotQuery.ts";
import { OrchestrationEngineLive } from "./OrchestrationEngine.ts";
import { OrchestrationProjectionPipelineLive } from "./ProjectionPipeline.ts";
import { OrchestrationProjectionSnapshotQueryLive } from "./ProjectionSnapshotQuery.ts";

it("recreates a soft-deleted thread with the same id", async () => {
  const serverConfigLayer = ServerConfig.layerTest(process.cwd(), {
    prefix: "t3-orchestration-recreate-test-",
  });
  const orchestrationLayer = Layer.mergeAll(
    OrchestrationEngineLive.pipe(
      Layer.provide(OrchestrationProjectionSnapshotQueryLive),
      Layer.provide(OrchestrationProjectionPipelineLive),
    ),
    OrchestrationProjectionSnapshotQueryLive,
  ).pipe(
    Layer.provide(ThreadBackgroundLiveness.layer),
    Layer.provide(ThreadPlanProgress.layer),
    Layer.provide(OrchestrationEventStoreLive),
    Layer.provide(OrchestrationCommandReceiptRepositoryLive),
    Layer.provide(RepositoryIdentityResolver.layer),
    Layer.provide(SqlitePersistenceMemory),
    Layer.provideMerge(serverConfigLayer),
    Layer.provideMerge(NodeServices.layer),
  );

  const runtime = ManagedRuntime.make(orchestrationLayer);
  try {
    const engine = await runtime.runPromise(Effect.service(OrchestrationEngineService));
    const snapshotQuery = await runtime.runPromise(Effect.service(ProjectionSnapshotQuery));
    const projectId = ProjectId.make("project-recreate");
    const threadId = ThreadId.make("thread-recreate");
    const modelSelection = {
      instanceId: ProviderInstanceId.make("omp"),
      model: "openai-codex/gpt-5.6-sol",
    };

    await runtime.runPromise(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.make("cmd-project-recreate-create"),
        projectId,
        title: "Recreate Project",
        workspaceRoot: process.cwd(),
        defaultModelSelection: modelSelection,
        createdAt: "2026-08-24T00:00:00.000Z",
      }),
    );
    await runtime.runPromise(
      engine.dispatch({
        type: "thread.create",
        commandId: CommandId.make("cmd-thread-recreate-create-1"),
        threadId,
        projectId,
        title: "Initial",
        modelSelection,
        interactionMode: DEFAULT_PROVIDER_INTERACTION_MODE,
        runtimeMode: "full-access",
        branch: null,
        worktreePath: null,
        createdAt: "2026-08-24T00:00:01.000Z",
      }),
    );
    await runtime.runPromise(
      engine.dispatch({
        type: "thread.delete",
        commandId: CommandId.make("cmd-thread-recreate-delete"),
        threadId,
      }),
    );

    expect((await runtime.runPromise(snapshotQuery.getSnapshot())).threads).toHaveLength(0);

    await runtime.runPromise(
      engine.dispatch({
        type: "thread.create",
        commandId: CommandId.make("cmd-thread-recreate-create-2"),
        threadId,
        projectId,
        title: "Recreated",
        modelSelection,
        interactionMode: DEFAULT_PROVIDER_INTERACTION_MODE,
        runtimeMode: "full-access",
        branch: null,
        worktreePath: null,
        createdAt: "2026-08-24T00:00:02.000Z",
      }),
    );

    const recreated = (await runtime.runPromise(snapshotQuery.getSnapshot())).threads.find(
      (thread) => thread.id === threadId,
    );
    expect(recreated?.title).toBe("Recreated");
    expect(recreated?.deletedAt).toBeNull();
  } finally {
    await runtime.dispose();
  }
});
