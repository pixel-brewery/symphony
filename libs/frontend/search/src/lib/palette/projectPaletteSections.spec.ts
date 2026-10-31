// #region Imports

import { describe, expect, it } from 'vitest';
import type { IPaletteResult } from '../models/IPaletteResult';
import { projectPaletteSections } from './projectPaletteSections';

// #endregion

describe('projectPaletteSections', () => {
  it('orders the drawn groups, ranks rows within each and records keyboard offsets', () => {
    // arrange
    const results = [
      row('command:new', 'commands', 1),
      row('pull-request:712', 'pull-requests', 3),
      row('work-item:2', 'work-items', 2),
      row('work-item:1', 'work-items', 5),
      row('action-run:9', 'action-runs', 1),
    ];

    // act
    const sections = projectPaletteSections(results);

    // assert
    expect(
      sections.map((section) => [
        section.group,
        section.offset,
        section.results.map((result) => result.id),
      ]),
    ).toEqual([
      ['work-items', 0, ['work-item:1', 'work-item:2']],
      ['pull-requests', 2, ['pull-request:712']],
      ['action-runs', 3, ['action-run:9']],
      ['commands', 4, ['command:new']],
    ]);
  });

  it('keeps contribution order for equal ranks, lists an id once and leaves empty groups out', () => {
    // arrange
    const results = [
      row('command:a', 'commands', 0),
      row('command:b', 'commands', 0),
      row('command:a', 'commands', 9),
      row('command:c', 'commands', 0),
    ];

    // act
    const sections = projectPaletteSections(results);

    // assert
    expect(sections).toHaveLength(1);
    expect(sections[0]?.results.map((result) => result.id)).toEqual([
      'command:a',
      'command:b',
      'command:c',
    ]);
  });

  it('cuts each group to its limit', () => {
    // arrange
    const results = Array.from({ length: 9 }, (_, index) =>
      row(`work-item:${index}`, 'work-items', index),
    );

    // act
    const sections = projectPaletteSections(results);

    // assert
    expect(sections[0]?.results.map((result) => result.id)).toEqual([
      'work-item:8',
      'work-item:7',
      'work-item:6',
      'work-item:5',
      'work-item:4',
    ]);
  });
});

function row(id: string, group: IPaletteResult['group'], rank: number): IPaletteResult {
  return { id, group, icon: 'board', title: id, rank, action: { kind: 'navigate', path: '/' } };
}
