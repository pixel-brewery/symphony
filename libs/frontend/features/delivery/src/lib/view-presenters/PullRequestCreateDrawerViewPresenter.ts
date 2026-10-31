// #region Imports

import { computed, inject, Injectable, signal } from '@angular/core';
import { form, required, type FieldTree } from '@angular/forms/signals';
import { DRAWER_REF, type IDrawerRef } from '@pixel-brewery/mosaik-elements-angular';
import type { IPullRequestComparison, ISourceControlBranch } from '@symphony/domain-delivery';
import { ExternalLinkService, Hydratable, ViewPresenter, Command } from '@symphony/frontend-core';
import { proposePullRequestTitle, resolveInitialBranchSelection } from './pullRequestDraft';
import { resolvePullRequestComparisonPresentation } from './pullRequestComparisonPresentation';
import { DELIVERY_VIEW_CONTEXT } from '../ports/DeliveryViewContextToken';
import { PullRequestStore } from '../state/PullRequestStore';

// #endregion

interface IPullRequestDraftModel {
  repositoryBindingId: string;
  targetBranch: string;
  sourceBranch: string;
  title: string;
  body: string;
}

/**
 * Authoring surface for a pull request an operator opens by hand. It mirrors the GitHub compare
 * form: pick the repository, pick base and compare, see what the range carries, then describe it.
 */
