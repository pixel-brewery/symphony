// #region Imports

import { describe, expect, it } from 'vitest';
import { executionRecordSchema } from './ExecutionRecordSchema';
import type { IExecutionRecord } from '@symphony/domain-execution';

// #endregion

describe('ExecutionRecordSchema', () => {
  it('carries every automation origin the domain model can produce', () => {
    // The contract enum is a hand-maintained duplicate of the domain union;
    // this record fails typecheck when the domain gains an origin the map lacks.
    // arrange
    const everyDomainOrigin: Record<NonNullable<IExecutionRecord['automationOrigin']>, true> = {
      remote: true,
      autonomy: true,
      'agentic-delivery': true,
      workflow: true,
    };

    const contractOrigins = executionRecordSchema.shape.automationOrigin.unwrap().options;
    // act
    const actual = [...contractOrigins].sort();

    // assert
    expect(actual).toEqual(Object.keys(everyDomainOrigin).sort());
  });
});
