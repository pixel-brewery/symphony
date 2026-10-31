// #region Imports

import { describe, expect, it } from 'vitest';
import { builtinSkill } from '../builtin-skills/builtinSkill';
import { implementationReportContract } from './ImplementationReportContract';
import { implementationReportSections } from './ImplementationReportSections';

// #endregion

describe('ImplementationReportContract', () => {
  it('requires a complete inline implementation report with renderer-supported Markdown', () => {
    // arrange
    // act
    const actual = implementationReportContract;

    // assert
    expect(actual).toContain('Report the complete result inline');
    expect(actual).toContain('Never write the report to a file');
    expect(actual).toContain('pointer to a file');
    for (const section of implementationReportSections) {
      expect(actual).toContain(`## ${section}`);
    }
    expect(actual).toContain('Never emit raw HTML');
    expect(actual).toContain('at most `###`');
    expect(actual).toContain('No emoji');
    expect(implementationReportSections).toContain('Acceptance assessment');
  });

  it('ships with the solution role', () => {
    // arrange
    // act
    const actual = builtinSkill('solve');

    // assert
    expect(actual.instructions).toContain(implementationReportContract);
    expect(actual.promptVersion).toBeGreaterThan(1);
  });
});
