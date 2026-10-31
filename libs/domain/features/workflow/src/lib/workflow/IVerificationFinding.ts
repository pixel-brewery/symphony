export interface IVerificationFinding {
  readonly severity: 'blocker' | 'major' | 'minor';
  readonly summary: string;
  readonly detail: string;
  readonly reference?: string;
}
