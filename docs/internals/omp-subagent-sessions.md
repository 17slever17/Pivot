# OMP subagent sessions

Pivot's Agents panel reads the subagent roster from persisted thread
activities and tails the selected child's OMP JSONL transcript incrementally.
Opening a transcript keeps its cursor and saved entries while it is live;
reloading the UI or reconnecting the client therefore restores the roster and
the available transcript instead of starting a new child conversation.

The built-in orchestrator prompt asks worker and verifier children to remain
keep-alive/reusable when follow-up work is likely. After a child settles, the
orchestrator should use OMP Hub's `hub op=send` with that child's exact ID.
OMP wakes an idle or parked child and continues its own JSONL context. This is
the provider's session, not a second Pivot thread.

There are deliberate limits. A hard abort/kill leaves a child non-reusable,
and isolated or one-shot children are not reusable by design. The Agents panel
does not claim to steer or stop a child when OMP only exposes controls for the
parent session. A live OMP root process can revive a parked child through its
native Hub.

OMP's native Hub roster and the `rpc-ui` child registry are different pieces of
state. `switch_session` clears the in-memory RPC child registry, and
`get_subagent_messages` cannot address an old child by ID until that registry
has live lifecycle data again. Pivot therefore persists a narrow, server-owned
mapping from `(threadId, subagentId)` to the exact child `sessionFile` emitted by
OMP while the registry is live. After a Pivot/OMP restart, transcript reads try
native RPC first and, when OMP reports an unknown child, validate the persisted
root/child relationship and read the child JSONL with OMP-compatible byte
cursors. This fallback restores the full transcript for the UI; it does not
make `send`, steer, stop, or native child continuation available after restart.
The child path is never accepted from the web client and is not discovered by
guessing arbitrary files.

UI activity rows remain the durable roster source. The fallback restores a
process and its persisted transcript, but it does not promise that an active
in-flight process survived a server restart or that the same child can be
continued without OMP's native registry.
