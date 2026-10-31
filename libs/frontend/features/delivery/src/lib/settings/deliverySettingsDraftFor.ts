// #region Imports

import { signal } from '@angular/core';
import type { SettingsHostSession } from '@symphony/frontend-setting';
import type { IDeliverySettingsDraft } from './IDeliverySettingsDraft';

// #endregion

const drafts = new WeakMap<SettingsHostSession, IDeliverySettingsDraft>();
/** Retains only the original project selection for one real Settings route lifetime. @public */
export function deliverySettingsDraftFor(session: SettingsHostSession): IDeliverySettingsDraft {
  let draft = drafts.get(session);
  if (!draft) {
    draft = { deliveryRepositoryId: signal('') };
    drafts.set(session, draft);
  }
  return draft;
}
