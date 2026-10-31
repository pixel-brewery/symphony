// #region Imports

import type { IContinuousIntegrationUsageSummary } from './IContinuousIntegrationUsageSummary';

// #endregion

interface IUsageReport {
  readonly repositoryBindingId: string;
  readonly account?: {
    readonly type: 'user' | 'organization';
    readonly login: string;
  };
  readonly period?: { readonly resetsAt: string };
  readonly minutes?: {
    readonly used: number;
    readonly included?: number;
    readonly remaining?: number;
  };
  readonly error?: string;
}

export function summarizeContinuousIntegrationUsage(
  repositoryBindingIds: readonly string[],
  reports: readonly IUsageReport[],
): IContinuousIntegrationUsageSummary | undefined {
  const selectedRepositoryIds = new Set(repositoryBindingIds);
  const reportsByAccount = new Map<string, IUsageReport>();
  for (const report of reports) {
    if (!selectedRepositoryIds.has(report.repositoryBindingId)) continue;
    const accountKey = report.account
      ? `${report.account.type}:${report.account.login.toLowerCase()}`
      : `repository:${report.repositoryBindingId}`;
    const existing = reportsByAccount.get(accountKey);
    if (!existing || (!existing.minutes && report.minutes))
      reportsByAccount.set(accountKey, report);
  }
  const accountReports = [...reportsByAccount.values()];
  if (!accountReports.length) return undefined;

  const accounts = new Set(
    accountReports.flatMap((report) => (report.account ? [`@${report.account.login}`] : [])),
  );
  const minuteReports = accountReports.filter(
    (report): report is IUsageReport & { readonly minutes: NonNullable<IUsageReport['minutes']> } =>
      Boolean(report.minutes),
  );
  const hasExactAllowance =
    minuteReports.length === accountReports.length &&
    minuteReports.every(
      (report) => report.minutes.included !== undefined && report.minutes.remaining !== undefined,
    );
  const used = minuteReports.length
    ? minuteReports.reduce((total, report) => total + report.minutes.used, 0)
    : undefined;
  const included = hasExactAllowance
    ? minuteReports.reduce((total, report) => total + report.minutes.included!, 0)
    : undefined;
  const remaining = hasExactAllowance
    ? minuteReports.reduce((total, report) => total + report.minutes.remaining!, 0)
    : undefined;
  const resetTimes = accountReports
    .map((report) => report.period?.resetsAt)
    .filter((value): value is string => Boolean(value))
    .sort();

  return {
    accountLabel:
      accounts.size === 1
        ? [...accounts][0]!
        : accounts.size > 1
          ? `${accounts.size} accounts`
          : `${accountReports.length} configured ${accountReports.length === 1 ? 'repository' : 'repositories'}`,
    ...(used === undefined ? {} : { used }),
    ...(included === undefined ? {} : { included }),
    ...(remaining === undefined ? {} : { remaining }),
    ...(included && remaining !== undefined
      ? { remainingPercent: Math.round((remaining / included) * 100) }
      : {}),
    ...(resetTimes[0] ? { resetsAt: resetTimes[0] } : {}),
    ...(accountReports.find((report) => report.error)?.error
      ? { error: accountReports.find((report) => report.error)!.error }
      : {}),
  };
}
