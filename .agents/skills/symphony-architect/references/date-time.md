# Temporal integration

Use with common Date/time and the actual domain, configuration, persistence or presenter owner.

- Classify persisted execution/event/attempt timestamps, expiry, retry/cooldown windows and scheduled instants explicitly. Preserve the existing wire representation and validate unknown values through the owning schema; a presentation change does not authorize a storage migration.
- Carry the intended viewer/workflow IANA zone for wall-time scheduling, local-day bounds and presentation. Do not infer business time from the process machine or hard-code the developer's zone. Calendar days remain calendar-day strings; instant arithmetic compares actual instants.
- Reuse the owning clock, time formatter or pure Angular pipe. Keep reusable formatting out of presenters and preserve scheduler semantics while changing display. Inject or control clocks where timing is behavior; clean up timers on cancellation/disposal.
- Verify affected expiry boundaries, offset/DST behavior, invalid input and persisted round trips through the real owner. Restore fake clocks, global state and time-zone overrides after tests.
