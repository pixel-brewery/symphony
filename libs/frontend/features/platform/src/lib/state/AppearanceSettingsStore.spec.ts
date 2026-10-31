// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { IPlatformSettingsContext } from '../ports/IPlatformSettingsContext';
import { PLATFORM_SETTINGS_CONTEXT } from '../ports/PlatformSettingsContextToken';
import { AppearanceSettingsStore } from './AppearanceSettingsStore';

// #endregion

function arrange(saved: boolean) {
  const initial = applicationSettingsSchema.parse(
    createDefaultApplicationSettings('/tmp/symphony'),
  );
  const settings = signal<ApplicationSettingsDto | undefined>(initial);
  const saveSettings = vi
    .fn<IPlatformSettingsContext['saveSettings']>()
    .mockImplementation(async (next) => {
      if (saved) settings.set(next);
      return saved;
    });
  const context: IPlatformSettingsContext = {
    settings,
    saveSettings,
    refreshConfiguration: async () => undefined,
  };
  TestBed.configureTestingModule({
    providers: [AppearanceSettingsStore, { provide: PLATFORM_SETTINGS_CONTEXT, useValue: context }],
  });
  return { initial, settings, saveSettings, store: TestBed.inject(AppearanceSettingsStore) };
}

describe('AppearanceSettingsStore', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('saves a chosen theme at once', async () => {
    // arrange
    const { initial, saveSettings, store } = arrange(true);

    // act
    store.updateThemeCommand.execute({ detail: { newValue: { value: 'dark' } } });
    await vi.waitFor(() => expect(saveSettings).toHaveBeenCalledOnce());

    // assert
    expect(saveSettings).toHaveBeenCalledWith({
      ...initial,
      user: { ...initial.user, theme: 'dark' },
    });
    await vi.waitFor(() => expect(store.theme()).toBe('dark'));
  });

  it('restores the previous theme when saving fails', async () => {
    // arrange
    const { initial, saveSettings, store } = arrange(false);

    // act
    store.updateThemeCommand.execute('dark');
    await vi.waitFor(() => expect(saveSettings).toHaveBeenCalledOnce());

    // assert
    await vi.waitFor(() => expect(store.theme()).toBe(initial.user.theme));
  });

  it('follows authoritative theme changes from another window', () => {
    // arrange
    const { initial, settings, store } = arrange(true);

    // act
    settings.set({ ...initial, user: { ...initial.user, theme: 'light' } });

    // assert
    expect(store.theme()).toBe('light');
  });
});
