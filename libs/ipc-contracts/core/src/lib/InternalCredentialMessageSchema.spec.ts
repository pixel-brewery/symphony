// #region Imports

import { describe, expect, it } from 'vitest';
import { internalCredentialMessageSchema } from './InternalCredentialMessageSchema';

// #endregion

describe('InternalCredentialMessageSchema', () => {
  it('accepts secret-free availability and correlated resolution messages', () => {
    // arrange
    const requestId = '9fc19e56-79a3-4c38-8d70-57a4a994c6ee';
    const reference = 'vault:azure-devops:ado-serviceware';

    // act
    const availability = internalCredentialMessageSchema.safeParse({
      type: 'credentials.available',
      references: [reference],
    });
    const request = internalCredentialMessageSchema.safeParse({
      type: 'credentials.resolve.request',
      requestId,
      reference,
    });
    const response = internalCredentialMessageSchema.safeParse({
      type: 'credentials.resolve.response',
      requestId,
      reference,
      result: { status: 'resolved', secret: 'secret-pat' },
    });

    // assert
    expect(availability.success).toBe(true);
    expect(request.success).toBe(true);
    expect(response.success).toBe(true);
  });

  it('rejects malformed references and uncorrelated response shapes', () => {
    // arrange
    const invalidMessages = [
      { type: 'credentials.available', references: ['env:ADO_PAT'] },
      {
        type: 'credentials.resolve.request',
        requestId: 'not-a-uuid',
        reference: 'vault:azure-devops:ado-serviceware',
      },
      {
        type: 'credentials.resolve.response',
        requestId: '9fc19e56-79a3-4c38-8d70-57a4a994c6ee',
        reference: 'vault:azure-devops:ado-serviceware',
        result: { status: 'resolved' },
      },
    ];

    // act
    const results = invalidMessages.map((message) =>
      internalCredentialMessageSchema.safeParse(message),
    );

    // assert
    expect(results.every((result) => !result.success)).toBe(true);
  });
});
