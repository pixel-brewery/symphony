// @vitest-environment jsdom

// #region Imports

import type { SkillPackageCatalogDto } from '@symphony/ipc-contracts-skills';
import { describe, expect, it } from 'vitest';
import { projectSkillsPaletteResults } from './projectSkillsPaletteResults';

// #endregion

describe('projectSkillsPaletteResults', () => {
  it('opens a matching skill package in Settings', () => {
    // arrange
    const catalog: SkillPackageCatalogDto = {
      sharedRoot: '/test/skills',
      packages: [
        {
          id: 'release-audit',
          name: 'release-audit',
          displayName: 'Release Audit',
          description: 'Review changes',
          source: 'repository',
          location: '/test/repository/.agents/skills/release-audit',
          editable: true,
          implicitInvocation: false,
          updatedAt: '2026-10-01T09:00:00Z',
          digest: 'digest',
          resourceCount: 0,
          warnings: [],
        },
      ],
    };

    // act
    const results = projectSkillsPaletteResults(catalog, 'release');
    const opening = projectSkillsPaletteResults(catalog, '');
    const loading = projectSkillsPaletteResults(undefined, 'release');

    // assert
    expect(results).toEqual([
      {
        id: 'command:skill:release-audit',
        group: 'commands',
        icon: 'skills',
        title: 'Open Release Audit in Settings',
        facts: ['Skill', 'Review changes'],
        rank: expect.any(Number),
        action: { kind: 'navigate', path: '/main/settings', queryParams: { section: 'skills' } },
      },
    ]);
    expect(opening).toEqual([]);
    expect(loading).toEqual([]);
  });
});
