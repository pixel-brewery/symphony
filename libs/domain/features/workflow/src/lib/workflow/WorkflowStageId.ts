/**
 * Delivery process model.
 *
 * Three layers are kept strictly separate:
 *
 * 1. Provider board columns - owned by the tracker, mapped to stages by configuration.
 * 2. Workflow stages - the human-visible process, defined by configuration, not by code.
 * 3. Runtime state - the machine-readable truth beside the stage (claims, runs, retries,
 *    blockers, escalations). Never projected into a board column.
 *
 * Stage identifiers are configuration values rather than a closed union, so an installation
 * can add, rename, or remove stages without a code change. Everything a stage may *do* -
 * roles, outcomes, guards, decisions - stays a closed union so the engine can switch
 * exhaustively over it.
 */

/** Configured stage identifier. Stable across renames of the stage label. */
export type WorkflowStageId = string;
