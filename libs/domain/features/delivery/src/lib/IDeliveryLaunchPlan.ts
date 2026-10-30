/**
 * Concrete, reviewable launch intent. The adapter rechecks every field before dispatch.
 *
 * @public
 */
export interface IDeliveryLaunchPlan {
  readonly targetId: string;
  readonly targetName: string;
  readonly repositoryBindingId: string;
  readonly workflowId: string;
  readonly workflowPath: string;
  readonly ref: string;
  readonly revision: string;
  readonly definitionHash: string;
  readonly inputs: Readonly<Record<string, string>>;
  readonly operationInput?: string;
}
