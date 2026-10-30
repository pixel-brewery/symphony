// @vitest-environment jsdom

// #region Imports

import { ApplicationRef, ChangeDetectorRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { DRAWER_REF, DRAWER_REF_DATA } from '@pixel-brewery/mosaik-elements-angular';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { FEEDBACK_SETTINGS_CONTEXT } from '../ports/FeedbackSettingsContextToken';
import type { IFeedbackSettingsContext } from '../ports/IFeedbackSettingsContext';
import { FeedbackStore } from '../state/FeedbackStore';
import { FeedbackSettingsEditorViewPresenter } from './FeedbackSettingsEditorViewPresenter';

// #endregion

function arrange(
  options: { enabled?: boolean; test?: () => Promise<boolean>; save?: boolean } = {},
) {
  const initial = createDefaultApplicationSettings('/tmp');
  const settings = signal<ApplicationSettingsDto>(
    applicationSettingsSchema.parse({
      ...initial,
      agentTeams: initial.agentTeams.map((team) => ({
        ...team,
        assignments: team.assignments.map((assignment) =>
          assignment.role === 'work-item-creation'
            ? { ...assignment, skillId: 'workspace-creator' }
            : assignment,
        ),
      })),
      deliveryContexts: [
        {
          id: 'delivery',
          workspaceId: 'personal',
          displayName: 'Delivery',
          workItemSourceIds: ['project'],
          repositoryBindingIds: ['repository'],
          ciBindingIds: [],
          agentTeamId: 'personal-default-team',
          enabled: true,
        },
      ],
      connections: [
        ...initial.connections,
        {
          id: 'github',
          workspaceId: 'personal',
          kind: 'github',
          displayName: 'GitHub',
          hostname: 'github.com',
          gitProtocol: 'https',
        },
      ],
      workItemSources: [
        {
          id: 'project',
          workspaceId: 'personal',
          connectionId: 'github',
          provider: 'github-projects',
          displayName: 'Project',
          ownerType: 'user',
          owner: 'owner',
          projectNumber: 1,
          enabled: true,
        },
      ],
      repositoryBindings: [
        {
          id: 'repository',
          workspaceId: 'personal',
          sourceControlConnectionId: 'github',
          displayName: 'Repository',
          provider: 'github',
          host: 'github.com',
          owner: 'owner',
          name: 'repo',
          defaultBranch: 'main',
          localPath: '',
          enabled: true,
        },
      ],
      feedbackIntakeSources: [
        {
          id: 'feedback',
          workspaceId: 'personal',
          displayName: 'Channel',
          provider: 'microsoft-teams',
          tenantId: '00000000-0000-4000-8000-000000000001',
          clientId: '00000000-0000-4000-8000-000000000002',
          credentialRef: 'env:TEAMS_FEEDBACK_CLIENT_SECRET',
          teamId: '00000000-0000-4000-8000-000000000003',
          channelId: 'channel',
          targetWorkItemSourceId: 'project',
          targetRepositoryBindingId: 'repository',
          enabled: options.enabled ?? false,
        },
      ],
    }),
  );
  const saveSettings = vi.fn<IFeedbackSettingsContext['saveSettings']>(
    async () => options.save ?? true,
  );
  const context: IFeedbackSettingsContext = {
    settings,
    configurationBusy: signal(false),
    editorBusy: signal(false),
    refreshConfiguration: async () => undefined,
    saveSettings,
  };
  const testFeedbackIntake = vi.fn(options.test ?? (async () => true));
  const close = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      FeedbackSettingsEditorViewPresenter,
      { provide: FEEDBACK_SETTINGS_CONTEXT, useValue: context },
      {
        provide: FeedbackStore,
        useValue: { feedbackIntakeTestBusy: signal(false), testFeedbackIntake },
      },
      {
        provide: DRAWER_REF_DATA,
        useValue: { kind: 'teams-feedback', workspaceId: 'personal', sourceId: 'feedback' },
      },
      { provide: DRAWER_REF, useValue: { close } },
      { provide: ChangeDetectorRef, useValue: { detectChanges: vi.fn() } },
      { provide: ApplicationRef, useValue: { tick: vi.fn() } },
    ],
  });
  return {
    presenter: TestBed.inject(FeedbackSettingsEditorViewPresenter),
    settings,
    saveSettings,
    testFeedbackIntake,
    close,
  };
}

describe('FeedbackSettingsEditorViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('updates required-field validation when a mutable native form field changes', () => {
    // arrange
    const { presenter } = arrange();
    expect(presenter.canTestTeamsFeedback()).toBe(true);

    // act
    presenter.teams.channelId = '  ';

    // assert
    expect(presenter.canTestTeamsFeedback()).toBe(false);
    presenter.teams.channelId = 'changed';
    expect(presenter.canTestTeamsFeedback()).toBe(true);
  });

  it('does not enable or persist a channel after its connection test fails', async () => {
    // arrange
    const { presenter, saveSettings, testFeedbackIntake, close } = arrange({
      enabled: true,
      test: async () => false,
    });

    // act
    presenter.saveCommand.execute();
    await vi.waitFor(() => expect(presenter.busy()).toBe(false));

    // assert
    expect(testFeedbackIntake).toHaveBeenCalledOnce();
    expect(saveSettings).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it('reads current settings after the test and preserves unrelated changes made while it ran', async () => {
    // arrange
    let complete: (success: boolean) => void = () => undefined;
    const pending = new Promise<boolean>((resolve) => {
      complete = resolve;
    });
    const { presenter, settings, saveSettings, close } = arrange({
      enabled: true,
      test: () => pending,
    });
    presenter.teams.displayName = ' Updated channel ';

    // act
    presenter.saveCommand.execute();
    settings.update((current) => ({
      ...current,
      user: { ...current.user, displayName: 'Concurrent rename' },
    }));
    complete(true);
    await vi.waitFor(() => expect(presenter.busy()).toBe(false));

    // assert
    expect(saveSettings).toHaveBeenCalledOnce();
    const saved = saveSettings.mock.calls[0]?.[0];
    expect(saved?.user.displayName).toBe('Concurrent rename');
    expect(saved?.feedbackIntakeSources).toMatchObject([
      { id: 'feedback', displayName: 'Updated channel', enabled: true },
    ]);
    expect(saved?.workItemSources).toEqual(settings().workItemSources);
    expect(close).toHaveBeenCalledOnce();
  });

  it('saves a disabled intake without making a channel request', async () => {
    // arrange
    const { presenter, saveSettings, testFeedbackIntake, close } = arrange();

    // act
    presenter.saveCommand.execute();
    await vi.waitFor(() => expect(presenter.busy()).toBe(false));

    // assert
    expect(testFeedbackIntake).not.toHaveBeenCalled();
    expect(saveSettings).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });

  it('keeps the editor open when removing the intake cannot be persisted', async () => {
    // arrange
    const { presenter, settings, saveSettings, close } = arrange({ save: false });

    // act
    presenter.removeTeamsFeedbackCommand.execute();
    await vi.waitFor(() => expect(saveSettings).toHaveBeenCalledOnce());

    // assert
    expect(saveSettings.mock.calls[0]?.[0].feedbackIntakeSources).toEqual([]);
    expect(settings().feedbackIntakeSources).toHaveLength(1);
    expect(close).not.toHaveBeenCalled();
  });
});
