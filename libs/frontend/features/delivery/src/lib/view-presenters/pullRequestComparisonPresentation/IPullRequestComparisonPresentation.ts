export interface IPullRequestComparisonPresentation {
  readonly variant: 'success' | 'warning' | 'neutral';
  readonly iconName: 'checkmark' | 'errorCircle' | 'info';
  readonly header: string;
  readonly detail: string;
  /** False whenever the comparison itself rules out a new pull request. */
  readonly comparable: boolean;
}
