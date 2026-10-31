// #region Imports

import type { IDeliveryOperations } from '@symphony/frontend-core/delivery-operations';

// #endregion

/** The actual optional participant consumed by Work, without another state owner. @public */
export type IWorkPublicationRead = Pick<IDeliveryOperations, 'pullRequestBusy'>;
