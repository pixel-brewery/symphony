/**
 * Where Production stands, with the same states Orbit draws for its centre: no Production
 * destination, a destination without a confirmed version, a confirmed version, or evidence that
 * could not be verified.
 *
 * @public
 */
export type ProductionState = 'unassigned' | 'unconfirmed' | 'confirmed' | 'stale';
