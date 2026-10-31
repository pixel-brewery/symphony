// #region Imports

import { describe, expect, it } from 'vitest';
import { ciResponseSchemas as responseSchemas } from './CiResponseSchemas';

// #endregion

describe('CiResponseSchemas', () => {
  it('rejects a machine state the renderer cannot render', () => {
    // arrange
    // act
    // assert
    expect(() =>
      responseSchemas['local-ci.instances.list'].parse({
        runtimeRoot: '/tmp/local-ci',
        instances: [
          {
            name: 'sci-0123456789abcdef',
            purpose: 'workflow-runner',
            status: 'paused',
            allocatedBytes: 0,
            keptWarm: false,
            busy: false,
          },
        ],
      }),
    ).toThrow();
  });
});
