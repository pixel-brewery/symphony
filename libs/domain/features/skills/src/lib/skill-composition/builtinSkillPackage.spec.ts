// #region Imports

import { describe, expect, it } from 'vitest';
import { builtinSkillPackage } from './builtinSkillPackage';

// #endregion

const digest = (text: string): string => text.length.toString(16).padStart(64, '0');

describe('builtinSkillPackage', () => {
  it('uses the shipped read-only analysis role without creating a user package and snapshots customizations', () => {
    // arrange
    const now = '2026-10-06T12:00:00Z';
    // act
    const base = builtinSkillPackage('analysis', [], now, digest);
    const customized = builtinSkillPackage(
      'analysis',
      [{ role: 'analyze', additionalInstructions: 'Also check the domain contract.' }],
      now,
      digest,
    );
    // assert
    expect(base).toMatchObject({
      id: 'bundled:analysis',
      source: 'bundled',
      editable: false,
      files: [],
    });
    expect(base.instructions).toContain('never write product code');
    expect(customized.instructions).toContain('Also check the domain contract.');
    expect(customized.digest).not.toBe(base.digest);
    expect(builtinSkillPackage('analysis', [], '2026-10-07T12:00:00Z', digest).digest).toBe(
      base.digest,
    );
  });
});
