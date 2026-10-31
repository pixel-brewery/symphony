// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SettingsWindowSync } from './SettingsWindowSync';

// #endregion

function arrange() {
  const initial = applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp'));
  const settings = signal<ApplicationSettingsDto | undefined>(initial);
  const applySettings = vi.fn((next: ApplicationSettingsDto) => settings.set(next));
  TestBed.configureTestingModule({
    providers: [{ provide: ConfigurationStore, useValue: { settings, applySettings } }],
  });
  const peer = new BroadcastChannel('symphony.settings');
  const received: unknown[] = [];
  peer.onmessage = (event) => received.push(event.data);
  return { initial, settings, applySettings, peer, received };
}

describe('SettingsWindowSync', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('posts settings that change in this window to the other windows, but not the first load', async () => {
    // arrange
    const { initial, settings, peer, received } = arrange();
    TestBed.inject(SettingsWindowSync).connect();
    TestBed.tick();

    // act
    settings.set({ ...initial, user: { ...initial.user, arcadeEnabled: true } });
    TestBed.tick();

    // assert
    await vi.waitFor(() => expect(received).toHaveLength(1));
    expect(received[0]).toMatchObject({ settings: { user: { arcadeEnabled: true } } });
    peer.close();
  });

  it('applies settings another window posted without posting them back', async () => {
    // arrange
    const { initial, applySettings, peer, received } = arrange();
    TestBed.inject(SettingsWindowSync).connect();
    TestBed.tick();
    const changed = { ...initial, user: { ...initial.user, theme: 'dark' as const } };

    // act
    peer.postMessage({ settings: changed });
    await vi.waitFor(() => expect(applySettings).toHaveBeenCalledOnce());
    TestBed.tick();

    // assert
    expect(applySettings).toHaveBeenCalledWith(changed);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(received).toEqual([]);
    peer.close();
  });
});
