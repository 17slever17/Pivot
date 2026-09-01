import { assert, it } from "@effect/vitest";

import {
  makeThreadTurnActionGate,
  matchesThreadComposerDraftSnapshot,
} from "./thread-turn-action.ts";

it("preserves a draft that changed while steer was pending", () => {
  const submitted = {
    text: "focus on the failing test",
    attachmentCount: 0,
    contextCount: 0,
  };
  assert.equal(
    matchesThreadComposerDraftSnapshot(
      { ...submitted, text: "focus on the failing test and keep the new note" },
      submitted,
    ),
    false,
  );
  assert.equal(
    matchesThreadComposerDraftSnapshot({ ...submitted, attachmentCount: 1 }, submitted),
    false,
  );
  assert.equal(
    matchesThreadComposerDraftSnapshot({ ...submitted, contextCount: 1 }, submitted),
    false,
  );
  assert.equal(matchesThreadComposerDraftSnapshot(submitted, submitted), true);
});

it("allows only one synchronous Queue or Steer action", () => {
  const gate = makeThreadTurnActionGate();
  const dispatched: string[] = [];

  for (const action of ["send", "steer"] as const) {
    if (!gate.tryAcquire(action)) {
      continue;
    }
    dispatched.push(action);
  }

  assert.deepEqual(dispatched, ["send"]);
  gate.release("send");
  assert.equal(gate.tryAcquire("steer"), true);
});
