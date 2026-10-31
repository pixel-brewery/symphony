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
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { WORKSPACE_SETTINGS_CONTEXT } from '../ports/WorkspaceSettingsContextToken';
import { workspaceSearchEntries } from './workspaceSearchEntries';

// #endregion

describe('workspaceSearchEntries', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('lists every workspace with the key that opens its Edit workspace sheet', () => {
    // arrange
    const settings = applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp'));
    const workspace = settings.workspaces[0]!;
    settings.workspaces = [
      workspace,
      { ...workspace, id: 'archive', displayName: 'Archive', shortCode: 'AR', enabled: false },
    ];
    TestBed.configureTestingModule({
      providers: [
        { provide: WORKSPACE_SETTINGS_CONTEXT, useValue: { settings: signal(settings) } },
      ],
    });

    // act
    const entries = TestBed.runInInjectionContext(() => workspaceSearchEntries())();

    // assert
    expect(entries).toEqual([
      expect.objectContaining({
        label: workspace.displayName,
        description: `Workspace · ${workspace.shortCode}`,
        parameters: { edit: workspace.id },
      }),
      expect.objectContaining({
        label: 'Archive',
        description: 'Workspace · AR',
        value: 'Disabled',
        parameters: { edit: 'archive' },
      }),
    ]);
  });
});