@Injectable()
export class PullRequestCreateDrawerViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  private readonly _store = inject(DELIVERY_VIEW_CONTEXT);
  private readonly _pullRequests = inject(PullRequestStore);
  private readonly _externalLinks = inject(ExternalLinkService);
  private readonly _drawerRef = inject(DRAWER_REF) as IDrawerRef<undefined>;
  private _branchGeneration = 0;
  private _comparisonGeneration = 0;
  private _proposedTitle = '';

  private readonly _model = signal<IPullRequestDraftModel>({
    repositoryBindingId: '',
    targetBranch: '',
    sourceBranch: '',
    title: '',
    body: '',
  });

  /**
   * The form.
   *
   * @public
   * @readonly
   */
  public readonly form: FieldTree<IPullRequestDraftModel> = form(this._model, (schema) => {
    required(schema.repositoryBindingId, { message: 'Choose a repository.' });
    required(schema.targetBranch, { message: 'Choose the branch the change is merged into.' });
    required(schema.sourceBranch, { message: 'Choose the branch that carries the change.' });
    required(schema.title, { message: 'Enter a pull-request title.' });
  });

  /**
   * The branches.
   *
   * @public
   * @readonly
   */
  public readonly branches = signal<readonly ISourceControlBranch[]>([]);

  /**
   * The branches busy.
   *
   * @public
   * @readonly
   */
  public readonly branchesBusy = signal(false);

  /**
   * The comparison.
   *
   * @public
   * @readonly
   */
  public readonly comparison = signal<IPullRequestComparison | undefined>(undefined);

  /**
   * The comparison busy.
   *
   * @public
   * @readonly
   */
  public readonly comparisonBusy = signal(false);

  /**
   * The draft.
   *
   * @public
   * @readonly
   */
  public readonly draft = signal(false);

  /**
   * Whether it is creating.
   *
   * @public
   * @readonly
   */
  public readonly isCreating = this._pullRequests.pullRequestBusy;

  /**
   * GitHub repositories of the selected workspaces; only these can receive a pull request.
   *
   * @public
   * @readonly
   */
  public readonly repositories = computed(() => {
    const selectedWorkspaceIds = new Set(this._store.selectedWorkspaceIds());
    return (this._store.settings()?.repositoryBindings ?? []).filter(
      (repository) =>
        repository.enabled &&
        repository.provider === 'github' &&
        selectedWorkspaceIds.has(repository.workspaceId),
    );
  });

  /**
   * The repository.
   *
   * @public
   * @readonly
   */
  public readonly repository = computed(() =>
    this.repositories().find(
      (candidate) => candidate.id === this.form.repositoryBindingId().value(),
    ),
  );

  /**
   * Whether it can create.
   *
   * @public
   * @readonly
   */
  public readonly canCreate = computed(() => {
    const draft = this._model();
    const comparison = this.comparison();
    if (!comparison) return false;
    return (
      !this.isCreating() &&
      !this.branchesBusy() &&
      !this.comparisonBusy() &&
      Boolean(draft.repositoryBindingId && draft.targetBranch && draft.sourceBranch) &&
      Boolean(draft.title.trim()) &&
      resolvePullRequestComparisonPresentation(comparison).comparable
    );
  });

  private readonly _repositoryChangedCommand: Command<void> = new Command(
    () => void this.onExecuteRepositoryChangedCommand(),
  );
  private readonly _branchChangedCommand: Command<void> = new Command(
    () => void this.onExecuteBranchChangedCommand(),
  );
  private readonly _swapBranchesCommand: Command<void> = new Command(
    () => void this.onExecuteSwapBranchesCommand(),
  );
  private readonly _toggleDraftCommand: Command<void> = new Command(
    () => void this.onExecuteToggleDraftCommand(),
  );
  private readonly _openExistingPullRequestCommand: Command<void> = new Command(
    () => void this.onExecuteOpenExistingPullRequestCommand(),
  );
  private readonly _createCommand: Command<void> = new Command(
    () => void this.onExecuteCreateCommand(),
  );
  private readonly _closeCommand: Command<void> = new Command(
    () => void this.onExecuteCloseCommand(),
  );
  // #endregion

  // #region Properties

  /**
   * The repositoryChanged command.
   *
   * @public
   * @readonly
   */
  public get repositoryChangedCommand(): Command<void> {
    return this._repositoryChangedCommand;
  }
  /**
   * The branchChanged command.
   *
   * @public
   * @readonly
   */
  public get branchChangedCommand(): Command<void> {
    return this._branchChangedCommand;
  }
  /**
   * The swapBranches command.
   *
   * @public
   * @readonly
   */
  public get swapBranchesCommand(): Command<void> {
    return this._swapBranchesCommand;
  }
  /**
   * The toggleDraft command.
   *
   * @public
   * @readonly
   */
  public get toggleDraftCommand(): Command<void> {
    return this._toggleDraftCommand;
  }
  /**
   * The openExistingPullRequest command.
   *
   * @public
   * @readonly
   */
  public get openExistingPullRequestCommand(): Command<void> {
    return this._openExistingPullRequestCommand;
  }
  /**
   * The create command.
   *
   * @public
   * @readonly
   */
  public get createCommand(): Command<void> {
    return this._createCommand;
  }
  /**
   * The close command.
   *
   * @public
   * @readonly
   */
  public get closeCommand(): Command<void> {
    return this._closeCommand;
  }
  // #endregion

  // #region Methods

  /**
   * Handles hydrate.
   *
   * @public
   */
  public override async onHydrate(): Promise<void> {
    const repository = this.repositories()[0];
    if (!repository) return;
    this._model.update((model) => ({ ...model, repositoryBindingId: repository.id }));
    await this.loadBranches(repository.id);
  }

  /**
   * Returns the repository changed.
   *
   * @private
   */
  private async onExecuteRepositoryChangedCommand(): Promise<void> {
    await this.loadBranches(this._model().repositoryBindingId);
  }

  /**
   * Returns the branch changed.
   *
   * @private
   */
  private async onExecuteBranchChangedCommand(): Promise<void> {
    await this.compare();
  }

  /**
   * Swaps base and compare, the way the GitHub compare view does.
   *
   * @private
   */
  private async onExecuteSwapBranchesCommand(): Promise<void> {
    this._model.update((model) => ({
      ...model,
      targetBranch: model.sourceBranch,
      sourceBranch: model.targetBranch,
    }));
    await this.compare();
  }

  /**
   * Toggles the draft.
   *
   * @private
   */
  private onExecuteToggleDraftCommand(): void {
    this.draft.update((draft) => !draft);
  }

  /**
   * Opens the existing pull request.
   *
   * @private
   */
  private onExecuteOpenExistingPullRequestCommand(): void {
    const existing = this.comparison()?.existingPullRequest;
    if (existing) this._externalLinks.open(existing.externalUrl);
  }

  /**
   * Creates.
   *
   * @private
   */
  private async onExecuteCreateCommand(): Promise<void> {
    if (!this.canCreate()) return;
    const draft = this._model();
    const created = await this._pullRequests.createPullRequest({
      repositoryBindingId: draft.repositoryBindingId,
      targetBranch: draft.targetBranch,
      sourceBranch: draft.sourceBranch,
      title: draft.title.trim(),
      body: draft.body,
      draft: this.draft(),
    });
    if (created) this._drawerRef.close();
  }

  /**
   * Closes.
   *
   * @private
   */
  private onExecuteCloseCommand(): void {
    this._drawerRef.close();
  }

  private async loadBranches(repositoryBindingId: string): Promise<void> {
    const generation = ++this._branchGeneration;
    this.branchesBusy.set(true);
    this.branches.set([]);
    this.comparison.set(undefined);
    const inventory = repositoryBindingId
      ? await this._pullRequests.loadPullRequestBranches(repositoryBindingId)
      : undefined;
    if (generation !== this._branchGeneration) return;
    this.branchesBusy.set(false);
    if (!inventory) return;
    this.branches.set(inventory.branches);
    const selection = resolveInitialBranchSelection(inventory.branches, inventory.defaultBranch);
    this._model.update((model) => ({ ...model, ...selection }));
    await this.compare();
  }

  private async compare(): Promise<void> {
    const { repositoryBindingId, targetBranch, sourceBranch } = this._model();
    const generation = ++this._comparisonGeneration;
    if (!repositoryBindingId || !targetBranch || !sourceBranch) {
      this.comparison.set(undefined);
      return;
    }
    // Identical branches never reach the provider: the answer is known and GitHub reports it
    // as an empty comparison anyway.
    if (targetBranch === sourceBranch) {
      this.comparison.set({
        repositoryBindingId,
        targetBranch,
        sourceBranch,
        status: 'identical',
        aheadBy: 0,
        behindBy: 0,
        changedFiles: 0,
        commits: [],
      });
      return;
    }
    this.comparisonBusy.set(true);
    const comparison = await this._pullRequests.comparePullRequestBranches({
      repositoryBindingId,
      targetBranch,
      sourceBranch,
    });
    if (generation !== this._comparisonGeneration) return;
    this.comparisonBusy.set(false);
    this.comparison.set(comparison);
    if (comparison) this.proposeTitle(comparison);
  }

  /** Keeps GitHub's prefilled title until the operator has written one of their own. */
  private proposeTitle(comparison: IPullRequestComparison): void {
    const current = this._model().title.trim();
    if (current && current !== this._proposedTitle) return;
    this._proposedTitle = proposePullRequestTitle(comparison.sourceBranch, comparison.commits);
    this._model.update((model) => ({ ...model, title: this._proposedTitle }));
  }

  // #endregion
}
