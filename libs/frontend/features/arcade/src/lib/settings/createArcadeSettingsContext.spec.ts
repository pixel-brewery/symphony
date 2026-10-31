// #region Imports

import { signal } from '@angular/core';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import type { ConfigurationStore } from '@symphony/frontend-core/configuration';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { describe, expect, it, vi } from 'vitest';
import { createArcadeSettingsContext } from './createArcadeSettingsContext';

// #endregion

describe('createArcadeSettingsContext', () => {
  it('saves the preference against the latest aggregate without changing other settings', async () => {
    // arrange
    const original = applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp'));
    const settings = signal<ApplicationSettingsDto | undefined>(original);
    const saveSettings = vi.fn<ConfigurationStore['saveSettings']>(async (next) => {
      settings.set(next);
      return true;
    });
    const context = createArcadeSettingsContext({ settings, saveSettings });
    const current = { ...original, user: { ...original.user, displayName: 'Updated operator' } };
    settings.set(current);

    // act
    const saved = await context.setEnabled(true);

    // assert
    expect(saved).toBe(true);
    expect(saveSettings).toHaveBeenCalledExactlyOnceWith({
      ...current,
      user: { ...current.user, arcadeEnabled: true },
    });
    expect(context.enabled()).toBe(true);
    expect(settings()?.user.displayName).toBe('Updated operator');
    expect(settings()?.repositoryBindings).toBe(current.repositoryBindings);
  });

  it('keeps the authoritative preference unchanged until its existing save owner completes', async () => {
    // arrange
    const original = applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp'));
    const settings = signal<ApplicationSettingsDto | undefined>(original);
    let completeSave: () => void = () => undefined;
    const saveCompleted = new Promise<void>((resolve) => {
      completeSave = resolve;
    });
    const saveSettings = vi.fn<ConfigurationStore['saveSettings']>(async (next) => {
      await saveCompleted;
      settings.set(next);
      return true;
    });
    const context = createArcadeSettingsContext({ settings, saveSettings });

    // act
    const pending = context.setEnabled(true);

    // assert
    expect(context.enabled()).toBe(false);
    expect(settings()).toBe(original);

    // act
    completeSave();
    await pending;

    // assert
    expect(context.enabled()).toBe(true);
    expect(saveSettings).toHaveBeenCalledOnce();
  });

  it('preserves the saved preference when its aggregate save is rejected', async () => {
    // arrange
    const original = applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp'));
    const settings = signal<ApplicationSettingsDto | undefined>(original);
    const saveSettings = vi.fn<ConfigurationStore['saveSettings']>().mockResolvedValue(false);
    const context = createArcadeSettingsContext({ settings, saveSettings });

    // act
    const saved = await context.setEnabled(true);

    // assert
    expect(saved).toBe(false);
    expect(context.enabled()).toBe(false);
    expect(settings()).toBe(original);
  });

  it('refuses to save before product settings have been loaded', async () => {
    // arrange
    const settings = signal<ApplicationSettingsDto | undefined>(undefined);
    const saveSettings = vi.fn<ConfigurationStore['saveSettings']>();
    const context = createArcadeSettingsContext({ settings, saveSettings });

    // act
    const pending = context.setEnabled(true);

    // assert
    await expect(pending).rejects.toThrow('Application settings are not loaded.');
    expect(saveSettings).not.toHaveBeenCalled();
  });
});
