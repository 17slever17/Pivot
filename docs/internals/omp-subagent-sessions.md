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
native Hub. After a Pivot/OMP restart, the persisted root binding retains the
OMP session file; the first transcript or child-message operation lazily
relaunches OMP and issues `switch_session` for that exact root file. OMP then
rebuilds its parked child roster from the root JSONL, so the existing child id
can be queried or messaged without guessing a child path. UI activity rows
remain the durable roster source, while the child transcript is fetched from
OMP on demand. This restores a process and its persisted session; it does not
promise that an active in-flight process survived a server restart.
