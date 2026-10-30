// #region Imports

import { describe, expect, it } from 'vitest';
import { ciRequestSchemas as requestSchemas } from './CiRequestSchemas';
import { ciResponseSchemas as responseSchemas } from './CiResponseSchemas';

// #endregion

describe('CiRequestSchemas', () => {
  it('requires a machine name for removal and answers with the remaining machines', () => {
    // arrange
    // act
    // assert
    expect(() => requestSchemas['local-ci.instances.remove'].parse({ name: '' })).toThrow();
    expect(requestSchemas['local-ci.instances.remove'].parse({ name: 'sci-01' })).toEqual({
      name: 'sci-01',
    });
    expect(
      responseSchemas['local-ci.instances.remove'].parse({ removed: true, instances: [] }),
    ).toEqual({ removed: true, instances: [] });
  });
});
