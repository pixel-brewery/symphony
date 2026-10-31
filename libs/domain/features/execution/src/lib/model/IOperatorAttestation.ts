/** Records an operator's explicit joint-delivery attestation for audit. */
export interface IOperatorAttestation {
  /** Moment the operator attested, as an ISO-8601 timestamp. */
  readonly attestedAt: string;
  /** Optional operator-provided justification. */
  readonly reason?: string;
}
