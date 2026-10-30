// #region Imports

import { describe, expect, it } from 'vitest';
import { defaultAgentAppearance } from './defaultAgentAppearance';

// #endregion

describe('defaultAgentAppearance', () => {
  it.each([
    ['personal-default-agent', 'mint'],
    ['employee-original', 'blue'],
    ['employee-legacy', 'coral'],
  ] as const)('preserves the existing identity of %s when the catalogue grows', (id, color) => {
    // arrange
    const expected = { figure: 'dot', color, accessories: [] };

    // act
    const appearance = defaultAgentAppearance(id);

    // assert
    expect(appearance).toEqual(expected);
  });
});
