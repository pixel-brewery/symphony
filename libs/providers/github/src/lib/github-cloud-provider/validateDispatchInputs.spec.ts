// #region Imports

import { describe, expect, it } from 'vitest';
import { validateDispatchInputs } from './validateDispatchInputs';

// #endregion

describe('validateDispatchInputs', () => {
  it('rejects missing required versions and undeclared inputs before POST', () => {
    // arrange
    const inputs = [
      { id: 'version', description: 'Exact version', type: 'string' as const, required: true },
    ];
    // act
    const missing = () => validateDispatchInputs(inputs, {});
    const unknown = () => validateDispatchInputs(inputs, { version: 'sha', other: 'value' });
    // assert
    expect(missing).toThrow();
    expect(unknown).toThrow();
    expect(() => validateDispatchInputs(inputs, { version: 'sha' })).not.toThrow();
  });
  it('validates booleans, numeric and choice values', () => {
    // arrange
    const inputs = [
      { id: 'enabled', description: '', type: 'boolean' as const, required: false },
      { id: 'size', description: '', type: 'number' as const, required: false },
      {
        id: 'target',
        description: '',
        type: 'choice' as const,
        required: false,
        options: ['staging', 'production'],
      },
    ];
    // act
    const invalid = () => validateDispatchInputs(inputs, { enabled: 'yes' });
    // assert
    expect(invalid).toThrow();
    expect(() => validateDispatchInputs(inputs, { size: 'NaN' })).toThrow();
    expect(() => validateDispatchInputs(inputs, { target: 'unknown' })).toThrow();
    expect(() =>
      validateDispatchInputs(inputs, { enabled: 'false', size: '2', target: 'staging' }),
    ).not.toThrow();
  });
});
