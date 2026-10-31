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
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { WORK_SOURCE_SETTINGS_CONTEXT } from '../ports/WorkSourceSettingsContextToken';
import { workSettingsSearchEntries } from './workSettingsSearchEntries';

// #endregion

describe('workSettingsSearchEntries', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('lists boards with their state and work accounts, each with the key that opens its sheet', () => {
    // arrange
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
          enabled: false,
        },
      ] as ApplicationSettingsDto['workItemSources'],
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: WORK_SOURCE_SETTINGS_CONTEXT, useValue: { settings: signal(settings) } },
      ],
    });

    // act
    const entries = TestBed.runInInjectionContext(() => workSettingsSearchEntries())();

    // assert
    expect(
      entries.map(({ label, description, group, value, parameters }) => ({
        label,
        description,
        group,
        value,
        parameters,
      })),
    ).toEqual([
      {
        label: 'Delivery',
        description: 'Azure DevOps · Delivery',
        group: 'Boards',
        value: 'Disabled',
        parameters: { board: 'ado-board' },
      },
      {
        label: 'Contoso',
        description: 'Azure DevOps · contoso',
        group: 'Accounts',
        value: undefined,
        parameters: { account: 'ado' },
      },
    ]);
  });
});
