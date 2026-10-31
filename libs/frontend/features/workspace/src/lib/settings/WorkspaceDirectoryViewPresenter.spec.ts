// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import {
  SettingsAlertService,
  SettingsEditorService,
  SettingsHostSession,
} from '@symphony/frontend-setting';
import type { ApplicationSettingsDto, ResponsePayload } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { IWorkspacePathSelector } from '../ports/IWorkspacePathSelector';
import { WORKSPACE_PATH_SELECTOR } from '../ports/WorkspacePathSelectorToken';
import { WORKSPACE_SETTINGS_CONTEXT } from '../ports/WorkspaceSettingsContextToken';
import { RepositoryRuntimeStore } from '../state/RepositoryRuntimeStore';
import { WorkspaceStore } from '../state/WorkspaceStore';
import { WorkspaceDirectoryViewPresenter } from './WorkspaceDirectoryViewPresenter';

// #endregion

function arrange(confirmed = true) {
  const initial = applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp'));
  const workspace = initial.workspaces[0]!;
  const settings = signal<ApplicationSettingsDto>({
    ...initial,
    workspaces: [
      { ...workspace, id: 'flamox', displayName: 'FLAMOX365', storageLimitGiB: 20 },
      { ...workspace, id: 'personal', displayName: 'Personal', enabled: false },
    ],
    agentProfiles: initial.agentProfiles.map((profile) => ({
      ...profile,
      workspaceId: 'flamox',
    })),
    connections: initial.connections.map((connection) => ({
      ...connection,
      workspaceId: 'flamox',
    })),
  });
  const storageStatus = signal<ResponsePayload<'storage.status.get'> | undefined>(undefined);
  const repositoryRuntimeStatuses = signal<ResponsePayload<'repositories.runtime.list'>>([]);
  const selectPath = vi.fn<IWorkspacePathSelector['selectPath']>(async () => ({
    canceled: false,
    paths: ['/tmp/flamox.json'],
  }));
  const confirm = vi.fn<SettingsAlertService['confirm']>(async () => confirmed);
  const open = vi.fn(async () => undefined);
  const importWorkspace = vi.fn(async () => true);
  TestBed.configureTestingModule({
    providers: [
      SettingsHostSession,
      WorkspaceDirectoryViewPresenter,
      {
        provide: WORKSPACE_SETTINGS_CONTEXT,
        useValue: { settings, storageStatus, configurationBusy: signal(false) },
      },
      { provide: WORKSPACE_PATH_SELECTOR, useValue: { selectPath } },
      { provide: SettingsAlertService, useValue: { confirm } },
      { provide: SettingsEditorService, useValue: { open } },
      { provide: RepositoryRuntimeStore, useValue: { repositoryRuntimeStatuses } },
      {
        provide: WorkspaceStore,
        useValue: { importWorkspace, workspaceTransferBusy: signal(undefined) },
      },
    ],
  });
  return {
    initial,
    storageStatus,
    selectPath,
    confirm,
    open,
    importWorkspace,
    session: TestBed.inject(SettingsHostSession),
    presenter: TestBed.inject(WorkspaceDirectoryViewPresenter),
  };
}

describe('WorkspaceDirectoryViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('summarizes each workspace and lists disabled workspaces apart', () => {
    // arrange
    const { initial, presenter } = arrange();

    // act
    const enabled = presenter.enabledEntries();
    const disabled = presenter.disabledEntries();

    // assert
    expect(enabled.map((entry) => entry.workspace.id)).toEqual(['flamox']);
    expect(disabled.map((entry) => entry.workspace.id)).toEqual(['personal']);
    expect(enabled[0]).toMatchObject({
      agents: initial.agentProfiles.length,
      repositories: 0,
      unpreparedRepositories: 0,
      storage: undefined,
    });
    expect(disabled[0]).toMatchObject({ agents: 0, aiAccounts: 0 });
  });

  it('opens a workspace on its AI team and adds one through the workspace sheet', () => {
    // arrange
    const { presenter, session, open } = arrange();

    // act
    presenter.openSettingsWorkspaceCommand.execute('flamox');
    presenter.addWorkspaceCommand.execute();

    // assert
    expect(session.workspaceId()).toBe('flamox');
    expect(session.workspaceSection()).toBe('team');
    expect(open).toHaveBeenCalledExactlyOnceWith({ kind: 'workspace' });
  });

  it('imports a chosen bundle only after the alert sheet is confirmed', async () => {
    // arrange
    const accepted = arrange(true);

    // act
    accepted.presenter.importWorkspaceCommand.execute();
    await vi.waitFor(() => expect(accepted.importWorkspace).toHaveBeenCalledOnce());

    // assert
    expect(accepted.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        header: 'Import workspace configuration?',
        confirmLabel: 'Import workspace',
        cancelLabel: 'Cancel',
      }),
    );
    expect(accepted.importWorkspace).toHaveBeenCalledWith('/tmp/flamox.json');
  });

  it('keeps the configuration when the import is cancelled', async () => {
    // arrange
    const { presenter, confirm, importWorkspace } = arrange(false);

    // act
    presenter.importWorkspaceCommand.execute();
    await vi.waitFor(() => expect(confirm).toHaveBeenCalledOnce());

    // assert
    expect(importWorkspace).not.toHaveBeenCalled();
  });
});
