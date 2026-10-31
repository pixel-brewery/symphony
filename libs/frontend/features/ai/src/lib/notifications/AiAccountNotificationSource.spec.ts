// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import { DESKTOP_CLIENT } from '@symphony/frontend-core/desktop';
import type { ApplicationSettingsDto, ResponsePayload } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AiStore } from '../state/AiStore';
import { AiAccountNotificationSource } from './AiAccountNotificationSource';

// #endregion

type Connections = ResponsePayload<'connections.get'>;

function connections(authenticated: boolean, cliAvailable = true): Connections {
  return {
    azureDevOps: { accounts: [] },
    github: { cliAvailable: true, accounts: [] },
    codex: {
      cliAvailable,
      accounts: [{ id: 'personal-codex', displayName: 'Default Codex account', authenticated }],
    },
    claude: {
      cliAvailable: true,
      accounts: [{ id: 'personal-claude', displayName: 'Claude Code', authenticated: false }],
    },
  };
}

function arrange(status: Connections | undefined) {
  const defaults = applicationSettingsSchema.parse(createDefaultApplicationSettings('/ai'));
  const settings: ApplicationSettingsDto = {
    ...defaults,
    connections: [
      ...defaults.connections,
      {
        id: 'personal-claude',
        workspaceId: 'personal',
        kind: 'claude',
        displayName: 'Claude Code',
        credentialSource: 'isolated',
      },
    ],
  };
  const store = {
    settings: signal<ApplicationSettingsDto | undefined>(settings),
    connections: signal(status),
    refreshProviderConnections: vi.fn(async () => undefined),
  };
  const desktop = { request: vi.fn(async () => ({ completed: true })) };
  TestBed.configureTestingModule({
    providers: [
      AiAccountNotificationSource,
      { provide: AiStore, useValue: store },
      { provide: DESKTOP_CLIENT, useValue: desktop },
    ],
  });
  return { source: TestBed.inject(AiAccountNotificationSource), store, desktop };
}

describe('AiAccountNotificationSource', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('reports signed-out accounts with the agents that run on them', () => {
    // arrange
    const { source } = arrange(connections(false));
    // act
    const items = source.items();
    // assert
    expect(items).toEqual([
      {
        id: 'ai-account:personal-codex',
        severity: 'warning',
        title: 'Default Codex account is not signed in',
        location: ['Personal', 'Connected services'],
        detail: 'Default agent runs on this account',
        scope: { kind: 'workspace', workspaceId: 'personal', name: 'Personal' },
        actions: [{ id: 'sign-in', label: 'Sign in', emphasis: 'secondary' }],
      },
      expect.objectContaining({
        id: 'ai-account:personal-claude',
        title: 'Claude Code account is not signed in',
      }),
    ]);
    expect(items[1]).not.toHaveProperty('detail');
  });

  it('leaves signed-in accounts and accounts without their CLI to other places', () => {
    // arrange
    const signedIn = arrange(connections(true));
    const signedInItems = signedIn.source.items().map((item) => item.id);
    TestBed.resetTestingModule();
    const withoutCli = arrange(connections(false, false));
    // act
    const withoutCliItems = withoutCli.source.items().map((item) => item.id);
    // assert
    expect(signedInItems).toEqual(['ai-account:personal-claude']);
    expect(withoutCliItems).toEqual(['ai-account:personal-claude']);
  });

  it('shows nothing until the sign-in state is known', () => {
    // arrange
    const { source } = arrange(undefined);
    // act
    const items = source.items();
    // assert
    expect(items).toEqual([]);
  });

  it('opens Connected services of the account workspace and refreshes the sign-in state', async () => {
    // arrange
    const { source, desktop, store } = arrange(connections(false));
    // act
    await source.perform('ai-account:personal-codex', 'sign-in');
    await source.refresh();
    // assert
    expect(desktop.request).toHaveBeenCalledExactlyOnceWith('settings.open', {
      parameters: { workspace: 'personal', section: 'services' },
    });
    expect(store.refreshProviderConnections).toHaveBeenCalledOnce();
  });
});
