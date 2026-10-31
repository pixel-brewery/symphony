/**
 * Open pull requests of the active scope by the states Symphony can tell apart, with the rules of
 * the Pull requests screen.
 *
 * @public
 */
export interface IPullRequestStateCounts {
  /** Open pull requests, drafts included, as the sidebar counts them. @public @readonly */
  readonly open: number;
  /**
   * Open pull requests with a pending review request for one of the signed-in GitHub accounts of
   * the scope; absent when no account login is known.
   *
   * @public
   * @readonly
   */
  readonly waitingForReview?: number;
  /** Open pull requests with a failing check. @public @readonly */
  readonly checksFailing: number;
  /** Ready to merge: not a draft, branch current with its base, every check passed. @public @readonly */
  readonly readyToMerge: number;
  /** Open pull requests without a failing check but with a check queued or in progress. @public @readonly */
  readonly checksRunning: number;
  /** Draft pull requests. @public @readonly */
  readonly drafts: number;
}
