export interface IMobileDashboardFocus {
  readonly ariaLabel: string;
  readonly actionLabel: string;
  readonly context: string;
  readonly eyebrow: string;
  readonly queryParams?: Readonly<Record<string, string>>;
  readonly route: readonly string[];
  readonly title: string;
}
