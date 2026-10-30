// #region Imports

import { describe, expect, it } from 'vitest';
import {
  defaultPersistedMobileAccess,
  persistedMobileAccessSchema,
} from '@symphony/mobile-contracts';

// #endregion

describe('PersistedMobileAccessSchema', () => {
  it('keeps mobile access disabled by default', () => {
    // act
    const actual = persistedMobileAccessSchema.parse(defaultPersistedMobileAccess);

    // assert
    expect(actual).toEqual({ version: 1, enabled: false, devices: [] });
  });
});
