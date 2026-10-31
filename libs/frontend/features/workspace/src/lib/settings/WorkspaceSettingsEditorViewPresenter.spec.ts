// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { DIALOG_REF, DIALOG_REF_DATA } from '@pixel-brewery/mosaik-elements-angular';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { WorkspaceAvatarPicker } from '../appearance/WorkspaceAvatarPicker';
import type { IWorkspaceSettingsContext } from '../ports/IWorkspaceSettingsContext';
import { WORKSPACE_CONFIGURATION } from '../ports/WorkspaceConfigurationToken';
import type { IWorkspaceConfiguration } from '../ports/IWorkspaceConfiguration';
import { WORKSPACE_SETTINGS_CONTEXT } from '../ports/WorkspaceSettingsContextToken';
import { WorkspaceSettingsEditorViewPresenter } from './WorkspaceSettingsEditorViewPresenter';

// #endregion

function arrange(workspaceId?: string) {
  const initial = applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp'));
  const settings = signal<ApplicationSettingsDto | undefined>({
    ...initial,
    workspaces: [
      {
        id: 'workspace-a',
        displayName: 'Existing',
        shortCode: 'OLD',
        color: '#123456',
        avatar: { kind: 'icon', value: 'folder' },
        enabled: true,
        isolation: 'strict',
        storageLimitGiB: 42,
        localCiEnabled: true,
        automaticDeliveryGroupingEnabled: true,
      },
    ],
    activeViewScope: { ...initial.activeViewScope, workspaceIds: ['workspace-a'] },
  });
  const context: IWorkspaceSettingsContext = {
    settings,
    configurationBusy: signal(false),
    editorBusy: signal(false),
    storageStatus: signal(undefined),
  };
  const close = vi.fn();
  const saveSettings = vi.fn<IWorkspaceConfiguration['saveSettings']>(async () => true);
  const pick = vi.fn<WorkspaceAvatarPicker['pick']>(async () => undefined);
  TestBed.configureTestingModule({
    providers: [
      WorkspaceSettingsEditorViewPresenter,
      { provide: WorkspaceAvatarPicker, useValue: { pick } },
      { provide: WORKSPACE_SETTINGS_CONTEXT, useValue: context },
      { provide: WORKSPACE_CONFIGURATION, useValue: { saveSettings } },
      { provide: DIALOG_REF_DATA, useValue: { kind: 'workspace', workspaceId } },
      { provide: DIALOG_REF, useValue: { close } },
    ],
  });
  return {
    presenter: TestBed.inject(WorkspaceSettingsEditorViewPresenter),
    settings,
    close,
    saveSettings,
    pick,
  };
}

describe('WorkspaceSettingsEditorViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });
  afterAll(() => TestBed.resetTestEnvironment());

  it('renames a workspace without resetting its other feature settings or active scope', async () => {
    // arrange
    const { presenter, saveSettings, close } = arrange('workspace-a');
    presenter.workspace.displayName = ' Renamed ';
    presenter.workspace.shortCode = 'longshortcode';

    // act
    presenter.saveCommand.execute();
    await vi.waitFor(() => expect(presenter.busy()).toBe(false));

    // assert
    expect(saveSettings).toHaveBeenCalledOnce();
    const saved = saveSettings.mock.calls[0]?.[0];
    expect(saved?.workspaces[0]).toMatchObject({
      id: 'workspace-a',
      displayName: 'Renamed',
      shortCode: 'LONGSHOR',
      color: '#123456',
      avatar: { kind: 'icon', value: 'folder' },
      storageLimitGiB: 42,
      localCiEnabled: true,
      automaticDeliveryGroupingEnabled: true,
    });
    expect(saved?.activeViewScope.workspaceIds).toEqual(['workspace-a']);
    expect(close).toHaveBeenCalledOnce();
  });

  it('keeps a confirmed icon and color in the draft until the workspace is saved', async () => {
    // arrange
    const { presenter, saveSettings, pick } = arrange('workspace-a');
    pick.mockResolvedValue({ avatar: { kind: 'monogram', value: 'FX' }, color: '#F97316' });

    // act
    presenter.chooseAvatarCommand.execute();
    await vi.waitFor(() => expect(presenter.avatarBusy()).toBe(false));

    // assert
    expect(presenter.workspace.avatar).toEqual({ kind: 'monogram', value: 'FX' });
    expect(presenter.workspace.color).toBe('#F97316');
    expect(saveSettings).not.toHaveBeenCalled();

    // act
    presenter.saveCommand.execute();
    await vi.waitFor(() => expect(presenter.busy()).toBe(false));

    // assert
    expect(saveSettings.mock.calls[0]?.[0].workspaces[0]).toMatchObject({
      color: '#F97316',
      avatar: { kind: 'monogram', value: 'FX' },
    });
  });

  it('retains the original icon when the picker is cancelled and writes nothing on editor cancellation', async () => {
    // arrange
    const { presenter, saveSettings, close, pick } = arrange('workspace-a');
    const original = presenter.workspace;

    // act
    presenter.chooseAvatarCommand.execute();
    await vi.waitFor(() => expect(presenter.avatarBusy()).toBe(false));
    presenter.closeCommand.execute();

    // assert
    expect(pick).toHaveBeenCalledOnce();
    expect(presenter.workspace).toBe(original);
    expect(saveSettings).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
  });

  it('does not persist invalid required fields or close the draft', () => {
    // arrange
    const { presenter, saveSettings, close } = arrange();
    presenter.workspace.displayName = 'New';
    presenter.workspace.shortCode = 'NEW';
    presenter.workspace.color = 'invalid';

    // act
    presenter.saveCommand.execute();

    // assert
    expect(saveSettings).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    expect(presenter.busy()).toBe(false);
    expect(presenter.error()).toBe('invalid');
  });

  it('prevents a second save while persistence is pending and retains the sheet after rejection', async () => {
    // arrange
    const { presenter, saveSettings, close } = arrange('workspace-a');
    let finish: (saved: boolean) => void = () => {
      throw new Error('Save was not started.');
    };
    saveSettings.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    );

    // act
    presenter.saveCommand.execute();
    presenter.saveCommand.execute();
    finish(false);
    await vi.waitFor(() => expect(presenter.busy()).toBe(false));

    // assert
    expect(saveSettings).toHaveBeenCalledOnce();
    expect(close).not.toHaveBeenCalled();
    expect(presenter.error()).toBe('save');
  });
});
