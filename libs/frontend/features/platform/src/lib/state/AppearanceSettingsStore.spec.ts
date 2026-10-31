// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import { SettingsHostSession } from '@symphony/frontend-setting';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { IPlatformSettingsContext } from '../ports/IPlatformSettingsContext';
import { PLATFORM_SETTINGS_CONTEXT } from '../ports/PlatformSettingsContextToken';
import { AppearanceSettingsStore } from './AppearanceSettingsStore';

// #endregion

describe('AppearanceSettingsStore', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('retains a failed appearance draft within the route and resets it for a new Settings route', () => {
    // arrange
    const initial = applicationSettingsSchema.parse(
      createDefaultApplicationSettings('/tmp/symphony'),
    );
    const settings = signal<ApplicationSettingsDto | undefined>(initial);
    const saveSettings = vi.fn<IPlatformSettingsContext['saveSettings']>().mockResolvedValue(false);
    const context: IPlatformSettingsContext = {
      settings,
      saveSettings,
      refreshConfiguration: async () => undefined,
    };
    TestBed.configureTestingModule({
      providers: [
        AppearanceSettingsStore,
        { provide: PLATFORM_SETTINGS_CONTEXT, useValue: context },
      ],
    });
    const session = new SettingsHostSession();
    const store = TestBed.inject(AppearanceSettingsStore);
    store.beginSession(session);
    TestBed.tick();
    store.updateThemeCommand.execute({ detail: { newValue: { value: 'dark' } } });

    // act
    store.saveThemeCommand.execute();
    store.beginSession(session);
    TestBed.tick();

    // assert
    expect(store.theme()).toBe('dark');
    expect(saveSettings).toHaveBeenCalledExactlyOnceWith({
      ...initial,
      user: { ...initial.user, theme: 'dark' },
    });
    expect(settings()).toBe(initial);
    store.beginSession(new SettingsHostSession());
    expect(store.theme()).toBe(initial.user.theme);
  });

  it('reconciles authoritative appearance changes into the same draft signal', () => {
    // arrange
    const initial = applicationSettingsSchema.parse(
      createDefaultApplicationSettings('/tmp/symphony'),
    );
    const settings = signal<ApplicationSettingsDto | undefined>(initial);
    const context: IPlatformSettingsContext = {
      settings,
      saveSettings: async () => true,
      refreshConfiguration: async () => undefined,
    };
    TestBed.configureTestingModule({
      providers: [
        AppearanceSettingsStore,
        { provide: PLATFORM_SETTINGS_CONTEXT, useValue: context },
      ],
    });
    const store = TestBed.inject(AppearanceSettingsStore);
    store.beginSession(new SettingsHostSession());
    TestBed.tick();
    const theme = store.theme;
    store.updateThemeCommand.execute('dark');

    // act
    settings.set({ ...initial, user: { ...initial.user, theme: 'light' } });
    TestBed.tick();

    // assert
    expect(store.theme).toBe(theme);
    expect(store.theme()).toBe('light');
  });
});
