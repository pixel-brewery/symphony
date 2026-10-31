// #region Imports

import { describe, expect, it } from 'vitest';
import { isSkillEditorRequest } from './isSkillEditorRequest';

// #endregion

describe('isSkillEditorRequest', () => {
  it('accepts a new skill and an installed skill with its id only', () => {
    // act
    const actual = [
      isSkillEditorRequest({ kind: 'skill-editor', mode: 'create' }),
      isSkillEditorRequest({ kind: 'skill-editor', mode: 'edit', skillId: 'user:review' }),
      isSkillEditorRequest({ kind: 'skill-editor', mode: 'edit' }),
      isSkillEditorRequest({ kind: 'skill-import' }),
    ];

    // assert
    expect(actual).toEqual([true, true, false, false]);
  });
});
