export interface IEscalationPolicy {
  readonly reminderHours: number;
  readonly escalationHours: number;
  readonly decisionHours: number;
}
