// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { SettingsViewSlot } from '../constants/SettingsViewSlot';
import { provideSettings } from '../provider/provideSettings';
import { withSettingsViews } from '../provider/withSettingsViews';
import { SettingsCatalog } from './SettingsCatalog';

// #endregion

describe('SettingsCatalog', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('rejects conflicting metadata instead of silently assigning a section to one feature', () => {
    // arrange
    TestBed.configureTestingModule({
      providers: [
        provideSettings(
          withSettingsViews({
            id: 'included',
            slot: SettingsViewSlot.Global,
            views: [
              {
                id: 'first',
                section: {
                  scope: 'global',
                  id: 'system',
                  label: 'System',
                  description: 'Tools',
                  order: 40,
                },
              },
              {
                id: 'second',
                section: {
                  scope: 'global',
                  id: 'system',
                  label: 'Different',
                  description: 'Tools',
                  order: 40,
                },
              },
            ],
          }),
        ),
      ],
    });
    const catalog = TestBed.inject(SettingsCatalog);

    // act / assert
    expect(() => catalog.globalSections()).toThrow(
      "Conflicting settings section metadata 'system'",
    );
  });

  it('keeps an omitted product empty without inventing section metadata', () => {
    // arrange
    TestBed.configureTestingModule({ providers: [provideSettings()] });

    // act
    const catalog = TestBed.inject(SettingsCatalog);

    // assert
    expect(catalog.globalSections()).toEqual([]);
    expect(catalog.workspaceSections()).toEqual([]);
  });
});
