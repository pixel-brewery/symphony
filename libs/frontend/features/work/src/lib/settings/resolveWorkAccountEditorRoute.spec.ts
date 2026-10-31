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
import { SettingsEditorRegistry } from '@symphony/frontend-setting';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { WORK_SOURCE_SETTINGS_CONTEXT } from '../ports/WorkSourceSettingsContextToken';
import { resolveWorkAccountEditorRoute } from './resolveWorkAccountEditorRoute';

// #endregion

function arrange(repositoryEditor: boolean) {
  const initial = applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp'));
  const settings: ApplicationSettingsDto = {
    ...initial,
    connections: [
      {
        id: 'ado',
        workspaceId: 'personal',
        kind: 'azure-devops',
        displayName: 'Contoso',
        organization: 'contoso',
      },
      {
        id: 'github',
        workspaceId: 'personal',
        kind: 'github',
        displayName: 'GitHub',
        hostname: 'github.com',
        gitProtocol: 'https',
      },
      { id: 'codex', workspaceId: 'personal', kind: 'codex', displayName: 'Codex' },
    ] as ApplicationSettingsDto['connections'],
    workItemSources: [
      {
        id: 'ado-board',
        workspaceId: 'personal',
        connectionId: 'ado',
        provider: 'azure-devops',
        displayName: 'Delivery',
        project: 'Delivery',
        enabled: true,
      },
    ] as ApplicationSettingsDto['workItemSources'],
    repositoryBindings: [
      {
        id: 'symphony',
        workspaceId: 'personal',
        sourceControlConnectionId: 'github',
        displayName: 'Symphony',
        provider: 'github',
        host: 'github.com',
        owner: 'example',
        name: 'symphony',
        defaultBranch: 'main',
        localPath: '',
        enabled: true,
      },
    ],
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: WORK_SOURCE_SETTINGS_CONTEXT, useValue: { settings: signal(settings) } },
      { provide: SettingsEditorRegistry, useValue: { has: () => repositoryEditor } },
    ],
  });
  return TestBed.runInInjectionContext(() => resolveWorkAccountEditorRoute());
}

describe('resolveWorkAccountEditorRoute', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('opens the sheet the account row edits and leaves AI accounts to their feature', () => {
    // arrange
    const resolve = arrange(true);

    // act
    const requests = ['ado', 'github', 'codex'].map((id) => resolve(id, 'personal'));

    // assert
    expect(requests).toEqual([
      { kind: 'azure-devops', workspaceId: 'personal', sourceId: 'ado-board' },
      { kind: 'repository', workspaceId: 'personal', repositoryBindingId: 'symphony' },
      undefined,
    ]);
    expect(resolve('ado', 'other')).toBeUndefined();
  });

  it('has no sheet for a GitHub account when the repository editor is not included', () => {
    // arrange
    const resolve = arrange(false);

    // act
    const request = resolve('github', 'personal');

    // assert
    expect(request).toBeUndefined();
  });
});
