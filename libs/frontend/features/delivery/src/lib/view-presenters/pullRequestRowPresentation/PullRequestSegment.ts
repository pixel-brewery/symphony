/**
 * The segment the pull-request list is narrowed to: every open pull request, the ones that need
 * someone to act (failing checks, a conflict or a branch behind its base), or the drafts.
 *
 * @public
 */
export type PullRequestSegment = 'open' | 'needs-action' | 'drafts';
