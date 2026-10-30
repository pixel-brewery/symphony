// #region Imports

import { signal } from '@angular/core';
import type { SettingsHostSession } from '@symphony/frontend-setting';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import type { ICiSettingsDraft } from './ICiSettingsDraft';

// #endregion

const DRAFTS = new WeakMap<SettingsHostSession, ICiSettingsDraft>();

/**
 * Retains the existing CI drafts when native settings cards mount and unmount.
 *
 * @param session - The generic Settings route's existing lifecycle owner.
 * @returns The single CI draft for that session.
 * @internal
 */
export function ciSettingsDraftFor(session: SettingsHostSession): ICiSettingsDraft {
  let draft = DRAFTS.get(session);
  if (!draft) {
    draft = {
      settings: undefined,
      localCi: signal<ApplicationSettingsDto['localCi']>({
        resourcePreset: 'balanced',
        storageLimitGiB: 32,
        reuseVirtualMachine: false,
      }),
      workspaceLocalCi: signal<Readonly<Record<string, boolean>>>({}),
      setupScripts: signal<Readonly<Record<string, string>>>({}),
    };
    DRAFTS.set(session, draft);
  }
  return draft;
}
