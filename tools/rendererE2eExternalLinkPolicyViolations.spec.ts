// #region Imports

import { describe, expect, it } from 'vitest';
import { rendererE2eExternalLinkPolicyViolations } from './rendererE2eExternalLinkPolicyViolations';

// #endregion

describe('rendererE2eExternalLinkPolicyViolations', () => {
  it('finds no renderer E2E launch that can reach the operating-system browser', () => {
    // act
    const violations = rendererE2eExternalLinkPolicyViolations();

    // assert
    expect(violations).toEqual([]);
  });
});
