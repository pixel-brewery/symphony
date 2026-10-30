// #region Imports

import { describe, expect, it } from 'vitest';
import { WorkSelectionStore } from './WorkSelectionStore';

// #endregion

describe('WorkSelectionStore', () => {
  it('applies a snapshot default without replacing an explicit selection', () => {
    // arrange
    const selection = new WorkSelectionStore();
    selection.ensureDefault('first');
    const defaultWasExplicit = selection.selectionExplicit();
    selection.select('chosen');

    // act
    selection.ensureDefault('later-default');

    // assert
    expect(defaultWasExplicit).toBe(false);
    expect(selection.selectedWorkItemId()).toBe('chosen');
    expect(selection.selectionExplicit()).toBe(true);
  });

  it('selects saved items without turning an automatic selection into an explicit one', () => {
    // arrange
    const selection = new WorkSelectionStore();
    selection.ensureDefault('cached');

    // act
    selection.selectMutationResult('saved');

    // assert
    expect(selection.selectedWorkItemId()).toBe('saved');
    expect(selection.selectionExplicit()).toBe(false);
  });

  it('preserves identifier-only workspace resets and the explicit clear command', () => {
    // arrange
    const selection = new WorkSelectionStore();
    selection.select('old-workspace');

    // act
    selection.resetId();
    const resetIdentifier = selection.selectedWorkItemId();
    const explicitAfterReset = selection.selectionExplicit();
    selection.select(undefined);

    // assert
    expect(resetIdentifier).toBeUndefined();
    expect(explicitAfterReset).toBe(true);
    expect(selection.selectionExplicit()).toBe(false);
  });
});
