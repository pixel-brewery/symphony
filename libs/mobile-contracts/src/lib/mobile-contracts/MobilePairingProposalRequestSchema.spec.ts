// #region Imports

import { describe, expect, it } from 'vitest';
import { mobilePairingProposalRequestSchema } from '@symphony/mobile-contracts';

// #endregion

describe('MobilePairingProposalRequestSchema', () => {
  it('rejects short pairing challenges', () => {
    // act
    const actual = mobilePairingProposalRequestSchema.safeParse({
      challenge: 'short',
      deviceName: 'Phone',
    });

    // assert
    expect(actual.success).toBe(false);
  });
});
