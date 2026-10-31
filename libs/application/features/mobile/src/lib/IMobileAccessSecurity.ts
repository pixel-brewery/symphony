/**
 * Supplies opaque pairing tokens and stable token hashes without exposing infrastructure.
 *
 * @public
 */
export interface IMobileAccessSecurity {
  randomToken(): string;
  hash(value: string): string;
}
