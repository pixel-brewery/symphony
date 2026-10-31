/**
 * Whether a pull request can be merged as far as Symphony knows: a draft, a conflict with or a
 * branch behind its base, mergeable, or mergeable with passing checks (`ready`). `unknown` when
 * GitHub has not qualified the base relationship.
 *
 * @public
 */
export type PullRequestMergeState =
  'draft' | 'conflict' | 'behind' | 'ready' | 'mergeable' | 'unknown' | 'merged' | 'closed';
