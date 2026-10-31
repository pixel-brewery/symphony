// #region Imports

import { describe, expect, it } from 'vitest';
import {
  analysisRevisionOf,
  builtinSkill,
  builtinSkillPackage,
  composeSkillInstructions,
} from '@symphony/domain-skills';
import { sha256SkillText } from './sha256SkillText';

// #endregion

const vectors = [
  {
    text: '',
    digest: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  },
  {
    text: 'A complete analysis artifact',
    digest: '9b50f16b8fc4fb75b13c8c43ea395cd4f60712deb7f3cdbd6fd7512b0ef87f6e',
  },
  {
    text: 'A complete analysis artifact changed',
    digest: '2988dd94d21381eca9c163ca9b673d072ea4dd0bd4ab8d43bf3ad6f2812cd725',
  },
  {
    text: 'Grüße\u0000🙂\r\n',
    digest: '08b3abbd2af4f6c66494e816daccca6128d17bd68d8b3c940577892e68c05b81',
  },
];

describe('sha256SkillText', () => {
  it('retains exact SHA-256 bytes for empty, Unicode, NUL and CRLF text', () => {
    // arrange
    // act
    const actual = vectors.map((vector) => sha256SkillText(vector.text));
    // assert
    expect(actual).toEqual(vectors.map((vector) => vector.digest));
  });

  it('keeps the shipped and customized role digests captured before the module split', () => {
    // arrange
    const now = '2026-10-06T12:00:00Z';
    // act
    const base = builtinSkillPackage('analysis', [], now, sha256SkillText);
    const custom = builtinSkillPackage(
      'analysis',
      [{ role: 'analyze', additionalInstructions: 'Also check the domain contract.' }],
      now,
      sha256SkillText,
    );
    // assert
    expect(base.digest).toBe('bc143e8047ed41b94dcefedcf755263219f38c60afa18a5605123b580d0f7320');
    expect(custom.digest).toBe('7a1c085dd282187f7e808d32e004a54fe1a86a2ed4106fb5b370c7e0e3531c38');
    expect(analysisRevisionOf('A complete analysis artifact', sha256SkillText)).toBe(
      '9b50f16b8fc4',
    );
    expect(
      builtinSkillPackage('analysis', [], '2027-01-01T00:00:00Z', sha256SkillText).digest,
    ).toBe(base.digest);
  });

  it('hashes only the trimmed nonblank customization and leaves a blank addition absent', () => {
    // arrange
    const shipped = builtinSkill('analyze');
    // act
    const custom = composeSkillInstructions(
      shipped,
      { additionalInstructions: '  Also check the domain contract.\r\n' },
      sha256SkillText,
    );
    const blank = composeSkillInstructions(
      shipped,
      { additionalInstructions: ' \r\n ' },
      sha256SkillText,
    );
    // assert
    expect(custom.customizationHash).toBe(
      '284295ca81e42bf62445e5963451882d5e194f48e7b3d08194cbfe372fb88a44',
    );
    expect(blank.instructions).toBe(shipped.instructions);
    expect(blank).not.toHaveProperty('customizationHash');
  });
});
