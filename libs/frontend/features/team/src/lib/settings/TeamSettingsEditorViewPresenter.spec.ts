// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { ApplicationRef, ChangeDetectorRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import {
  DRAWER_REF,
  DRAWER_REF_DATA,
  MessageBoxService,
} from '@pixel-brewery/mosaik-elements-angular';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import type { ApplicationSettingsDto, ResponsePayload } from '@symphony/ipc-contracts-composition';
import { Subject } from 'rxjs';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ITeamConfigurationContext } from '../ports/ITeamConfigurationContext';
import { TEAM_SETTINGS_CONTEXT } from '../ports/TeamSettingsContextToken';
import { createTeamSettingsContext } from '../provider/createTeamSettingsContext';
import { TeamSettingsEditorViewPresenter } from './TeamSettingsEditorViewPresenter';

// #endregion

function arrange(nativeInstallAvailable = true, runtimeAvailable = true) {
  const initial = applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp'));
  const settings = signal<ApplicationSettingsDto | undefined>({
    ...initial,
    connections: [
      ...initial.connections,
      {
        id: 'primary',
        workspaceId: 'personal',
        kind: 'claude',
        displayName: 'Primary',
        credentialSource: 'isolated',
      },
      { id: 'backup', workspaceId: 'personal', kind: 'opencode', displayName: 'Backup' },
    ],
  });
  const saveSettings = vi.fn<ITeamConfigurationContext['saveSettings']>(async () => true);
  const confirmation = new Subject<{ reason: 'positive' }>();
  const show = vi.fn(() => ({ closed: confirmation }));
  const installRuntimeDependency = vi.fn<ITeamConfigurationContext['installRuntimeDependency']>(
    async () => false,
  );
  const environment: ITeamConfigurationContext = {
    nativeInstallAvailable,
    settings,
    configurationBusy: signal(false),
    editorBusy: signal(false),
    connections: signal(undefined),
    runtimeHealth: signal<ResponsePayload<'health.get'> | undefined>({
      status: 'ready',
      utilityProcess: true,
      database: true,
      homebrew: { available: true },
      git: { available: true },
      githubCli: { available: true },
      agents: {
        codex: { available: runtimeAvailable },
        claude: { available: runtimeAvailable },
        opencode: { available: runtimeAvailable },
      },
    }),
    runtimeDependencyInstallBusy: signal(undefined),
    saveSettings,
    refreshConfiguration: async () => {},
    refreshProviderConnections: async () => {},
    installRuntimeDependency,
  };
  const context = { ...createTeamSettingsContext(environment, null), aiAvailable: true };
  const close = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      TeamSettingsEditorViewPresenter,
      { provide: TEAM_SETTINGS_CONTEXT, useValue: context },
      {
        provide: DRAWER_REF_DATA,
        useValue: { kind: 'ai', workspaceId: 'personal', connectionId: 'primary' },
      },
      { provide: DRAWER_REF, useValue: { close } },
      { provide: MessageBoxService, useValue: { show } },
      { provide: ApplicationRef, useValue: { tick: vi.fn() } },
      { provide: ChangeDetectorRef, useValue: { detectChanges: vi.fn() } },
    ],
  });
  const presenter = TestBed.inject(TeamSettingsEditorViewPresenter);
  presenter.ai.displayName = 'Reviewer';
  presenter.ai.positionName = 'Review';
  presenter.ai.roles = ['analysis', 'solution'];
  presenter.ai.model = 'sonnet';
  presenter.ai.reasoningEffort = 'high';
  return { presenter, settings, saveSettings, close, show, confirmation, installRuntimeDependency };
}

describe('TeamSettingsEditorViewPresenter', () => {
  it.each([false, true])(
    'requires the actual Platform owner before confirming native installation: %s',
    async (nativeInstallAvailable) => {
      // arrange
      const { presenter, show, confirmation, installRuntimeDependency } = arrange(
        nativeInstallAvailable,
        false,
      );

      // act
      presenter.confirmInstallAiRuntimeCommand.execute(['claude', 'Claude Code']);
      if (nativeInstallAvailable) confirmation.next({ reason: 'positive' });
      await Promise.resolve();

      // assert
      expect(presenter.confirmInstallAiRuntimeCommand.canExecute()).toBe(nativeInstallAvailable);
      expect(show).toHaveBeenCalledTimes(nativeInstallAvailable ? 1 : 0);
      expect(installRuntimeDependency).toHaveBeenCalledTimes(nativeInstallAvailable ? 1 : 0);
    },
  );

  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });
  afterAll(() => TestBed.resetTestEnvironment());

  it('persists the agent, position, ordered backups and responsibility assignments in one aggregate save', async () => {
    // arrange
    const { presenter, settings, saveSettings, close } = arrange();
    const current = settings();
    presenter.ai.fallbackConnectionIds = ['backup'];
    presenter.ai.fallbackModels = { backup: 'backup-model' };
    presenter.ai.fallbackEfforts = { backup: 'medium' };

    // act
    presenter.saveCommand.execute();
    await vi.waitFor(() => expect(presenter.busy()).toBe(false));

    // assert
    expect(saveSettings).toHaveBeenCalledOnce();
    const saved = saveSettings.mock.calls[0]?.[0];
    const agent = saved?.agentProfiles.find((item) => item.id === presenter.ai.profileId);
    const route = saved?.agentRoutePolicies.find((item) => item.id === agent?.routePolicyId);
    expect(agent?.displayName).toBe('Reviewer');
    expect(saved?.positions.find((item) => item.id === agent?.positionId)?.allowedRoles).toEqual([
      'analysis',
      'solution',
    ]);
    expect(
      route?.candidates.map((item) => [
        item.aiConnectionId,
        item.priority,
        item.model,
        item.reasoningEffort,
      ]),
    ).toEqual([
      ['primary', 0, 'sonnet', 'high'],
      ['backup', 1, 'backup-model', 'medium'],
    ]);
    expect(
      saved?.agentTeams
        .find((item) => item.workspaceId === 'personal')
        ?.assignments.filter((item) => item.primaryAgentId === agent?.id)
        .map((item) => item.role),
    ).toEqual(expect.arrayContaining(['analysis', 'solution']));
    expect(saved?.connections).toEqual(current?.connections);
    expect(saved?.workItemSources).toEqual(current?.workItemSources);
    expect(close).toHaveBeenCalledOnce();
  });

  it('keeps the current draft open when the sole configuration writer rejects the save', async () => {
    // arrange
    const { presenter, saveSettings, close } = arrange();
    saveSettings.mockResolvedValue(false);

    // act
    presenter.saveCommand.execute();
    await vi.waitFor(() => expect(presenter.busy()).toBe(false));

    // assert
    expect(saveSettings).toHaveBeenCalledOnce();
    expect(close).not.toHaveBeenCalled();
    expect(presenter.ai.displayName).toBe('Reviewer');
  });
});
