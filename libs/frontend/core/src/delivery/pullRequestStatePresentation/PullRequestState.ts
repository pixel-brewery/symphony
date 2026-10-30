/**
 * The state a pull request is listed under. Draft is a separate state here, not a flag on the
 * open ones: a draft is not waiting for anybody, so the two must never be counted together.
 */
export type PullRequestState = 'open' | 'draft' | 'merged' | 'closed';
