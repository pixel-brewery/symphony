// #region Imports

import { describe, expect, it } from 'vitest';
import { isSkillCatalogEditorRequest } from './isSkillCatalogEditorRequest';

// #endregion

describe('isSkillCatalogEditorRequest', () => {
  it('accepts the catalog with or without a known optional AI step', () => {
    // act
    const actual = [
      isSkillCatalogEditorRequest({ kind: 'skill-catalog' }),
      isSkillCatalogEditorRequest({ kind: 'skill-catalog', role: 'analysis' }),
      isSkillCatalogEditorRequest({ kind: 'skill-catalog', role: 'deploy' }),
    ];

    // assert
    expect(actual).toEqual([true, true, false]);
  });
});
