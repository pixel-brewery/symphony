// #region Imports

import { describe, expect, it } from 'vitest';
import { scorePaletteMatch } from './scorePaletteMatch';

// #endregion

describe('scorePaletteMatch', () => {
  it('ranks a word start above a match inside a primary field and above a secondary field', () => {
    // arrange
    const title = ['CR-0589', 'Azure: Run and record the first database restore test'];

    // act
    const wordStart = scorePaletteMatch('restore', title);
    const inside = scorePaletteMatch('store', title);
    const secondary = scorePaletteMatch('rweber', title, ['rweber']);

    // assert
    expect(wordStart).toBeGreaterThan(inside);
    expect(inside).toBeGreaterThan(secondary);
    expect(secondary).toBeGreaterThan(0);
  });

  it('requires every term and finds nothing for an empty query', () => {
    // arrange
    const fields = ['#712', 'Restore test runbook for Azure SQL'];

    // act
    const allTerms = scorePaletteMatch('restore azure', fields);
    const missingTerm = scorePaletteMatch('restore postgres', fields);
    const empty = scorePaletteMatch('', fields);

    // assert
    expect(allTerms).toBeGreaterThan(0);
    expect(missingTerm).toBe(0);
    expect(empty).toBe(0);
  });

  it('puts an exact id or number first', () => {
    // arrange
    const exact = ['#712', 'Restore test runbook'];
    const partial = ['#7120', 'Restore 712 runbook'];

    // act
    const exactRank = scorePaletteMatch('712', exact);
    const partialRank = scorePaletteMatch('712', partial);
    const idRank = scorePaletteMatch('cr-0589', ['CR-0589', 'Title']);

    // assert
    expect(exactRank).toBeGreaterThan(partialRank);
    expect(idRank).toBe(8);
  });

  it('ignores absent fields and matches numbers', () => {
    // act
    const rank = scorePaletteMatch('87', [undefined, 87, ''], [undefined]);

    // assert
    expect(rank).toBe(8);
  });
});
