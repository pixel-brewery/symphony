/**
 * Provider-neutral feedback request discovered by an inbound collaboration adapter.
 *
 * @public
 */
export interface IFeedbackIntakeSignal {
  id: string;
  sourceId: string;
  workspaceId: string;
  targetWorkItemSourceId: string;
  targetRepositoryBindingId: string;
  occurredAt: string;
  marker: string;
  title: string;
  prompt: string;
  actor?: string;
  externalUrl?: string;
}
