export interface ILogFields {
  event: string;
  correlationId?: string;
  executionId?: string;
  [key: string]: unknown;
}
