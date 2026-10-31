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
import { DELIVERY_SETTINGS_CONTEXT } from '../ports/DeliverySettingsContextToken';
import { repositorySearchEntries } from './repositorySearchEntries';

// #endregion

describe('repositorySearchEntries', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('lists every repository of its workspace with the key that opens its sheet', () => {
    // arrange
    const settings = applicationSettingsSchema.parse(createDefaultApplicationSettings());
    settings.repositoryBindings = [true, false].map((enabled, index) => ({
      id: `repository-${index}`,
      workspaceId: 'personal',
      sourceControlConnectionId: 'github',
      displayName: `Repository ${index}`,
      provider: 'github',
      host: 'github.com',
      owner: 'example',
      name: `repo-${index}`,
      defaultBranch: 'main',
      localPath: '',
      enabled,
    }));
    TestBed.configureTestingModule({
      providers: [{ provide: DELIVERY_SETTINGS_CONTEXT, useValue: { settings: signal(settings) } }],
    });

    // act
    const entries = TestBed.runInInjectionContext(() => repositorySearchEntries())();

    // assert
    expect(entries).toEqual([
      expect.objectContaining({
        label: 'Repository 0',
        description: 'example/repo-0',
        workspaceId: 'personal',
        parameters: { repository: 'repository-0' },
      }),
      expect.objectContaining({ label: 'Repository 1', value: 'Disabled' }),
    ]);
    expect(entries[0]?.value).toBeUndefined();
  });
});
