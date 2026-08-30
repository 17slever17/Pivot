import { useAtomValue } from "@effect/atom-react";
import { createEnvironmentCommand } from "@t3tools/client-runtime/state/runtime";
import {
  createEnvironmentThreadDetailAtoms,
  createEnvironmentThreadShellAtoms,
  createEnvironmentThreadStateAtoms,
  EMPTY_ENVIRONMENT_THREAD_STATE,
  type EnvironmentThreadState,
  createThreadEnvironmentAtoms,
} from "@t3tools/client-runtime/state/threads";
import {
  CommandId,
  ORCHESTRATION_WS_METHODS,
  ThreadId,
  type EnvironmentId,
  type ClientOrchestrationCommand,
  type ThreadAgentMode as ThreadAgentModeType,
} from "@t3tools/contracts";
import * as Option from "effect/Option";
import { AsyncResult, Atom } from "effect/unstable/reactivity";

import { request } from "@t3tools/client-runtime/rpc";
import { environmentCatalog } from "../connection/catalog";
import { connectionAtomRuntime } from "../connection/runtime";
import { environmentSnapshotAtom } from "./shell";

const setThreadAgentModeCommand = createEnvironmentCommand(connectionAtomRuntime, {
  label: "mobile:thread:set-agent-mode",
  execute: (input: {
    readonly commandId: CommandId;
    readonly threadId: ThreadId;
    readonly agentMode: ThreadAgentModeType;
    readonly createdAt: string;
  }) =>
    request(ORCHESTRATION_WS_METHODS.dispatchCommand, {
      type: "thread.agent-mode.set",
      ...input,
    } satisfies ClientOrchestrationCommand),
});

export const threadEnvironment = {
  ...createThreadEnvironmentAtoms(connectionAtomRuntime),
  setAgentMode: setThreadAgentModeCommand,
};
export const environmentThreads = createEnvironmentThreadStateAtoms(connectionAtomRuntime);
export const environmentThreadDetails = createEnvironmentThreadDetailAtoms(
  environmentThreads.stateAtom,
);
export const environmentThreadShells = createEnvironmentThreadShellAtoms({
  catalogValueAtom: environmentCatalog.catalogValueAtom,
  snapshotAtom: environmentSnapshotAtom,
});

const EMPTY_THREAD_STATE_ATOM = Atom.make(AsyncResult.success(EMPTY_ENVIRONMENT_THREAD_STATE)).pipe(
  Atom.withLabel("mobile-environment-thread:empty"),
);

export function useEnvironmentThread(
  environmentId: EnvironmentId | null,
  threadId: ThreadId | null,
): EnvironmentThreadState {
  const result = useAtomValue(
    environmentId !== null && threadId !== null
      ? environmentThreads.stateAtom(environmentId, threadId)
      : EMPTY_THREAD_STATE_ATOM,
  );
  return Option.getOrElse(
    AsyncResult.value(result),
    () => EMPTY_ENVIRONMENT_THREAD_STATE,
  ) as EnvironmentThreadState;
}
