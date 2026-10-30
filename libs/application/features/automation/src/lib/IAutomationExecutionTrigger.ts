/**
 * Identifies the automation origin retained with an admitted execution attempt.
 *
 * @public
 */
export interface IAutomationExecutionTrigger {
  readonly origin: 'remote' | 'autonomy' | 'agentic-delivery' | 'workflow';
  readonly signalId?: string;
  readonly actorLogin?: string;
}
