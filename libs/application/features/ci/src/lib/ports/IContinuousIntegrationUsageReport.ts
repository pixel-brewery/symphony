export interface IContinuousIntegrationUsageReport {
  readonly repositoryBindingId: string;
  readonly account?: {
    readonly type: 'user' | 'organization';
    readonly login: string;
    readonly planName?: string;
  };
  readonly period?: {
    readonly startedAt: string;
    readonly resetsAt: string;
  };
  readonly minutes?: {
    readonly used: number;
    readonly included?: number;
    readonly remaining?: number;
    readonly usedPercent?: number;
    readonly remainingPercent?: number;
  };
  readonly error?: string;
}
