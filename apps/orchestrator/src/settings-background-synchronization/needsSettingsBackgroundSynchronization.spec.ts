// #region Imports

import { createDefaultApplicationSettings } from '@symphony/configuration-composition';
import { describe, expect, it } from 'vitest';
import { needsSettingsBackgroundSynchronization } from './needsSettingsBackgroundSynchronization';

// #endregion

describe('needsSettingsBackgroundSynchronization', () => {
  it('does not restart providers when only the visible workspace changes', () => {
    // arrange
    const current = createDefaultApplicationSettings('/tmp/symphony');
    const next = {
      ...current,
      activeViewScope: { ...current.activeViewScope, workspaceIds: ['serviceware'] },
    };

    // act
    const required = needsSettingsBackgroundSynchronization(current, next);

    // assert
    expect(required).toBe(false);
  });

  it('restarts providers when their configuration changes', () => {
    // arrange
    const current = createDefaultApplicationSettings('/tmp/symphony');
    const next = {
      ...current,
      runtime: {
        ...current.runtime,
        automaticExecutionEnabled: !current.runtime.automaticExecutionEnabled,
      },
    };

    // act
    const required = needsSettingsBackgroundSynchronization(current, next);

    // assert
    expect(required).toBe(true);
  });
});
