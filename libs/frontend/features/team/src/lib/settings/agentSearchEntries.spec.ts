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
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { agentSearchEntries } from './agentSearchEntries';

// #endregion

describe('agentSearchEntries', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('lists every agent with its job title and the key that opens its sheet', () => {
    // arrange
    const settings = applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp'));
    const agent = settings.agentProfiles[0]!;
    const position = settings.positions.find((item) => item.id === agent.positionId);
    settings.agentProfiles = [agent, { ...agent, id: 'off', displayName: 'Off', enabled: false }];
    TestBed.configureTestingModule({
      providers: [{ provide: ConfigurationStore, useValue: { settings: signal(settings) } }],
    });

    // act
    const entries = TestBed.runInInjectionContext(() => agentSearchEntries())();

    // assert
    expect(entries).toEqual([
      expect.objectContaining({
        label: agent.displayName,
        description: position?.displayName,
        group: 'Agents',
        workspaceId: agent.workspaceId,
        parameters: { agent: agent.id },
      }),
      expect.objectContaining({ label: 'Off', value: 'Disabled' }),
    ]);
    expect(entries[0]?.value).toBeUndefined();
  });
});
