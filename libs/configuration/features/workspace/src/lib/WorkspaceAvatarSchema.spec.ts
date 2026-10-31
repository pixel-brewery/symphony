// #region Imports

import { describe, expect, it } from 'vitest';
import { workspaceAvatarSchema } from './WorkspaceAvatarSchema';

// #endregion

describe('workspaceAvatarSchema', () => {
  it.each(['compass-northwest', 'lock-close', 'folderOpen', 'custom_icon', 'x'.repeat(80)])(
    'accepts a bounded registry icon identifier %s',
    (value) => {
      // arrange
      const input = { kind: 'icon', value };
      // act
      const result = workspaceAvatarSchema.parse(input);
      // assert
      expect(result).toEqual(input);
    },
  );

  it.each(['', 'x'.repeat(81), '../folder', 'https://example.com/icon.svg', 'a:b', 'a b', '1'])(
    'rejects an invalid icon identifier %s',
    (value) => {
      // arrange
      const input = { kind: 'icon', value };
      // act
      const result = workspaceAvatarSchema.safeParse(input);
      // assert
      expect(result.success).toBe(false);
    },
  );

  it.each(['🚀', '🛠️', '👩🏽‍💻', '🇩🇪', '1️⃣', '🏳️‍🌈'])(
    'accepts exactly one emoji sequence %s',
    (value) => {
      // arrange
      const input = { kind: 'emoji', value: ` ${value} ` };
      // act
      const result = workspaceAvatarSchema.parse(input);
      // assert
      expect(result).toEqual({ kind: 'emoji', value });
    },
  );

  it.each(['', 'word', '🚀🔥', 'a🚀', '1', '🇩', `🚀${'\uFE0F'.repeat(31)}`])(
    'rejects non-emoji, multiple glyphs or oversized sequences %s',
    (value) => {
      // arrange
      const input = { kind: 'emoji', value };
      // act
      const result = workspaceAvatarSchema.safeParse(input);
      // assert
      expect(result.success).toBe(false);
    },
  );

  it.each([
    [' FX ', 'FX'],
    ['a', 'A'],
    ['a1', 'A1'],
    ['äÖ', 'ÄÖ'],
    ['я9', 'Я9'],
    ['ß', 'SS'],
    ['𐐨', '𐐀'],
  ])('normalizes the monogram %s to %s', (input, expected) => {
    // arrange
    const selection = { kind: 'monogram', value: input };
    // act
    const result = workspaceAvatarSchema.parse(selection);
    // assert
    expect(result).toEqual({ kind: 'monogram', value: expected });
  });

  it.each(['', 'ABC', 'A B', '🚀', '<', 'ßX'])(
    'rejects invalid or oversized uppercase monograms %s',
    (value) => {
      // arrange
      const input = { kind: 'monogram', value };
      // act
      const result = workspaceAvatarSchema.safeParse(input);
      // assert
      expect(result.success).toBe(false);
    },
  );

  it.each([
    { kind: 'url', value: 'https://example.com/avatar.png' },
    { kind: 'icon', value: 'folder', color: '#123456' },
    { kind: 'emoji', value: '🚀', icon: 'folder' },
    { kind: 'monogram', value: 'FX', extra: true },
    { kind: 'icon' },
    { value: 'FX' },
    null,
  ])('rejects malformed selections and extra branch fields: %o', (input) => {
    // arrange
    const selection: unknown = input;
    // act
    const result = workspaceAvatarSchema.safeParse(selection);
    // assert
    expect(result.success).toBe(false);
  });
});
