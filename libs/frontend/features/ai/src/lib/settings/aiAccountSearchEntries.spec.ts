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
import type { ApplicationSettingsDto, ResponsePayload } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { AiStore } from '../state/AiStore';
import { aiAccountSearchEntries } from './aiAccountSearchEntries';

// #endregion

describe('aiAccountSearchEntries', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('lists only AI accounts, each with its sign-in state and the key that opens its sheet', () => {
    // arrange
    const initial = applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp'));
    const settings: ApplicationSettingsDto = {
      ...initial,
      connections: [
        { id: 'codex', workspaceId: 'personal', kind: 'codex', displayName: 'Work Codex' },
        {
          id: 'github',
          workspaceId: 'personal',
          kind: 'github',
          displayName: 'GitHub',
          hostname: 'github.com',
          gitProtocol: 'https',
        },
      ] as ApplicationSettingsDto['connections'],
    };
    const connections = {
      codex: { cliAvailable: true, accounts: [{ id: 'codex', authenticated: true }] },
      claude: { cliAvailable: true, accounts: [] },
    } as unknown as ResponsePayload<'connections.get'>;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AiStore,
          useValue: { settings: signal(settings), connections: signal(connections) },
        },
      ],
    });

    // act
    const entries = TestBed.runInInjectionContext(() => aiAccountSearchEntries())();

    // assert
    expect(entries).toEqual([
      expect.objectContaining({
        label: 'Work Codex',
        description: 'Codex account',
        group: 'AI accounts',
        value: 'Signed in',
        workspaceId: 'personal',
        parameters: { account: 'codex' },
      }),
    ]);
  });
});
