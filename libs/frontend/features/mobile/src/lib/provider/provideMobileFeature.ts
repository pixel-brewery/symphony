// #region Imports

import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { composeProviders, ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { MOBILE_ACCESS_OPERATIONS } from '@symphony/frontend-core/mobile-access';
import { MOBILE_ACCESS_CLIENT } from '../ports/MobileAccessClientToken';
import { MobileAccessStore } from '../state/MobileAccessStore';
import { withMobileSettings } from './withMobileSettings';

// #endregion

/**
 * Registers one desktop Mobile access owner and its Settings contribution.
 *
 * @returns Application-level Mobile providers.
 * @public
 */
export function provideMobileFeature(): EnvironmentProviders {
  return makeEnvironmentProviders(
    composeProviders(
      [
        MobileAccessStore,
        { provide: MOBILE_ACCESS_CLIENT, useExisting: ORCHESTRATION_CLIENT },
        { provide: MOBILE_ACCESS_OPERATIONS, useExisting: MobileAccessStore },
      ],
      withMobileSettings(),
    ),
  );
}
