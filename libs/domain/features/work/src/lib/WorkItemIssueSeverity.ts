/**
 * How badly a finding blocks the item.
 *
 * `blocker` means the workflow cannot continue until a person acts; `incomplete` means the
 * item still moves, but data a person expects to be there is missing. The two are kept apart
 * so the board can stay quiet about missing planning data while still shouting about work
 * that can never start.
 */
export type WorkItemIssueSeverity = 'blocker' | 'incomplete';
