// #region Imports

import { describe, expect, it } from 'vitest';
import { menuBarStatusIconFileName } from './menuBarStatusIconFileName';

// #endregion

describe('menuBarStatusIconFileName', () => {
  it('maps each semantic status to a distinct macOS template image', () => {
    // arrange
    const statuses = ['idle', 'running', 'failed'] as const;

    // act
    const files = statuses.map((status) => menuBarStatusIconFileName(status));

    // assert
    expect(files).toEqual([
      'symphonyTemplate.png',
      'symphonyRunningTemplate.png',
      'symphonyFailedTemplate.png',
    ]);
  });
});
