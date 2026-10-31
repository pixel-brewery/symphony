// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { ApplicationRef, ChangeDetectorRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { DRAWER_REF, DRAWER_REF_DATA } from '@pixel-brewery/mosaik-elements-angular';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
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
function arrange() {
  const initial = applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp'));
  const settings = signal<ApplicationSettingsDto | undefined>({
    ...initial,
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
    ],
  });
  const saveSettings = vi.fn<IWorkSourceSettingsContext['saveSettings']>(async () => true);
  const listWorkItemSourceColumns = vi.fn<IWorkSourceSettingsContext['listWorkItemSourceColumns']>(
    async () => ({ columns: [] }),
  );
  const refresh = vi.fn(async () => {}),
    close = vi.fn();
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
    disconnectAzureDevOps: async () => false,
  };
  TestBed.configureTestingModule({
    providers: [
      WorkSourceSettingsEditorViewPresenter,
      { provide: WORK_SOURCE_SETTINGS_CONTEXT, useValue: context },
      {
        provide: DRAWER_REF_DATA,
        useValue: { kind: 'github-projects', workspaceId: 'personal', sourceId: 'edited' },
      },
      { provide: DRAWER_REF, useValue: { close } },
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
});
