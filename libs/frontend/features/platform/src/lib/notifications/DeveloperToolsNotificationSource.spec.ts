// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { MessageBoxService } from '@pixel-brewery/mosaik-elements-angular';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { DESKTOP_CLIENT } from '@symphony/frontend-core/desktop';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import type { RuntimeHealthDto } from '@symphony/ipc-contracts-platform';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { PLATFORM_CLIENT } from '../ports/PlatformClientToken';
import { PLATFORM_HEALTH_PROJECTION } from '../ports/PlatformHealthProjectionToken';
import { PlatformStore } from '../state/PlatformStore';
import { DeveloperToolsNotificationSource } from './DeveloperToolsNotificationSource';

// #endregion

function health(overrides: Partial<RuntimeHealthDto> = {}): RuntimeHealthDto {
  return {
    status: 'ready',
    utilityProcess: true,
    database: true,
    homebrew: { available: true },
    git: { available: true },
    githubCli: { available: true },
    agents: {
      codex: { available: false },
      claude: { available: false },
      opencode: { available: false },
    },
    ...overrides,
  };
}

function arrange(options: { health?: RuntimeHealthDto; settings?: ApplicationSettingsDto } = {}) {
  const settings =
    options.settings ?? applicationSettingsSchema.parse(createDefaultApplicationSettings('/tools'));
  const projectedHealth = signal<RuntimeHealthDto | undefined>(options.health);
  const projection = { runtimeHealth: projectedHealth, updateRuntimeHealth: vi.fn() };
  const store = {
    runtimeDependencyInstallBusy: signal<string | undefined>(undefined),
    installRuntimeDependency: vi.fn(async () => true),
  };
  const decisions: ((decision: { reason: string }) => void)[] = [];
  const closed = {
    subscribe: (decide: (decision: { reason: string }) => void) => decisions.push(decide),
    next: (decision: { reason: string }) => decisions.forEach((decide) => decide(decision)),
  };
  const messageBox = { show: vi.fn(() => ({ closed })) };
  const desktop = { request: vi.fn(async () => ({ completed: true })) };
  const client = { request: vi.fn(async () => health({ git: { available: false } })) };
  TestBed.configureTestingModule({
    providers: [
      DeveloperToolsNotificationSource,
      { provide: PlatformStore, useValue: store },
      { provide: PLATFORM_HEALTH_PROJECTION, useValue: projection },
      { provide: PLATFORM_CLIENT, useValue: client },
      { provide: ConfigurationStore, useValue: { settings: signal(settings) } },
      { provide: DESKTOP_CLIENT, useValue: desktop },
      { provide: MessageBoxService, useValue: messageBox },
    ],
  });
  return {
    source: TestBed.inject(DeveloperToolsNotificationSource),
    store,
    projection,
    projectedHealth,
    messageBox,
    closed,
    desktop,
    client,
  };
}

describe('DeveloperToolsNotificationSource', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('reports only the CLIs a connected account needs, naming the accounts that wait', () => {
    // arrange
    const { source } = arrange({ health: health() });
    // act
    const items = source.items();
    // assert
    expect(items).toEqual([
      {
        id: 'developer-tools:codex',
        severity: 'error',
        title: 'Codex CLI is not installed',
        location: ['System', 'Developer tools'],
        detail: 'the Default Codex account cannot run until it is',
        scope: { kind: 'mac' },
        actions: [
          {
            id: 'install',
            label: 'Install with Homebrew',
            emphasis: 'primary',
            busy: false,
            disabled: false,
          },
        ],
      },
    ]);
  });

  it('always requires Git and offers to open Developer tools without Homebrew', () => {
    // arrange
    const { source, desktop } = arrange({
      health: health({ homebrew: { available: false }, git: { available: false } }),
    });
    // act
    const items = source.items();
    void source.perform('developer-tools:git', 'open');
    // assert
    expect(items.map((item) => item.id)).toEqual(['developer-tools:git', 'developer-tools:codex']);
    expect(items[0]?.actions).toEqual([
      { id: 'open', label: 'Open Developer tools', emphasis: 'secondary' },
    ]);
    expect(desktop.request).toHaveBeenCalledWith('settings.open', {
      parameters: { section: 'system' },
    });
  });

  it('installs only after the same confirmation as Developer tools', async () => {
    // arrange
    const { source, messageBox, closed, store } = arrange({ health: health() });
    // act
    await source.perform('developer-tools:codex', 'install');
    closed.next({ reason: 'positive' });
    // assert
    expect(messageBox.show).toHaveBeenCalledWith(
      expect.objectContaining({
        header: 'Install Codex CLI?',
        intl: { yesLabel: 'Install with Homebrew', noLabel: 'Cancel' },
      }),
    );
    expect(store.installRuntimeDependency).toHaveBeenCalledExactlyOnceWith('codex');
  });

  it('keeps health it inspected itself in a window without an application snapshot', async () => {
    // arrange
    const { source, projection } = arrange();
    // act
    const before = source.items();
    await source.refresh();
    // assert
    expect(before).toEqual([]);
    expect(projection.updateRuntimeHealth).toHaveBeenCalledOnce();
    expect(source.items().map((item) => item.id)).toEqual([
      'developer-tools:git',
      'developer-tools:codex',
    ]);
  });

  it('shows the running installation on its item and holds the others', () => {
    // arrange
    const { source, store } = arrange({ health: health({ git: { available: false } }) });
    // act
    store.runtimeDependencyInstallBusy.set('git');
    // assert
    expect(source.items().map((item) => item.actions[0])).toEqual([
      expect.objectContaining({ busy: true, disabled: true }),
      expect.objectContaining({ busy: false, disabled: true }),
    ]);
  });
});
