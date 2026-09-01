/**
 * Coordinates mutually exclusive composer actions without waiting for a
 * render. This closes the synchronous gap between Queue and immediate steer
 * taps while either operation is awaiting persistence or the server.
 */
export type ThreadTurnAction = "send" | "steer";

export interface ThreadTurnActionGate {
  readonly tryAcquire: (action: ThreadTurnAction) => boolean;
  readonly release: (action: ThreadTurnAction) => void;
}

export function makeThreadTurnActionGate(): ThreadTurnActionGate {
  let activeAction: ThreadTurnAction | null = null;
  return {
    tryAcquire: (action) => {
      if (activeAction !== null) {
        return false;
      }
      activeAction = action;
      return true;
    },
    release: (action) => {
      if (activeAction === action) {
        activeAction = null;
      }
    },
  };
}

export interface ThreadComposerDraftSnapshot {
  readonly text: string;
  readonly attachmentCount: number;
  readonly contextCount: number;
}

export function matchesThreadComposerDraftSnapshot(
  current: ThreadComposerDraftSnapshot,
  submitted: ThreadComposerDraftSnapshot,
): boolean {
  return (
    current.text === submitted.text &&
    current.attachmentCount === submitted.attachmentCount &&
    current.contextCount === submitted.contextCount
  );
}
