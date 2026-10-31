/** Origin metadata consumed by one admitted execution. @public */
export interface IExecutionTrigger {
  readonly origin: 'remote' | 'autonomy' | 'agentic-delivery' | 'workflow';
  readonly signalId?: string;
  readonly actorLogin?: string;
}
