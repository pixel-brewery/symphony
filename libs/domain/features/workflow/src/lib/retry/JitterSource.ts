/** Deterministic source of the jitter share, injected so schedules stay testable. */
export type JitterSource = () => number;
