// --------------------------------------------------------------------------------------
// Human decisions
// --------------------------------------------------------------------------------------

/**
 * A human decision is the only trigger that may pass a human gate. Effects are configured
 * per stage, so an installation can rename or extend the options a gate offers.
 */
export const humanDecisionEffects = ['advance', 'route', 'hold', 'close', 'split'] as const;
