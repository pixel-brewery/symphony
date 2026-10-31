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
import { deliveryTargetSearchEntries } from './deliveryTargetSearchEntries';

// #endregion

describe('deliveryTargetSearchEntries', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('groups destinations by project and opens the destination sheet of that project', () => {
    // arrange
    const settings = applicationSettingsSchema.parse(createDefaultApplicationSettings());
    settings.repositoryBindings = [
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
    ];
    settings.deliveryTargets = [
      {
        id: 'production',
        workspaceId: 'personal',
        repositoryBindingId: 'symphony',
        displayName: 'Production',
        kind: 'environment',
        environment: 'production',
        production: true,
      },
      {
        id: 'beta',
        workspaceId: 'personal',
        repositoryBindingId: 'symphony',
        displayName: 'Beta',
        kind: 'release-channel',
        environment: '',
        production: false,
      },
      {
        id: 'orphan',
        workspaceId: 'personal',
        repositoryBindingId: 'removed',
        displayName: 'Orphan',
        kind: 'installation',
        environment: '',
        production: false,
      },
    ];
    TestBed.configureTestingModule({
      providers: [{ provide: DELIVERY_SETTINGS_CONTEXT, useValue: { settings: signal(settings) } }],
    });

    // act
    const entries = TestBed.runInInjectionContext(() => deliveryTargetSearchEntries())();

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
        label: 'Production',
        description: 'Production · Environment',
        group: 'Symphony',
        value: 'production',
        parameters: { repository: 'symphony', target: 'production' },
      },
      {
        label: 'Beta',
        description: 'Release channel',
        group: 'Symphony',
        value: undefined,
        parameters: { repository: 'symphony', target: 'beta' },
      },
    ]);
  });
});
