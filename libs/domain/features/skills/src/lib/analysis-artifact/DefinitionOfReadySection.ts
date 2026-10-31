/**
 * Reads the machine-readable Definition of Ready out of an analysis report.
 *
 * The analysis report contract requires a final `## Definition of ready` section carrying one
 * fenced JSON block. This parser is deliberately strict about the fields the stage guards
 * evaluate: a block that cannot prove those facts yields no artifact, the guards reject the
 * transition by name, and the supervisor raises a visible question - never a silent pass.
 * Descriptive fields the guards do not read fall back to neutral defaults.
 */

/** Heading of the report section that carries the machine-readable block. */
export const DEFINITION_OF_READY_SECTION = 'Definition of ready';
