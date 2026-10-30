// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ThemeService } from '@pixel-brewery/mosaik-elements-angular';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { IPlatformSettingsContext } from '../ports/IPlatformSettingsContext';
import { PLATFORM_SETTINGS_CONTEXT } from '../ports/PlatformSettingsContextToken';
import { DesktopThemeStore } from './DesktopThemeStore';

// #endregion

describe('DesktopThemeStore', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });
  afterAll(() => TestBed.resetTestEnvironment());

  it('follows saved system appearance and releases its browser listener when preference or lifecycle changes', () => {
    // arrange
    let dark = false;
    const listeners = new Set<() => void>();
    const media = {
      get matches() {
        return dark;
      },
      addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
    };
    vi.stubGlobal('matchMedia', () => media);
    const initial = applicationSettingsSchema.parse(
      createDefaultApplicationSettings('/tmp/symphony'),
    );
    const settings = signal<ApplicationSettingsDto | undefined>({
      ...initial,
      user: { ...initial.user, theme: 'system' },
    });
    const context: IPlatformSettingsContext = {
      settings,
      saveSettings: async () => true,
      refreshConfiguration: async () => undefined,
    };
    const applyTheme = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        DesktopThemeStore,
        { provide: PLATFORM_SETTINGS_CONTEXT, useValue: context },
        { provide: ThemeService, useValue: { applyTheme } },
      ],
    });
    TestBed.inject(DesktopThemeStore);
    TestBed.tick();

    // act
    dark = true;
    for (const listener of listeners) listener();

    // assert
    expect(applyTheme).toHaveBeenLastCalledWith('dark');
    expect(listeners.size).toBe(1);
    settings.set({ ...initial, user: { ...initial.user, theme: 'light' } });
    TestBed.tick();
    expect(applyTheme).toHaveBeenLastCalledWith('light');
    expect(listeners.size).toBe(0);
    settings.set({ ...initial, user: { ...initial.user, theme: 'system' } });
    TestBed.tick();
    expect(listeners.size).toBe(1);
    TestBed.resetTestingModule();
    expect(listeners.size).toBe(0);
  });
});
