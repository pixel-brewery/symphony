// #region Imports

import { describe, expect, it } from 'vitest';
import { excerptRunLog } from './excerptRunLog';

// #endregion

describe('excerptRunLog', () => {
  it('keeps the last twelve non-blank-edged lines', () => {
    // arrange
    const log = `\n${Array.from({ length: 20 }, (_, index) => `line ${index + 1}  `).join('\r\n')}\n\n`;

    // act
    const excerpt = excerptRunLog(log);

    // assert
    expect(excerpt?.split('\n')).toEqual(
      Array.from({ length: 12 }, (_, index) => `line ${index + 9}`),
    );
  });

  it('returns nothing for an empty log', () => {
    // act
    const results = [excerptRunLog(undefined), excerptRunLog(' \n \n')];

    // assert
    expect(results).toEqual([undefined, undefined]);
  });
});
