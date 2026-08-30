import { create } from "zustand";

import type { ChatMessage } from "./types";
import type { LocalDispatchSnapshot } from "./components/ChatView.logic";

export interface PendingThreadEntry {
  readonly optimisticUserMessages: ReadonlyArray<ChatMessage>;
  readonly localDispatch: LocalDispatchSnapshot | null;
}

type LocalDispatchUpdate =
  | LocalDispatchSnapshot
  | null
  | ((current: LocalDispatchSnapshot | null) => LocalDispatchSnapshot | null);

interface PendingThreadStateStore {
  readonly entriesByThreadKey: Record<string, PendingThreadEntry>;
  addOptimisticUserMessage: (threadKey: string, message: ChatMessage) => void;
  removeOptimisticUserMessages: (
    threadKey: string,
    messageIds: ReadonlySet<string>,
  ) => ReadonlyArray<ChatMessage>;
  clearOptimisticUserMessages: (threadKey: string) => void;
  setLocalDispatch: (threadKey: string, update: LocalDispatchUpdate) => void;
  clearLocalDispatch: (threadKey: string) => void;
  clearThread: (threadKey: string) => void;
  migrateThreadState: (fromThreadKey: string, toThreadKey: string) => void;
}

const EMPTY_ENTRY: PendingThreadEntry = {
  optimisticUserMessages: [],
  localDispatch: null,
};

function updateEntry(
  entriesByThreadKey: Record<string, PendingThreadEntry>,
  threadKey: string,
  update: (entry: PendingThreadEntry) => PendingThreadEntry,
): Record<string, PendingThreadEntry> {
  const current = entriesByThreadKey[threadKey] ?? EMPTY_ENTRY;
  const next = update(current);
  if (next.optimisticUserMessages.length === 0 && next.localDispatch === null) {
    if (!(threadKey in entriesByThreadKey)) {
      return entriesByThreadKey;
    }
    const remaining = { ...entriesByThreadKey };
    delete remaining[threadKey];
    return remaining;
  }
  if (
    next.optimisticUserMessages === current.optimisticUserMessages &&
    next.localDispatch === current.localDispatch
  ) {
    return entriesByThreadKey;
  }
  return { ...entriesByThreadKey, [threadKey]: next };
}

export const usePendingThreadState = create<PendingThreadStateStore>((set) => ({
  entriesByThreadKey: {},

  addOptimisticUserMessage: (threadKey, message) => {
    set((state) => {
      const entriesByThreadKey = updateEntry(state.entriesByThreadKey, threadKey, (entry) => {
        if (entry.optimisticUserMessages.some((current) => current.id === message.id)) {
          return entry;
        }
        return {
          ...entry,
          optimisticUserMessages: [...entry.optimisticUserMessages, message],
        };
      });
      return entriesByThreadKey === state.entriesByThreadKey ? state : { entriesByThreadKey };
    });
  },

  removeOptimisticUserMessages: (threadKey, messageIds) => {
    if (messageIds.size === 0) return [];
    let removedMessages: ReadonlyArray<ChatMessage> = [];
    set((state) => {
      const entriesByThreadKey = updateEntry(state.entriesByThreadKey, threadKey, (entry) => {
        removedMessages = entry.optimisticUserMessages.filter((message) =>
          messageIds.has(message.id),
        );
        const nextMessages = entry.optimisticUserMessages.filter(
          (message) => !messageIds.has(message.id),
        );
        return nextMessages.length === entry.optimisticUserMessages.length
          ? entry
          : { ...entry, optimisticUserMessages: nextMessages };
      });
      return entriesByThreadKey === state.entriesByThreadKey ? state : { entriesByThreadKey };
    });
    return removedMessages;
  },

  clearOptimisticUserMessages: (threadKey) => {
    set((state) => {
      const entriesByThreadKey = updateEntry(state.entriesByThreadKey, threadKey, (entry) =>
        entry.optimisticUserMessages.length === 0
          ? entry
          : { ...entry, optimisticUserMessages: [] },
      );
      return entriesByThreadKey === state.entriesByThreadKey ? state : { entriesByThreadKey };
    });
  },

  setLocalDispatch: (threadKey, update) => {
    set((state) => {
      const entriesByThreadKey = updateEntry(state.entriesByThreadKey, threadKey, (entry) => {
        const nextLocalDispatch =
          typeof update === "function" ? update(entry.localDispatch) : update;
        return nextLocalDispatch === entry.localDispatch
          ? entry
          : { ...entry, localDispatch: nextLocalDispatch };
      });
      return entriesByThreadKey === state.entriesByThreadKey ? state : { entriesByThreadKey };
    });
  },

  clearLocalDispatch: (threadKey) => {
    set((state) => {
      const entriesByThreadKey = updateEntry(state.entriesByThreadKey, threadKey, (entry) =>
        entry.localDispatch === null ? entry : { ...entry, localDispatch: null },
      );
      return entriesByThreadKey === state.entriesByThreadKey ? state : { entriesByThreadKey };
    });
  },

  clearThread: (threadKey) => {
    set((state) => {
      if (!(threadKey in state.entriesByThreadKey)) {
        return state;
      }
      const entriesByThreadKey = { ...state.entriesByThreadKey };
      delete entriesByThreadKey[threadKey];
      return { entriesByThreadKey };
    });
  },

  migrateThreadState: (fromThreadKey, toThreadKey) => {
    if (fromThreadKey === toThreadKey) return;
    set((state) => {
      const source = state.entriesByThreadKey[fromThreadKey];
      if (!source) return state;
      const target = state.entriesByThreadKey[toThreadKey];
      const mergedMessages = [
        ...(target?.optimisticUserMessages ?? []),
        ...source.optimisticUserMessages.filter(
          (message) =>
            !(target?.optimisticUserMessages ?? []).some((current) => current.id === message.id),
        ),
      ];
      const entriesByThreadKey = { ...state.entriesByThreadKey };
      delete entriesByThreadKey[fromThreadKey];
      entriesByThreadKey[toThreadKey] = {
        optimisticUserMessages: mergedMessages,
        localDispatch: target?.localDispatch ?? source.localDispatch,
      };
      return { entriesByThreadKey };
    });
  },
}));

export { EMPTY_ENTRY as EMPTY_PENDING_THREAD_ENTRY };
