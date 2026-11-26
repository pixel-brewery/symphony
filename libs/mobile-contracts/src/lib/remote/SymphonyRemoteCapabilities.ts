/**
 * Product operation scopes granted by Symphony QR possession. Resource admission remains in Symphony.
 *
 * @public
 */
export const symphonyRemoteCapabilities = Object.freeze([
  'symphony:read',
  'symphony:work-items',
  'symphony:commands',
] as const);
