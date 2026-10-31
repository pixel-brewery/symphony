// #region Imports

import {
  ApplicationRef,
  ChangeDetectorRef,
  computed,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { DRAWER_REF, DRAWER_REF_DATA } from '@pixel-brewery/mosaik-elements-angular';
import { Command, Hydratable, ViewPresenter } from '@symphony/frontend-core';
import {
  createTrackedSettingsDraft,
  mosaikEventText,
  upsertSettingsItem,
} from '@symphony/frontend-setting';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { FEEDBACK_SETTINGS_CONTEXT } from '../ports/FeedbackSettingsContextToken';
import { FeedbackStore } from '../state/FeedbackStore';
import type { IFeedbackSettingsEditorRequest } from './IFeedbackSettingsEditorRequest';

// #endregion

/** Owns the channel form and its existing test-before-enable transaction. @public */
@Injectable()
export class FeedbackSettingsEditorViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  private readonly _context = inject(FEEDBACK_SETTINGS_CONTEXT);
  private readonly _feedback = inject(FeedbackStore);
  private readonly _drawerRef = inject(DRAWER_REF);
  private readonly _changeDetector = inject(ChangeDetectorRef);
  private readonly _application = inject(ApplicationRef);
  private readonly _draftRevision = signal(0);
  private readonly _busy = signal(false);
  /** Validated request for this editor. @public @readonly */
  public readonly data = inject<IFeedbackSettingsEditorRequest>(DRAWER_REF_DATA);
  /** Local save lifecycle. @public @readonly */
  public readonly busy = this._busy.asReadonly();
  /** The existing aggregate settings writer lifecycle. @public @readonly */
  public readonly configurationBusy = this._context.configurationBusy;
  /** Shared exclusion between settings operations. @public @readonly */
  public readonly editorBusy = this._context.editorBusy;
  /** The same connection-test state read by the global settings exclusion. @public @readonly */
  public readonly feedbackIntakeTestBusy = this._feedback.feedbackIntakeTestBusy;
  /** Mutable form assignments retain their original reactive projection semantics. @public */
  public teams = this.createTeamsDraft();
  /** Enabled GitHub Projects in the selected workspace. @public @readonly */
  public readonly teamsTargetSources = computed(() => this.resolveTeamsTargetSources());
  /** Enabled GitHub repositories in the selected workspace. @public @readonly */
  public readonly teamsTargetRepositories = computed(() => this.resolveTeamsTargetRepositories());
  /** Whether the channel has all fields required by the test boundary. @public @readonly */
  public readonly canTestTeamsFeedback = computed(() => {
    this._draftRevision();
    return this.resolveCanTestTeamsFeedback();
  });
  /** Retains the original remove-action visibility. @public @readonly */
  public readonly hasExistingTeamsFeedback = computed(() => Boolean(this.data.sourceId));
  /** Feedback retains the original Save affordance and validates inside the command. @public @readonly */
  public readonly canSave = (): boolean => true;
  /** Native input normalization shared by the existing form bindings. @public @readonly */
  public readonly eventText =
    () =>
    (event: unknown): string =>
      mosaikEventText(event) ?? '';
  /** Selects only a GitHub Project offered by this workspace. @public @readonly */
  public readonly updateTeamsTargetSourceCommand = new Command<unknown>((event) =>
    this.onExecuteUpdateTeamsTargetSourceCommand(event),
  );
  /** Selects only a GitHub repository offered by this workspace. @public @readonly */
  public readonly updateTeamsTargetRepositoryCommand = new Command<unknown>((event) =>
    this.onExecuteUpdateTeamsTargetRepositoryCommand(event),
  );
  /** Runs the existing read-only channel test. @public @readonly */
  public readonly testTeamsFeedbackCommand = new Command<void>(() => {
    void this.onExecuteTestTeamsFeedbackCommand();
  });
  /** Removes only this intake from the latest settings. @public @readonly */
  public readonly removeTeamsFeedbackCommand = new Command<void>(() => {
    void this.onExecuteRemoveTeamsFeedbackCommand();
  });
  /** Saves through the single aggregate writer. @public @readonly */
  public readonly saveCommand = new Command<void>(() => {
    void this.onExecuteSaveCommand();
  });
  /** Closes the draft without persisting it. @public @readonly */
  public readonly closeCommand = new Command<void>(() => this._drawerRef.close());

  // #endregion

  // #region Methods

  /** Hydrates the form only when authoritative settings are missing. @public */
  public override async onHydrate(): Promise<void> {
    try {
      if (!this._context.settings()) {
        await this._context.refreshConfiguration();
        this.teams = this.createTeamsDraft();
      }
    } finally {
      window.requestAnimationFrame(() => this._application.tick());
    }
  }

  private resolveTeamsTargetSources() {
    return (this._context.settings()?.workItemSources ?? []).filter(
      (source) =>
        source.workspaceId === this.data.workspaceId &&
        source.provider === 'github-projects' &&
        source.enabled,
    );
  }

  private resolveTeamsTargetRepositories() {
    return (this._context.settings()?.repositoryBindings ?? []).filter(
      (repository) =>
        repository.workspaceId === this.data.workspaceId &&
        repository.provider === 'github' &&
        repository.enabled,
    );
  }

  private onExecuteUpdateTeamsTargetSourceCommand(event: unknown): void {
    const value = mosaikEventText(event);
    if (this.resolveTeamsTargetSources().some((source) => source.id === value)) {
      this.teams.targetWorkItemSourceId = value ?? '';
      this._changeDetector.detectChanges();
    }
  }

  private onExecuteUpdateTeamsTargetRepositoryCommand(event: unknown): void {
    const value = mosaikEventText(event);
    if (this.resolveTeamsTargetRepositories().some((repository) => repository.id === value)) {
      this.teams.targetRepositoryBindingId = value ?? '';
      this._changeDetector.detectChanges();
    }
  }

  private resolveCanTestTeamsFeedback(): boolean {
    return Boolean(
      this.teams.displayName.trim() &&
      this.teams.tenantId.trim() &&
      this.teams.clientId.trim() &&
      this.teams.credentialRef.trim() &&
      this.teams.teamId.trim() &&
      this.teams.channelId.trim() &&
      this.teams.targetWorkItemSourceId &&
      this.teams.targetRepositoryBindingId,
    );
  }

  private async onExecuteTestTeamsFeedbackCommand(): Promise<boolean> {
    const source = this.teamsSource();
    return source
      ? this._feedback.testFeedbackIntake({ ...source, credentialRef: source.credentialRef! })
      : false;
  }

  private async onExecuteRemoveTeamsFeedbackCommand(): Promise<void> {
    if (!this.data.sourceId) return;
    const current = this.requireSettings();
    if (
      await this._context.saveSettings({
        ...current,
        feedbackIntakeSources: current.feedbackIntakeSources.filter(
          (source) => source.id !== this.data.sourceId,
        ),
      })
    )
      this._drawerRef.close();
  }

  private async onExecuteSaveCommand(): Promise<void> {
    if (this._busy()) return;
    this._busy.set(true);
    try {
      const source = this.teamsSource();
      if (!source) return;
      if (source.enabled && !(await this.onExecuteTestTeamsFeedbackCommand())) return;
      const current = this.requireSettings();
      if (
        await this._context.saveSettings({
          ...current,
          feedbackIntakeSources: upsertSettingsItem(current.feedbackIntakeSources, source),
        })
      )
        this._drawerRef.close();
    } finally {
      this._busy.set(false);
    }
  }

  private createTeamsDraft() {
    const settings = this._context.settings();
    const source = settings?.feedbackIntakeSources.find((item) => item.id === this.data.sourceId);
    const firstTargetSource = settings?.workItemSources.find(
      (item) =>
        item.workspaceId === this.data.workspaceId &&
        item.provider === 'github-projects' &&
        item.enabled,
    );
    const firstRepository = settings?.repositoryBindings.find(
      (item) =>
        item.workspaceId === this.data.workspaceId && item.provider === 'github' && item.enabled,
    );
    return createTrackedSettingsDraft(
      {
        displayName: source?.displayName ?? 'FLAMOX365 feedback',
        tenantId: source?.tenantId ?? '',
        clientId: source?.clientId ?? '',
        credentialRef: source?.credentialRef ?? '',
        teamId: source?.teamId ?? '',
        channelId: source?.channelId ?? '',
        targetWorkItemSourceId: source?.targetWorkItemSourceId ?? firstTargetSource?.id ?? '',
        targetRepositoryBindingId: source?.targetRepositoryBindingId ?? firstRepository?.id ?? '',
        enabled: source?.enabled ?? false,
      },
      () => this._draftRevision.update((revision) => revision + 1),
    );
  }

  private teamsSource(): ApplicationSettingsDto['feedbackIntakeSources'][number] | undefined {
    if (!this.resolveCanTestTeamsFeedback()) return undefined;
    return {
      id: this.data.sourceId ?? `feedback-intake-${crypto.randomUUID()}`,
      workspaceId: this.data.workspaceId,
      displayName: this.teams.displayName.trim(),
      provider: 'microsoft-teams',
      tenantId: this.teams.tenantId.trim(),
      clientId: this.teams.clientId.trim(),
      credentialRef: this.teams.credentialRef.trim(),
      teamId: this.teams.teamId.trim(),
      channelId: this.teams.channelId.trim(),
      targetWorkItemSourceId: this.teams.targetWorkItemSourceId,
      targetRepositoryBindingId: this.teams.targetRepositoryBindingId,
      enabled: this.teams.enabled,
    };
  }

  private requireSettings(): ApplicationSettingsDto {
    const settings = this._context.settings();
    if (!settings) throw new Error('Application settings are not loaded.');
    return settings;
  }

  // #endregion
}
