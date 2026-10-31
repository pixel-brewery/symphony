// #region Imports

import { describe, expect, it } from 'vitest';
import { operatorErrorMessage } from './operatorErrorMessage';

// #endregion

describe('operatorErrorMessage', () => {
  it('attributes a provider failure to the provider instead of the command that ran', () => {
    // act
    const actual = operatorErrorMessage(new Error('gh: Not Found (HTTP 404)'));

    // assert
    expect(actual).toBe('GitHub answered: Not Found (HTTP 404)');
  });

  it('leaves a message that already speaks to the operator untouched', () => {
    // arrange
    const message = 'Activate an analysis skill in Skills before starting an analysis.';
    // act
    const actual = operatorErrorMessage(new Error(message));

    // assert
    expect(actual).toBe(message);
    // Only a bare command name is a prefix; a command line is part of the evidence.
    expect(operatorErrorMessage(new Error('yarn lint: nx run-many failed.'))).toBe(
      'yarn lint: nx run-many failed.',
    );
  });

  it('restates a validator rejection that reached the renderer as raw evidence', () => {
    // arrange
    const rawIssues = JSON.stringify([
      {
        origin: 'array',
        code: 'too_small',
        minimum: 2,
        inclusive: true,
        path: ['executions', 0, 'workItemClaims'],
        message: 'Too small: expected array to have >=2 items',
      },
    ]);

    // act
    const actual = operatorErrorMessage(new Error(rawIssues));

    // assert
    expect(actual).toBe(
      'The data does not match the IPC contract: ' +
        'executions[0].workItemClaims needs at least 2 entries.',
    );
    // A message that merely opens like a list is evidence, not a rejected contract.
    expect(operatorErrorMessage(new Error('[warn] the branch was already merged.'))).toBe(
      '[warn] the branch was already merged.',
    );
  });

  it('reports nothing when the failure carries no message of its own', () => {
    // act
    const actual = operatorErrorMessage(new Error('   '));

    // assert
    expect(actual).toBe('');
    expect(operatorErrorMessage(undefined)).toBe('');
  });
});
