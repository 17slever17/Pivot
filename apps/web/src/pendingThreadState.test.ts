import { MessageId } from "@t3tools/contracts";
import { afterEach, describe, expect, it } from "vite-plus/test";

import type { LocalDispatchSnapshot } from "./components/ChatView.logic";
import { usePendingThreadState } from "./pendingThreadState";

const draftThreadKey = "environment-local:draft-thread";
const durableThreadKey = "environment-local:durable-thread";

const localDispatch: LocalDispatchSnapshot = {
  startedAt: "2026-03-29T00:00:00.000Z",
  preparingWorktree: false,
  latestUserMessageId: null,
  latestTurnTurnId: null,
  latestTurnRequestedAt: null,
  latestTurnStartedAt: null,
  latestTurnCompletedAt: null,
  sessionStatus: null,
  sessionUpdatedAt: null,
};

function message(id: string) {
  return {
    id: MessageId.make(id),
    role: "user" as const,
    text: "hello",
    turnId: null,
    createdAt: localDispatch.startedAt,
    updatedAt: localDispatch.startedAt,
    streaming: false,
  };
}

afterEach(() => {
  const store = usePendingThreadState.getState();
  store.clearThread(draftThreadKey);
  store.clearThread(durableThreadKey);
});

describe("pending thread state", () => {
  it("survives a draft-to-durable remount and reconciles by message id", () => {
    const pending = message("message-1");
    const store = usePendingThreadState.getState();
    store.addOptimisticUserMessage(draftThreadKey, pending);
    store.setLocalDispatch(draftThreadKey, localDispatch);

    // The draft and durable routes use the same preallocated thread identity.
    const remounted = usePendingThreadState.getState();
    expect(remounted.entriesByThreadKey[draftThreadKey]).toMatchObject({
      optimisticUserMessages: [pending],
      localDispatch,
    });

    const removed = remounted.removeOptimisticUserMessages(draftThreadKey, new Set([pending.id]));
    remounted.clearLocalDispatch(draftThreadKey);
    expect(removed).toEqual([pending]);
    expect(usePendingThreadState.getState().entriesByThreadKey[draftThreadKey]).toBeUndefined();
  });

  it("moves pending state when a route receives a new durable identity", () => {
    const pending = message("message-2");
    const store = usePendingThreadState.getState();
    store.addOptimisticUserMessage(draftThreadKey, pending);
    store.setLocalDispatch(draftThreadKey, localDispatch);

    store.migrateThreadState(draftThreadKey, durableThreadKey);

    expect(store.entriesByThreadKey[draftThreadKey]).toBeUndefined();
    expect(usePendingThreadState.getState().entriesByThreadKey[durableThreadKey]).toMatchObject({
      optimisticUserMessages: [pending],
      localDispatch,
    });
  });

  it("clears pending message and dispatch together on command failure", () => {
    const pending = message("message-3");
    const store = usePendingThreadState.getState();
    store.addOptimisticUserMessage(durableThreadKey, pending);
    store.setLocalDispatch(durableThreadKey, localDispatch);

    const removed = store.removeOptimisticUserMessages(durableThreadKey, new Set([pending.id]));
    store.clearLocalDispatch(durableThreadKey);

    expect(removed).toEqual([pending]);
    expect(usePendingThreadState.getState().entriesByThreadKey[durableThreadKey]).toBeUndefined();
  });
});
