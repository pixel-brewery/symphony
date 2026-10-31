// #region Imports
import { type IApplicationSettings } from '@symphony/configuration-composition';
// #endregion

/**
 * Supplies the existing deterministic SimulatedPullRequestAuthoring provider behavior.
 *
 * @public
 */
export class SimulatedPullRequestAuthoring {
  // #region Fields
  private readonly _settings: () => Pick<
    IApplicationSettings,
    'activeViewScope' | 'repositoryBindings'
  >;
  private _nextPullRequestNumber = 100;
  // #endregion
  // #region Ctor
  /**
   * Reads the live configuration and existing local evidence on demand.
   *
   * @public
   */
  public constructor(
    settings: () => Pick<IApplicationSettings, 'activeViewScope' | 'repositoryBindings'>,
  ) {
    this._settings = settings;
  }
  // #endregion
  // #region Methods
  /**
   * Resolves the existing deterministic requireRepository response.
   *
   * @private
   */
  private requireRepository(repositoryBindingId: string) {
    const selectedWorkspaceIds = new Set(this._settings().activeViewScope.workspaceIds);
    const repository = this._settings().repositoryBindings.find(
      (candidate) =>
        candidate.id === repositoryBindingId &&
        candidate.enabled &&
        selectedWorkspaceIds.has(candidate.workspaceId),
    );
    if (!repository) throw new Error('The selected GitHub repository is unavailable.');
    return repository;
  }

  /**
   * Projects the existing deterministic listBranches response.
   *
   * @public
   */
  public listBranches(repositoryBindingId: string) {
    const repository = this.requireRepository(repositoryBindingId);
    return {
      repositoryBindingId: repository.id,
      defaultBranch: repository.defaultBranch,
      branches: [
        { name: repository.defaultBranch, protected: true },
        { name: 'develop', protected: false },
        { name: 'feature/mobile-companion', protected: false },
        { name: 'fix/pull-request-drawer', protected: false },
      ].toSorted((left, right) => left.name.localeCompare(right.name)),
    };
  }

  /**
   * Projects the existing deterministic compareBranches response.
   *
   * @public
   */
  public compareBranches(input: {
    readonly repositoryBindingId: string;
    readonly targetBranch: string;
    readonly sourceBranch: string;
  }) {
    const repository = this.requireRepository(input.repositoryBindingId);
    const identical = input.targetBranch === input.sourceBranch;
    return {
      repositoryBindingId: repository.id,
      targetBranch: input.targetBranch,
      sourceBranch: input.sourceBranch,
      status: identical ? ('identical' as const) : ('ahead' as const),
      aheadBy: identical ? 0 : 2,
      behindBy: 0,
      changedFiles: identical ? 0 : 3,
      commits: identical
        ? []
        : [
            {
              revision: 'simulated-commit-2',
              title: `Prepare ${input.sourceBranch}`,
              author: 'local-developer',
              committedAt: '2026-08-15T06:05:00.000Z',
            },
            {
              revision: 'simulated-commit-1',
              title: 'Add regression coverage',
              author: 'local-developer',
              committedAt: '2026-08-15T06:00:00.000Z',
            },
          ],
    };
  }

  /**
   * Projects the existing deterministic createPullRequest response.
   *
   * @public
   */
  public createPullRequest(input: {
    readonly repositoryBindingId: string;
    readonly targetBranch: string;
    readonly sourceBranch: string;
    readonly title: string;
    readonly body: string;
    readonly draft: boolean;
  }) {
    const repository = this.requireRepository(input.repositoryBindingId);
    if (input.targetBranch === input.sourceBranch) {
      throw new Error('A pull request needs two different branches.');
    }
    this._nextPullRequestNumber += 1;
    const now = new Date().toISOString();
    return {
      id: `${repository.id}:${this._nextPullRequestNumber}`,
      workspaceId: repository.workspaceId,
      repositoryBindingId: repository.id,
      number: this._nextPullRequestNumber,
      title: input.title,
      state: 'open' as const,
      draft: input.draft,
      author: 'local-developer',
      sourceBranch: input.sourceBranch,
      targetBranch: input.targetBranch,
      externalUrl: `https://${repository.host}/${repository.owner}/${repository.name}/pull/${this._nextPullRequestNumber}`,
      createdAt: now,
      updatedAt: now,
    };
  }

  // #endregion
}
