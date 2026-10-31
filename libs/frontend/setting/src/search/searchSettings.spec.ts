// #region Imports

import { describe, expect, it } from 'vitest';
import type { ISettingsSearchResult } from './ISettingsSearchResult';
import { searchSettings } from './searchSettings';

// #endregion

const automation = {
  scope: 'global',
  id: 'automation',
  label: 'Automation',
  description: 'Policies',
  order: 20,
} as const;
const services = {
  scope: 'workspace',
  id: 'services',
  label: 'Connected services',
  description: 'Sources',
  order: 20,
} as const;

function result(
  key: string,
  label: string,
  breadcrumb: readonly string[],
  extra: Partial<ISettingsSearchResult['entry']> = {},
  workspaceId: string | null = null,
): ISettingsSearchResult {
  return {
    key,
    entry: { id: key, label, ...extra },
    section: workspaceId ? services : automation,
    workspaceId,
    breadcrumb,
  };
}

describe('searchSettings', () => {
  it('groups matching settings by breadcrumb and lists label matches first', () => {
    // arrange
    const index = [
      result('help', 'Retry limit', ['Automation', 'Execution'], {
        description: 'Stops after the token budget.',
      }),
      result('diagnosis', 'Diagnosis token budget', ['Automation', 'Fix failed checks › Budgets']),
      result('repair', 'Repair token budget', ['Automation', 'Fix failed checks › Budgets']),
      result(
        'pat',
        'Personal access token',
        ['FLAMOX365', 'Connected services', 'Support'],
        {},
        'flamox',
      ),
    ];

    // act
    const groups = searchSettings(index, 'TOKEN');

    // assert
    expect(groups.map((group) => group.breadcrumb.join(' › '))).toEqual([
      'Automation › Fix failed checks › Budgets',
      'FLAMOX365 › Connected services › Support',
      'Automation › Execution',
    ]);
    expect(groups[0]?.results.map((entry) => entry.key)).toEqual(['diagnosis', 'repair']);
  });

  it('requires every word of the query and searches keywords, values and the breadcrumb', () => {
    // arrange
    const index = [
      result('channel', 'Release channel', ['System', 'Updates'], { value: 'Canary' }),
      result('awake', 'Keep this Mac awake while tasks run', ['System', 'Sleep'], {
        keywords: ['caffeinate'],
      }),
    ];

    // act
    const byValue = searchSettings(index, 'canary');
    const byKeyword = searchSettings(index, 'caffeinate');
    const byBreadcrumb = searchSettings(index, 'sleep mac');
    const partial = searchSettings(index, 'sleep canary');

    // assert
    expect(byValue.flatMap((group) => group.results.map((entry) => entry.key))).toEqual([
      'channel',
    ]);
    expect(byKeyword.flatMap((group) => group.results.map((entry) => entry.key))).toEqual([
      'awake',
    ]);
    expect(byBreadcrumb.flatMap((group) => group.results.map((entry) => entry.key))).toEqual([
      'awake',
    ]);
    expect(partial).toEqual([]);
  });

  it('finds nothing for a blank query or a misspelling', () => {
    // arrange
    const index = [result('daily', 'Daily token budget', ['Automation'])];

    // act
    const blank = searchSettings(index, '   ');
    const misspelled = searchSettings(index, 'tokn');

    // assert
    expect(blank).toEqual([]);
    expect(misspelled).toEqual([]);
  });
});
