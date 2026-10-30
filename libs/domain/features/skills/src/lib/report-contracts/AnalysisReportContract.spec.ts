// #region Imports

import { describe, expect, it } from 'vitest';
import { analysisReportContract } from './AnalysisReportContract';
import { analysisReportSections } from './AnalysisReportSections';
import { builtinSkill } from '../builtin-skills/builtinSkill';

// #endregion

describe('AnalysisReportContract', () => {
  it('requires an inline report with every declared section and traceable change paths', () => {
    // arrange
    // act
    const actual = analysisReportContract;

    // assert
    expect(actual).toContain('Report the complete result inline');
    expect(actual).toContain('Never write the report to a file');
    expect(actual).toContain('pointer to a file');
    for (const section of analysisReportSections) {
      expect(actual).toContain(`## ${section}`);
    }
    expect(analysisReportSections).toContain('Change surface');
    expect(actual).toContain('A step without a path is not a step');
    expect(actual).toContain('`Judgement:`');
    expect(actual).toContain('`Risk:`');
    expect(actual).toContain('and related files');
  });

  it('uses renderer-supported Markdown and ships with the analysis role', () => {
    // arrange
    // act
    const actual = builtinSkill('analyze');

    // assert
    expect(analysisReportContract).toContain('Never emit raw HTML');
    expect(analysisReportContract).toContain('at most `###`');
    expect(analysisReportContract).toContain('No emoji');
    expect(analysisReportSections).toContain('Acceptance criteria');
    expect(actual.instructions).toContain(analysisReportContract);
    expect(actual.promptVersion).toBeGreaterThan(1);
  });
});
