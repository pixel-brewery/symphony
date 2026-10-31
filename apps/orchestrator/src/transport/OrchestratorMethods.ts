// #region Imports
import { requestSchemas, type RequestMethod } from '@symphony/ipc-contracts-composition';
// #endregion

/**
 * Preserves the canonical request catalog's order independently of feature registration.
 *
 * @public
 */
export const orchestratorMethods = Object.freeze(
  Object.keys(requestSchemas).filter((method): method is RequestMethod =>
    Object.hasOwn(requestSchemas, method),
  ),
);
