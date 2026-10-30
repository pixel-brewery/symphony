export /**
 * Lease data every orchestrator can read from the shared claim commit. Keeping it in the
 * provider record - rather than only in local storage - is what lets a second machine tell a
 * live worker from a crashed one.
 */
interface IClaimRecord {
  readonly owner: string;
  readonly action: string;
  readonly executionId: string;
  readonly leaseUntil: string;
  readonly heartbeatAt: string;
  readonly claimVersion: number;
}
