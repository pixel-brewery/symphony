// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideViewSlot } from '@pixel-brewery/mosaik-elements-angular';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import {
  provideSettings,
  SETTINGS_WORKSPACE_CONTEXT,
  SettingsViewSlot,
} from '@symphony/frontend-setting';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { IWorkspaceSettingsContext } from '../ports/IWorkspaceSettingsContext';
import { WORKSPACE_SETTINGS_CONTEXT } from '../ports/WorkspaceSettingsContextToken';
import { WorkspaceServicesViewPresenter } from './WorkspaceServicesViewPresenter';

// #endregion

function arrange(includeWork = true) {
  const initial = applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp'));
  const settings = signal<ApplicationSettingsDto | undefined>({
    ...initial,
    connections: [
      {
        id: 'ai-first',
        workspaceId: 'personal',
        kind: 'codex',
        displayName: 'First',
        credentialSource: 'isolated',
      },
      {
        id: 'source-middle',
        workspaceId: 'personal',
        kind: 'azure-devops',
        displayName: 'Source',
        organization: 'example',
      },
      {
        id: 'ai-last',
        workspaceId: 'personal',
        kind: 'claude',
        displayName: 'Last',
        credentialSource: 'isolated',
      },
      {
        id: 'repository-account',
        workspaceId: 'personal',
        kind: 'github',
        displayName: 'Repository',
        hostname: 'github.com',
        gitProtocol: 'https',
      },
      { id: 'other-workspace', workspaceId: 'other', kind: 'opencode', displayName: 'Other' },
    ],
    repositoryBindings: [
      {
        id: 'repository',
        workspaceId: 'personal',
        sourceControlConnectionId: 'repository-account',
        provider: 'github',
        host: 'github.com',
        localPath: '',
        owner: 'example',
        name: 'repository',
        displayName: 'Repository',
        defaultBranch: 'main',
        enabled: true,
      },
    ],
  });
  const workspaceId = signal<string | null>('personal');
  const context: IWorkspaceSettingsContext = {
    settings,
    configurationBusy: signal(false),
    editorBusy: signal(false),
    storageStatus: signal(undefined),
  };
  TestBed.configureTestingModule({
    providers: [
      provideSettings(),
      WorkspaceServicesViewPresenter,
      { provide: WORKSPACE_SETTINGS_CONTEXT, useValue: context },
      {
        provide: SETTINGS_WORKSPACE_CONTEXT,
        useValue: { workspaceId, sectionId: signal('services') },
      },
      ...(includeWork
        ? [
            provideViewSlot(SettingsViewSlot.WorkspaceServicesBoards, [{ id: 'work-boards' }]),
            provideViewSlot(SettingsViewSlot.WorkspaceServicesAccount, [{ id: 'work-account' }]),
          ]
        : []),
    ],
  });
  return { presenter: TestBed.inject(WorkspaceServicesViewPresenter), settings, workspaceId };
}

describe('WorkspaceServicesViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('preserves interleaved accounts, excludes repository-managed accounts and follows only Settings workspace selection', () => {
    // arrange
    const { presenter, settings, workspaceId } = arrange();
    const activeScope = settings()?.activeViewScope;
    const personal = presenter.accounts().map((item) => item.id);

    // act
    workspaceId.set('other');

    // assert
    expect(personal).toEqual(['ai-first', 'source-middle', 'ai-last']);
    expect(presenter.accounts().map((item) => item.id)).toEqual(['other-workspace']);
    expect(settings()?.activeViewScope).toEqual(activeScope);
  });

  it('omits Work-specific structure when no native Work fragments are registered', () => {
    // arrange
    const { presenter } = arrange(false);

    // act / assert
    expect(presenter.hasBoards()).toBe(false);
    expect(presenter.hasAccounts()).toBe(false);
    expect(presenter.hasAvailable()).toBe(false);
  });
});
