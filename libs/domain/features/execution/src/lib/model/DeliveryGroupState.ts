/** Durable lifecycle of a joint-delivery group. */
export type DeliveryGroupState =
  'synchronizing' | 'active' | 'paused' | 'dissolving' | 'dissolved' | 'completed';
