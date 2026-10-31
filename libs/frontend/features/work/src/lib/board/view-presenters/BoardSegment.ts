/**
 * Segment of the board's filter bar: every item, the items that need the user, the items an
 * agent works on right now, or the items assigned to the signed-in GitHub account.
 *
 * @public
 */
export type BoardSegment = 'all' | 'attention' | 'running' | 'mine';
