// #region Imports

import { describe, expect, it } from 'vitest';
import { workspaceSchema } from './WorkspaceSchema';

// #endregion

describe('workspaceSchema', () => {
  const workspace = {
    id: 'legacy-workspace',
    displayName: 'Legacy workspace',
    shortCode: 'EIGHT123',
    color: '#4f6bed',
    enabled: true,
    isolation: 'strict',
  };

  it('keeps legacy short codes and an absent avatar without inventing a selection', () => {
    // arrange
    const input = { ...workspace };
    // act
    const result = workspaceSchema.parse(input);
    // assert
    expect(result).toMatchObject(input);
    expect(result).not.toHaveProperty('avatar');
  });

  it('carries normalized glyphs while retaining the existing color and short code', () => {
    // arrange
    const input = { ...workspace, avatar: { kind: 'monogram', value: ' fx ' } };
    // act
    const result = workspaceSchema.parse(input);
    // assert
    expect(result).toMatchObject({
      ...workspace,
      avatar: { kind: 'monogram', value: 'FX' },
    });
  });

  it('rejects an invalid avatar through the complete workspace contract', () => {
    // arrange
    const input = { ...workspace, avatar: { kind: 'emoji', value: '🚀🔥' } };
    // act
    const result = workspaceSchema.safeParse(input);
    // assert
    expect(result.success).toBe(false);
  });
});
