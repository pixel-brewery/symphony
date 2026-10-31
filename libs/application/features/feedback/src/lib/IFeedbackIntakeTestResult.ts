/**
 * Reports a successful connection test without leaking provider-specific response shapes.
 *
 * @public
 */
export interface IFeedbackIntakeTestResult {
  readonly status: 'completed';
  readonly message: string;
}
