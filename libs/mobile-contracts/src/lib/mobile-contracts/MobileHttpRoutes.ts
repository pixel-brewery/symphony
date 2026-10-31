export const mobileHttpRoutes = {
  snapshot: '/api/mobile/v1/snapshot',
  command: '/api/mobile/v1/commands',
  workItemCreationContext: '/api/mobile/v1/work-items/creation-context',
  workItemCreate: '/api/mobile/v1/work-items',
  issueDraft: '/api/mobile/v1/work-items/draft',
  issueDraftCancel: '/api/mobile/v1/work-items/draft/cancel',
  pairingPropose: '/api/mobile/v1/pairing/propose',
  pairingStatus: '/api/mobile/v1/pairing/status',
  events: '/api/mobile/v1/events',
} as const;
