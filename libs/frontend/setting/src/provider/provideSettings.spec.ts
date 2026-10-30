// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideViewSlot, ViewSlotRegistry } from '@pixel-brewery/mosaik-elements-angular';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { SettingsCatalog } from '../catalog/SettingsCatalog';
import { withSettingsViews } from './withSettingsViews';
import { SettingsViewSlot } from '../constants/SettingsViewSlot';
import { provideSettings } from './provideSettings';

// #endregion

describe('provideSettings', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('provides an empty Settings host when no optional feature contributes a card', () => {
    // arrange
    TestBed.configureTestingModule({ providers: [provideSettings()] });

    // act
    const cards = TestBed.inject(ViewSlotRegistry).getViews(SettingsViewSlot.Appearance)();

    // assert
    expect(cards).toEqual([]);
  });

  it.each([true, false])(
    'retains feature contributions when the host is registered first: %s',
    (hostFirst) => {
      // arrange
      const host = provideSettings();
      const contribution = provideViewSlot(SettingsViewSlot.Appearance, [
        { id: 'optional-card', order: 20 },
      ]);
      TestBed.configureTestingModule({
        providers: hostFirst ? [host, contribution] : [contribution, host],
      });

      // act
      const cards = TestBed.inject(ViewSlotRegistry).getViews(SettingsViewSlot.Appearance)();

      // assert
      expect(cards.map((card) => card.id)).toEqual(['optional-card']);
    },
  );
  it('composes independently included cards through the native ordered registry and derives only their sections', () => {
    // arrange
    TestBed.configureTestingModule({
      providers: [
        provideSettings(
          withSettingsViews({
            id: 'second-feature',
            slot: SettingsViewSlot.Global,
            views: [
              {
                id: 'second-card',
                order: 20,
                section: {
                  scope: 'global',
                  id: 'system',
                  label: 'System',
                  description: 'Tools',
                  order: 40,
                },
              },
            ],
          }),
          withSettingsViews({
            id: 'first-feature',
            slot: SettingsViewSlot.Global,
            views: [
              {
                id: 'first-card',
                order: 10,
                section: {
                  scope: 'global',
                  id: 'system',
                  label: 'System',
                  description: 'Tools',
                  order: 40,
                },
              },
            ],
          }),
        ),
      ],
    });

    // act
    const registry = TestBed.inject(ViewSlotRegistry);
    const catalog = TestBed.inject(SettingsCatalog);
    const cards = registry.getViews(SettingsViewSlot.Global)();

    // assert
    expect(cards.map((card) => card.id)).toEqual(['first-card', 'second-card']);
    expect(catalog.globalSections().map((section) => section.id)).toEqual(['system']);
    expect(catalog.workspaceSections()).toEqual([]);
  });

  it('rejects colliding native view identities from separate included features before any card loads', () => {
    // arrange
    const section = {
      scope: 'global',
      id: 'system',
      label: 'System',
      description: 'Tools',
      order: 40,
    } as const;
    TestBed.configureTestingModule({
      providers: [
        provideSettings(
          withSettingsViews({
            id: 'first-feature',
            slot: SettingsViewSlot.Global,
            views: [{ id: 'same-card', section }],
          }),
          withSettingsViews({
            id: 'second-feature',
            slot: SettingsViewSlot.Global,
            views: [{ id: 'same-card', section }],
          }),
        ),
      ],
    });

    // act / assert
    expect(() => TestBed.inject(ViewSlotRegistry).getViews(SettingsViewSlot.Global)()).toThrow(
      "Duplicate settings view 'same-card'",
    );
  });
});
