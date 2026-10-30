// #region Imports

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { core } from 'zod';
import { contractViolationMessage } from './contractViolationMessage';

// #endregion

/** The contract shape whose rejection used to reach the operator as a raw issue array. */
const executionState = z.object({
  executions: z.array(
    z.object({
      id: z.string().min(1),
      workItemClaims: z
        .array(z.object({ id: z.string().min(1) }))
        .min(2)
        .optional(),
    }),
  ),
});

/** Real validator output, so the wording is asserted against the issues zod actually produces. */
function rejectionIssues(value: unknown): readonly core.$ZodIssue[] {
  const result = executionState.safeParse(value);
  if (result.success) throw new Error('The fixture was expected to be rejected.');
  return result.error.issues;
}

describe('contractViolationMessage', () => {
  it('names the rejected field and the rule it broke', () => {
    // arrange
    const issues = rejectionIssues({
      executions: [{ id: 'execution-1', workItemClaims: [{ id: 'claim-1' }] }],
    });

    // act
    const actual = contractViolationMessage(issues, 'The answer to "execution-state.get"');

    // assert
    expect(actual).toBe(
      'The answer to "execution-state.get" does not match the IPC contract: ' +
        'executions[0].workItemClaims needs at least 2 entries.',
    );
  });

  it('reports an absent field as missing rather than as a type mismatch', () => {
    // arrange
    const issues = rejectionIssues({ executions: [{}] });

    // act
    const actual = contractViolationMessage(issues);

    // assert
    expect(actual).toBe('The data does not match the IPC contract: executions[0].id is missing.');
  });

  it('keeps a wall of issues down to what a person will still read', () => {
    // arrange
    const issues = rejectionIssues({ executions: [{}, {}, {}, {}, {}] });

    // act
    const actual = contractViolationMessage(issues);

    // assert
    expect(actual).toBe(
      'The data does not match the IPC contract: executions[0].id is missing; ' +
        'executions[1].id is missing; executions[2].id is missing (and 2 more).',
    );
  });

  it('names the payload itself when the whole message has the wrong shape', () => {
    // arrange
    const issues = rejectionIssues(null);

    // act
    const actual = contractViolationMessage(issues, 'The "snapshot.get" request');

    // assert
    expect(actual).toBe(
      'The "snapshot.get" request does not match the IPC contract: the payload must be an object.',
    );
  });
});
