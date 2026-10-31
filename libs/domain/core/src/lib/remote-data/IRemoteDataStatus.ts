export interface IRemoteDataStatus {
  state: 'current' | 'stale' | 'unavailable';
  lastSuccessfulRefreshAt?: string;
  /** Safe recovery category; provider payloads and credential values never cross this boundary. */
  reason?: 'authentication-required' | 'rate-limited';
  /** Provider-declared earliest safe retry time, when one is available. */
  retryAt?: string;
}
