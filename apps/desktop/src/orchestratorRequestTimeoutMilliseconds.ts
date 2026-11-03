// #region Imports

import type { RequestMethod } from '@symphony/ipc-contracts-composition';

// #endregion

const DEFAULT_REQUEST_TIMEOUT_MILLISECONDS = 35_000;
const DELIVERY_REFRESH_TIMEOUT_MILLISECONDS = 120_000;
const LONG_RUNNING_REQUEST_METHODS: ReadonlySet<RequestMethod> = new Set([
  'ci.local.run',
  'ci.workflow.local.run',
  'delivery-groups.align',
  'delivery-groups.assess',
  'delivery-groups.create-direct',
  'delivery-groups.confirm',
  'delivery-groups.dissolve',
  'delivery-groups.reject',
  'runtime-dependencies.install',
  'work-items.draft',
]);

export function orchestratorRequestTimeoutMilliseconds(method: RequestMethod): number | undefined {
  if (method === 'delivery.refresh') return DELIVERY_REFRESH_TIMEOUT_MILLISECONDS;
  return LONG_RUNNING_REQUEST_METHODS.has(method)
    ? undefined
    : DEFAULT_REQUEST_TIMEOUT_MILLISECONDS;
}
