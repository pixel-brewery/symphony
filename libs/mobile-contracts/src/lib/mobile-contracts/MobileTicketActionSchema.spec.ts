// #region Imports

import { describe, expect, it } from 'vitest';
import { mobileTicketActionSchema } from '@symphony/mobile-contracts';

// #endregion

describe('MobileTicketActionSchema', () => {
  it('rejects an unknown runnable action kind', () => {
    // act
    const actual = mobileTicketActionSchema.safeParse({
      id: 'x',
      kind: 'delete-everything',
      label: 'Delete',
    });

    // assert
    expect(actual.success).toBe(false);
  });
});
