// #region Imports
import type { IRemoteRouteDefinition } from '@pixel-brewery/remote-protocol';
import { mobileHttpRoutes } from '../mobile-contracts/MobileHttpRoutes';
// #endregion

/**
 * Complete product operation registry. Pairing and sessions belong to the SDK's reserved routes.
 *
 * @public
 */
export const symphonyRemoteRoutes: readonly IRemoteRouteDefinition[] = Object.freeze([
  {
    id: 'mobile.snapshot',
    method: 'GET',
    path: mobileHttpRoutes.snapshot,
    kind: 'http',
    capabilities: ['symphony:read'],
    retry: 'safe-read',
  },
  {
    id: 'mobile.creation-context',
    method: 'POST',
    path: mobileHttpRoutes.workItemCreationContext,
    kind: 'http',
    capabilities: ['symphony:read'],
    retry: 'never',
    maxRequestBytes: 4 * 1024 * 1024,
  },
  {
    id: 'mobile.work-item.create',
    method: 'POST',
    path: mobileHttpRoutes.workItemCreate,
    kind: 'http',
    capabilities: ['symphony:work-items'],
    retry: 'never',
    maxRequestBytes: 4 * 1024 * 1024,
  },
  {
    id: 'mobile.draft',
    method: 'POST',
    path: mobileHttpRoutes.issueDraft,
    kind: 'http',
    capabilities: ['symphony:work-items'],
    retry: 'never',
    maxRequestBytes: 4 * 1024 * 1024,
  },
  {
    id: 'mobile.draft.cancel',
    method: 'POST',
    path: mobileHttpRoutes.issueDraftCancel,
    kind: 'http',
    capabilities: ['symphony:work-items'],
    retry: 'never',
    maxRequestBytes: 4 * 1024 * 1024,
  },
  {
    id: 'mobile.commands',
    method: 'POST',
    path: mobileHttpRoutes.command,
    kind: 'http',
    capabilities: ['symphony:commands'],
    retry: 'never',
    maxRequestBytes: 4 * 1024 * 1024,
  },
  {
    id: 'mobile.events',
    method: 'GET',
    path: mobileHttpRoutes.events,
    kind: 'websocket',
    capabilities: ['symphony:read'],
    retry: 'never',
  },
]);
