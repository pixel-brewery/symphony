// #region Imports

import { describe, expect, it } from 'vitest';
import { parseAnalysisArtifact } from './parseAnalysisArtifact';

// #endregion

function report(definitionOfReady: string): string {
  return [
    '## Problem and evidence',
    '',
    'The renderer drops drafts on restart.',
    '',
    '## Acceptance criteria',
    '',
    '- Drafts survive a restart',
    '',
    '## Definition of ready',
    '',
    '```json',
    definitionOfReady,
    '```',
  ].join('\n');
}

const completeBlock = JSON.stringify({
  feasible: true,
  ready_for_solve: true,
  unresolved_questions: [],
  test_strategy: ['unit', 'integration'],
  acceptance_mapping: [
    { criterion: 'Drafts survive a restart', implementation_step: 2, verification: 'unit test' },
  ],
  risk: { class: 'low', reasons: [] },
  dependencies: [{ work_item_id: '#200', type: 'hard' }],
  affected_components: ['renderer'],
});

describe('parseAnalysisArtifact', () => {
  it('parses a complete Definition of Ready and binds it to the supplied issue revision', () => {
    // act
    // arrange
    const artifact = parseAnalysisArtifact(report(completeBlock), '7');

    // assert
    expect(artifact).toMatchObject({
      feasible: true,
      readyForSolve: true,
      issueRevision: '7',
      testStrategy: ['unit', 'integration'],
      unresolvedQuestions: [],
      collisionRisk: 'low',
    });
    expect(artifact?.acceptanceMapping).toEqual([
      {
        acceptanceCriterion: 'Drafts survive a restart',
        implementationStep: 2,
        verification: 'unit test',
      },
    ]);
    expect(artifact?.dependencies).toEqual([{ workItemId: '#200', type: 'hard' }]);
  });

  it('returns nothing for a report without the section, without a block, or with broken JSON', () => {
    // arrange
    // act
    const actual = parseAnalysisArtifact('## Problem and evidence\n\nProse only.', '7');

    // assert
    expect(actual).toBeUndefined();
    expect(
      parseAnalysisArtifact('## Definition of ready\n\nNo fenced block.', '7'),
    ).toBeUndefined();
    expect(parseAnalysisArtifact(report('{ not json'), '7')).toBeUndefined();
  });

  it('returns nothing when a guard-relevant field is missing or mistyped', () => {
    // arrange
    const withoutFeasible = JSON.parse(completeBlock) as Record<string, unknown>;
    // act
    delete withoutFeasible['feasible'];
    // assert
    expect(parseAnalysisArtifact(report(JSON.stringify(withoutFeasible)), '7')).toBeUndefined();

    const stringStrategy = { ...(JSON.parse(completeBlock) as object), test_strategy: 'unit' };
    expect(parseAnalysisArtifact(report(JSON.stringify(stringStrategy)), '7')).toBeUndefined();

    const invalidRisk = {
      ...(JSON.parse(completeBlock) as object),
      risk: { class: 'unknown', reasons: [] },
    };
    expect(parseAnalysisArtifact(report(JSON.stringify(invalidRisk)), '7')).toBeUndefined();

    const brokenMapping = {
      ...(JSON.parse(completeBlock) as object),
      acceptance_mapping: [{ criterion: 'x' }],
    };
    expect(parseAnalysisArtifact(report(JSON.stringify(brokenMapping)), '7')).toBeUndefined();
  });

  it('keeps declared open questions so the guard can refuse the transition', () => {
    // arrange
    const withQuestion = {
      ...(JSON.parse(completeBlock) as object),
      ready_for_solve: false,
      unresolved_questions: ['Which retention period applies?'],
    };
    // act
    const artifact = parseAnalysisArtifact(report(JSON.stringify(withQuestion)), '7');
    // assert
    expect(artifact?.readyForSolve).toBe(false);
    expect(artifact?.unresolvedQuestions).toEqual(['Which retention period applies?']);
  });
});
