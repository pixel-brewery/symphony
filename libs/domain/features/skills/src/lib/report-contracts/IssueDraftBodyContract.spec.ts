// #region Imports

import { describe, expect, it } from 'vitest';
import { builtinSkill } from '../builtin-skills/builtinSkill';
import { issueDraftBodyContract } from './IssueDraftBodyContract';
import { issueDraftBodySections } from './IssueDraftBodySections';

// #endregion

describe('IssueDraftBodyContract', () => {
  it('requires every declared section using renderer-supported Markdown', () => {
    // arrange
    // act
    const actual = issueDraftBodyContract;

    // assert
    for (const section of issueDraftBodySections) {
      expect(actual).toContain(`## ${section}`);
    }
    expect(actual).toContain('Never emit raw HTML');
    expect(actual).toContain('at most `###`');
    expect(actual).toContain('No emoji');
    expect(issueDraftBodySections).toContain('Acceptance criteria');
  });

  it('ships with the work-item creation role', () => {
    // arrange
    // act
    const actual = builtinSkill('create');

    // assert
    expect(actual.instructions).toContain(issueDraftBodyContract);
    expect(actual.promptVersion).toBeGreaterThan(1);
  });
});
