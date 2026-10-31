/**
 * Whether `Fix with AI` can start for a failed run, or why not: the run is not a Symphony pull
 * request's, the automation policy does not allow repairs, an execution already works on the item,
 * or the agent feature is not part of this build.
 *
 * @public
 */
export type FixWithAiState = 'available' | 'no-pull-request' | 'policy' | 'busy' | 'unavailable';
