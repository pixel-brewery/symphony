// #region Imports
import { describe, expect, it, vi } from 'vitest';
import { createDefaultApplicationSettings } from '@symphony/configuration-composition';
import { OrchestratorSettingsState } from './OrchestratorSettingsState';
// #endregion

describe('OrchestratorSettingsState', () => {
  it('forwards full aggregate writes and refreshes the same live owner', () => {
    // arrange
    const initial = createDefaultApplicationSettings('/tmp/symphony-settings-test');
    const next = { ...initial, user: { ...initial.user, displayName: 'Updated operator' } };
    const save = vi.fn((settings: typeof initial) => settings);
    const state = new OrchestratorSettingsState(
      {
        save,
        load: () => next,
        repositoryPath: () => '/repository',
        hasStoredSettings: () => true,
      },
      initial,
    );
    const read = () => state.current;
    // act
    state.current = state.save(next);
    state.current = initial;
    state.refresh();
    // assert
    expect(save).toHaveBeenCalledExactlyOnceWith(next);
    expect(read().user.displayName).toBe('Updated operator');
    expect(read().repositoryBindings).toEqual(next.repositoryBindings);
    expect(state.repositoryPath('repository')).toBe('/repository');
  });

  it('keeps current state when persistence rejects the full write', () => {
    // arrange
    const initial = createDefaultApplicationSettings('/tmp/symphony-settings-test');
    const state = new OrchestratorSettingsState(
      {
        save: () => {
          throw new Error('Disk unavailable');
        },
        load: () => initial,
        repositoryPath: () => '/repository',
        hasStoredSettings: () => true,
      },
      initial,
    );
    // act / assert
    expect(() => {
      state.current = state.save({
        ...initial,
        user: { ...initial.user, displayName: 'Rejected' },
      });
    }).toThrow('Disk unavailable');
    expect(state.current).toBe(initial);
  });
});
