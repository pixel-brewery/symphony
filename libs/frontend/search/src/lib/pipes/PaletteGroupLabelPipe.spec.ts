// #region Imports

import { describe, expect, it } from 'vitest';
import { PaletteGroupLabelPipe } from './PaletteGroupLabelPipe';

// #endregion

describe('PaletteGroupLabelPipe', () => {
  it.each([
    ['work-items', 'WORK ITEMS'],
    ['pull-requests', 'PULL REQUESTS'],
    ['action-runs', 'ACTION RUNS'],
    ['commands', 'COMMANDS'],
  ] as const)('names %s as drawn', (group, label) => {
    // arrange
    const pipe = new PaletteGroupLabelPipe();

    // act
    const heading = pipe.transform(group);

    // assert
    expect(heading).toBe(label);
  });
});
