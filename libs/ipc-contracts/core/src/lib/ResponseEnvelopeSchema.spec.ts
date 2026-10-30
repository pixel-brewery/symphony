// #region Imports
import { describe, expect, it } from 'vitest';
import { responseEnvelopeSchema } from './ResponseEnvelopeSchema';
// #endregion

describe('ResponseEnvelopeSchema', () => {
  it('keeps opaque response correlation and complete typed errors unchanged', () => {
    // arrange
    const correlationId = 'opaque-operation-1';
    const error = { code: 'invalid-request', message: 'Choose a valid repository.' };
    // act
    const response = responseEnvelopeSchema.parse({ correlationId, ok: false, error });
    // assert
    expect(response).toEqual({ correlationId, ok: false, error });
    expect(() =>
      responseEnvelopeSchema.parse({
        correlationId,
        ok: false,
        error: { code: 'invalid-request' },
      }),
    ).toThrow();
  });
});
