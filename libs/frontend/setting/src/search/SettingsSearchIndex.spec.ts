// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideViewSlot } from '@pixel-brewery/mosaik-elements-angular';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { SettingsViewSlot } from '../constants/SettingsViewSlot';
import { provideSettings } from '../provider/provideSettings';
import { withSettingsSearch } from '../provider/withSettingsSearch';
import { withSettingsViews } from '../provider/withSettingsViews';
import { SettingsSearchIndex } from './SettingsSearchIndex';

// #endregion

const arcadeCard = {
  id: 'arcade-card',
  search: [{ id: 'show-arcade', label: 'Show Arcade', group: 'Navigation' }],
};

function arrange() {
  const defaults = applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp'));
  const workspace = defaults.workspaces[0]!;
  const settings = signal({
    ...defaults,
    workspaces: [
      { ...workspace, id: 'flamox', displayName: 'FLAMOX365' },
      { ...workspace, id: 'personal', displayName: 'Personal' },
    ],
  });
  const pairedPhones = signal([{ id: 'ipad', label: 'Alex’s iPad' }]);
  TestBed.configureTestingModule({
    providers: [
      provideSettings(
        withSettingsViews({
          id: 'automation',
          slot: SettingsViewSlot.Global,
          views: [
            {
              id: 'automation-card',
              section: {
                scope: 'global',
                id: 'automation',
                label: 'Automation',
                description: 'Policies for every workspace.',
                order: 20,
              },
              search: [
                {
                  id: 'daily-budget',
                  label: 'Daily token budget',
                  group: 'Fix failed checks › Budgets',
                },
              ],
            },
          ],
        }),
        withSettingsViews({
          id: 'mobile',
          slot: SettingsViewSlot.Global,
          views: [
            {
              id: 'mobile-card',
              section: {
                scope: 'global',
                id: 'mobile',
                label: 'Mobile access',
                description: 'Pair phones.',
                order: 50,
              },
              searchEntries: () => {
                const phones = pairedPhones;
                return signal(
                  phones().map((phone) => ({ id: phone.id, label: phone.label, group: 'Paired' })),
                ).asReadonly();
              },
            },
          ],
        }),
        withSettingsViews({
          id: 'appearance',
          slot: SettingsViewSlot.Global,
          views: [
            {
              id: 'appearance-card',
              section: {
                scope: 'global',
                id: 'appearance',
                label: 'Appearance',
                description: 'Choose how Symphony looks.',
                order: 60,
              },
            },
          ],
        }),
        withSettingsViews({
          id: 'services',
          slot: SettingsViewSlot.Workspace,
          views: [
            {
              id: 'services-card',
              section: {
                scope: 'workspace',
                id: 'services',
                label: 'Connected services',
                description: 'Ticket sources.',
                order: 20,
              },
              search: [
                { id: 'token', label: 'Personal access token' },
                { id: 'only-personal', label: 'Personal intake', workspaceId: 'personal' },
              ],
            },
          ],
        }),
        withSettingsSearch({
          id: 'ai-accounts',
          sectionId: 'services',
          searchEntries: () =>
            signal([
              {
                id: 'codex',
                label: 'Work Codex',
                group: 'AI accounts',
                value: 'Signed in',
                workspaceId: 'personal',
                parameters: { account: 'codex' },
              },
            ]).asReadonly(),
        }),
      ),
      provideViewSlot(SettingsViewSlot.Appearance, [arcadeCard]),
      SettingsSearchIndex,
      { provide: ConfigurationStore, useValue: { settings } },
    ],
  });
  return { index: TestBed.inject(SettingsSearchIndex) };
}

describe('SettingsSearchIndex', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('indexes every section and its contributed settings with their breadcrumbs', () => {
    // arrange
    const { index } = arrange();

    // act
    const breadcrumbs = index.entries().map((entry) => entry.breadcrumb.join(' › '));

    // assert
    expect(breadcrumbs).toContain('Automation');
    expect(breadcrumbs).toContain('Automation › Fix failed checks › Budgets');
    expect(breadcrumbs).toContain('Mobile access › Paired');
    expect(breadcrumbs).toContain('FLAMOX365 › Connected services');
    expect(breadcrumbs).toContain('Personal › Connected services');
  });

  it('lists workspace settings once for every workspace unless they name their workspace', () => {
    // arrange
    const { index } = arrange();

    // act
    const tokens = index.search('access token').flatMap((group) => group.results);
    const intake = index.search('intake').flatMap((group) => group.results);

    // assert
    expect(tokens.map((entry) => entry.workspaceId)).toEqual(['flamox', 'personal']);
    expect(intake.map((entry) => entry.workspaceId)).toEqual(['personal']);
  });

  it('finds data-dependent entries and the sections themselves', () => {
    // arrange
    const { index } = arrange();

    // act
    const phones = index.search('ipad').flatMap((group) => group.results);
    const sections = index.search('pair phones').flatMap((group) => group.results);

    // assert
    expect(phones.map((entry) => entry.entry.label)).toEqual(['Alex’s iPad']);
    expect(sections.map((entry) => entry.section.id)).toEqual(['mobile']);
  });

  it('places the entries another feature contributes in the named section of their workspace', () => {
    // arrange
    const { index } = arrange();

    // act
    const results = index.search('signed in').flatMap((group) => group.results);

    // assert
    expect(results.map((result) => [result.workspaceId, result.breadcrumb.join(' › ')])).toEqual([
      ['personal', 'Personal › Connected services › AI accounts'],
    ]);
    expect(results[0]?.entry.parameters).toEqual({ account: 'codex' });
  });

  it('lists the settings of cards that features add to Appearance', () => {
    // arrange
    const { index } = arrange();

    // act
    const results = index.search('arcade').flatMap((group) => group.results);

    // assert
    expect(results.map((entry) => entry.breadcrumb.join(' › '))).toEqual([
      'Appearance › Navigation',
    ]);
  });
});
