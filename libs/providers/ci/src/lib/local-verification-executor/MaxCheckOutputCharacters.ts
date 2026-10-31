/**
 * How much of a failed step's output is handed to a repairing agent. The operator-facing detail
 * stays short enough to read on a card, but a tail that short names the runner and not the
 * failing assertion, and an agent cannot repair what it cannot see.
 */
export const MAX_CHECK_OUTPUT_CHARACTERS = 20_000;
