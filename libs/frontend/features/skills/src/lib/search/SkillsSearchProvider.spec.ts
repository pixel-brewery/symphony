// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import type { SkillPackageCatalogDto } from '@symphony/ipc-contracts-skills';
import { describe, expect, it } from 'vitest';
import { SkillsSearchProvider } from './SkillsSearchProvider';

// #endregion

describe('SkillsSearchProvider', () => {
  it.each(['release-audit', 'Release Audit', 'Review changes', 'repository'])(
    'keeps the existing package metadata field %s and opens its Settings section',
    (query) => {
      // arrange
      const skillCatalog = signal<SkillPackageCatalogDto | undefined>(undefined);
      const provider = new SkillsSearchProvider({ skillCatalog });
      const missing = provider.match(query, query.toLocaleLowerCase());
      skillCatalog.set({
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
      });

      // act
      const present = provider.match(query, query.toLocaleLowerCase());

      // assert
      expect(missing).toBeUndefined();
      expect(present).toEqual({ path: '/main/settings', queryParams: { section: 'skills' } });
    },
  );
});
