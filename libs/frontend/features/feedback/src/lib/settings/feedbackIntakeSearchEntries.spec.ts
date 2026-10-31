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
import { FEEDBACK_SETTINGS_CONTEXT } from '../ports/FeedbackSettingsContextToken';
import { feedbackIntakeSearchEntries } from './feedbackIntakeSearchEntries';

// #endregion

describe('feedbackIntakeSearchEntries', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('lists every intake with whether it creates work items and the key that opens its sheet', () => {
    // arrange
    const initial = applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp'));
    const settings: ApplicationSettingsDto = {
      ...initial,
      feedbackIntakeSources: [
        {
          id: 'teams',
          workspaceId: 'personal',
          displayName: 'FLAMOX365 feedback',
          provider: 'microsoft-teams',
          tenantId: 'tenant',
          clientId: 'client',
          credentialRef: 'env:SECRET',
          teamId: 'team',
          channelId: 'channel',
          targetWorkItemSourceId: 'board',
          targetRepositoryBindingId: 'repository',
          enabled: true,
        },
      ],
    };
    TestBed.configureTestingModule({
      providers: [{ provide: FEEDBACK_SETTINGS_CONTEXT, useValue: { settings: signal(settings) } }],
    });

    // act
    const entries = TestBed.runInInjectionContext(() => feedbackIntakeSearchEntries())();

    // assert
    expect(entries).toEqual([
      expect.objectContaining({
        label: 'FLAMOX365 feedback',
        group: 'Feedback intake',
        value: 'Enabled',
        workspaceId: 'personal',
        parameters: { intake: 'teams' },
      }),
    ]);
  });
});
