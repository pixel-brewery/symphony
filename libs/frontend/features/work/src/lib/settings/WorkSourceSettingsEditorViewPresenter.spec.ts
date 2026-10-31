// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { ApplicationRef, ChangeDetectorRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { DIALOG_REF, DIALOG_REF_DATA } from '@pixel-brewery/mosaik-elements-angular';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import { SettingsAlertService } from '@symphony/frontend-setting';
import type { ApplicationSettingsDto, ResponsePayload } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { IWorkSourceSettingsContext } from '../ports/IWorkSourceSettingsContext';
import { WORK_SOURCE_SETTINGS_CONTEXT } from '../ports/WorkSourceSettingsContextToken';
import { WorkSourceSettingsEditorViewPresenter } from './WorkSourceSettingsEditorViewPresenter';

// #endregion

function deferred<T>() {
  let resolve: (value: T) => void = () => {
    throw new Error('Read not started.');
  };
  const promise = new Promise<T>((finish) => {
    resolve = finish;
  });
  return { promise, resolve };
}
function arrange(
  data: Record<string, string> = {
    kind: 'github-projects',
    workspaceId: 'personal',
    sourceId: 'edited',
  },
  confirmed = true,
) {
  const initial = applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp'));
  const settings = signal<ApplicationSettingsDto | undefined>({
    ...initial,
    connections: [
      ...initial.connections,
      {
        id: 'ado',
        workspaceId: 'personal',
        kind: 'azure-devops',
        displayName: 'Contoso',
        organization: 'contoso',
        credentialRef: 'keychain:ado',
      },
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
        id: 'edited',
        workspaceId: 'personal',
        connectionId: 'github',
        provider: 'github-projects',
        displayName: 'Existing',
        ownerType: 'organization',
        owner: 'example',
        projectNumber: 1,
        enabled: true,
        columnMappings: [{ columnId: 'saved', stageId: 'analyze' }],
      },
      {
        id: 'other',
        workspaceId: 'personal',
        connectionId: 'github',
        provider: 'github-projects',
        displayName: 'Other',
        ownerType: 'organization',
        owner: 'example',
        projectNumber: 9,
        enabled: true,
      },
      {
        id: 'azure',
        workspaceId: 'personal',
        connectionId: 'ado',
        provider: 'azure-devops',
        displayName: 'Delivery',
        project: 'Delivery',
        wiql: 'SELECT [System.Id] FROM WorkItems',
        enabled: true,
      },
    ],
  });
  const saveSettings = vi.fn<IWorkSourceSettingsContext['saveSettings']>(async () => true);
  const listWorkItemSourceColumns = vi.fn<IWorkSourceSettingsContext['listWorkItemSourceColumns']>(
    async () => ({ columns: [] }),
  );
  const refresh = vi.fn(async () => {}),
    close = vi.fn(),
    confirm = vi.fn<SettingsAlertService['confirm']>(async () => confirmed),
    disconnectAzureDevOps = vi.fn<IWorkSourceSettingsContext['disconnectAzureDevOps']>(
      async () => true,
    );
  const context: IWorkSourceSettingsContext = {
    settings,
    connections: signal(undefined),
    configurationBusy: signal(false),
    editorBusy: signal(false),
    saveSettings,
    listWorkItemSourceColumns,
    refresh,
    refreshConfiguration: async () => {},
    refreshProviderConnections: async () => {},
    listGitHubProjects: async () => ({ projects: [] }),
    connectAzureDevOps: async () => false,
    disconnectAzureDevOps,
  };
  TestBed.configureTestingModule({
    providers: [
      WorkSourceSettingsEditorViewPresenter,
      { provide: WORK_SOURCE_SETTINGS_CONTEXT, useValue: context },
      { provide: DIALOG_REF_DATA, useValue: data },
      { provide: DIALOG_REF, useValue: { close } },
      { provide: SettingsAlertService, useValue: { confirm } },
      { provide: ApplicationRef, useValue: { tick: vi.fn() } },
      { provide: ChangeDetectorRef, useValue: { detectChanges: vi.fn() } },
    ],
  });
  return {
    presenter: TestBed.inject(WorkSourceSettingsEditorViewPresenter),
    settings,
    saveSettings,
    listWorkItemSourceColumns,
    refresh,
    close,
    confirm,
    disconnectAzureDevOps,
  };
}

describe('WorkSourceSettingsEditorViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });
  afterAll(() => TestBed.resetTestEnvironment());

  it('rejects an older provider-column response after another project read owns the draft', async () => {
    // arrange
    const { presenter, listWorkItemSourceColumns } = arrange();
    const first = deferred<ResponsePayload<'work-item-sources.columns'>>(),
      second = deferred<ResponsePayload<'work-item-sources.columns'>>();
    listWorkItemSourceColumns
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    presenter.refreshBoardColumnsCommand.execute();
    presenter.githubProject.projectNumber = 2;
    presenter.refreshBoardColumnsCommand.execute();

    // act
    second.resolve({ columns: [{ id: 'new', label: 'New', suggestedStageId: 'solve' }] });
    await vi.waitFor(() => expect(presenter.boardColumnsBusy()).toBe(false));
    first.resolve({ columns: [{ id: 'old', label: 'Old', suggestedStageId: 'analyze' }] });
    await Promise.resolve();

    // assert
    expect(presenter.boardColumns().map((item) => item.id)).toEqual(['new']);
    expect(presenter.githubProject.columnMappings).toEqual({ new: 'solve' });
  });

  it('retains saved mappings after a provider-read failure and updates only the edited source', async () => {
    // arrange
    const { presenter, settings, saveSettings, listWorkItemSourceColumns, refresh, close } =
      arrange();
    const other = settings()?.workItemSources.find((item) => item.id === 'other');
    listWorkItemSourceColumns.mockResolvedValue({ columns: [], error: 'Temporarily unavailable' });
    presenter.refreshBoardColumnsCommand.execute();
    await vi.waitFor(() => expect(presenter.boardColumnsBusy()).toBe(false));
    presenter.githubProject.displayName = ' Renamed ';

    // act
    presenter.saveCommand.execute();
    await vi.waitFor(() => expect(presenter.busy()).toBe(false));

    // assert
    const saved = saveSettings.mock.calls[0]?.[0];
    expect(saved?.workItemSources.find((item) => item.id === 'edited')).toMatchObject({
      displayName: 'Renamed',
      columnMappings: [{ columnId: 'saved', stageId: 'analyze' }],
    });
    expect(saved?.workItemSources.find((item) => item.id === 'other')).toEqual(other);
    expect(saved?.connections).toEqual(settings()?.connections);
    expect(close).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('removes a GitHub Projects board only after a destructive confirmation', async () => {
    // arrange
    const declined = arrange(undefined, false);
    declined.presenter.removeGitHubProjectCommand.execute();
    await vi.waitFor(() => expect(declined.confirm).toHaveBeenCalledOnce());
    expect(declined.saveSettings).not.toHaveBeenCalled();
    TestBed.resetTestingModule();
    const { presenter, confirm, saveSettings, close } = arrange();

    // act
    presenter.removeGitHubProjectCommand.execute();
    await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());

    // assert
    expect(confirm.mock.calls[0]?.[0]).toMatchObject({
      header: 'Remove Existing?',
      tone: 'danger',
      confirmLabel: 'Remove board',
      destructive: true,
    });
    expect(saveSettings.mock.calls[0]?.[0].workItemSources.map((item) => item.id)).toEqual([
      'other',
      'azure',
    ]);
  });

  it('keeps Save disabled and names the missing Azure DevOps details until they are entered', () => {
    // arrange
    const { presenter } = arrange({ kind: 'azure-devops', workspaceId: 'personal' });
    presenter.azure.wiql = '';

    // act
    const before = { canSave: presenter.canSave(), issues: presenter.azureValidationIssues() };
    presenter.azure.displayName = 'Delivery';
    presenter.azure.organization = 'contoso';
    presenter.azure.project = 'Delivery';
    presenter.azure.queryId = 'saved-query';

    // assert
    expect(before).toEqual({
      canSave: false,
      issues: ['display-name', 'organization', 'project', 'query'],
    });
    expect(presenter.azureValidationIssues()).toEqual([]);
    expect(presenter.canSave()).toBe(true);
  });

  it('removes an Azure DevOps source with its unused account and stored token after confirming', async () => {
    // arrange
    const { presenter, confirm, disconnectAzureDevOps, saveSettings, close } = arrange({
      kind: 'azure-devops',
      workspaceId: 'personal',
      sourceId: 'azure',
    });

    // act
    presenter.removeAzureDevOpsSourceCommand.execute();
    await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());

    // assert
    expect(presenter.hasExistingAzureDevOpsSource()).toBe(true);
    expect(confirm.mock.calls[0]?.[0]).toMatchObject({
      header: 'Remove Delivery?',
      confirmLabel: 'Remove source',
      destructive: true,
    });
    expect(disconnectAzureDevOps).toHaveBeenCalledExactlyOnceWith('ado');
    const saved = saveSettings.mock.calls[0]?.[0];
    expect(saved?.workItemSources.map((item) => item.id)).toEqual(['edited', 'other']);
    expect(saved?.connections.some((item) => item.id === 'ado')).toBe(false);
  });
});
