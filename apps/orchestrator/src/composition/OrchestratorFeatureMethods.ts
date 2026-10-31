// #region Imports
import { platformRequestSchemas } from '@symphony/ipc-contracts-platform';
import { executionRequestSchemas } from '@symphony/ipc-contracts-execution';
import { deliveryRequestSchemas } from '@symphony/ipc-contracts-delivery';
import { workRequestSchemas } from '@symphony/ipc-contracts-work';
import { workspaceRequestSchemas } from '@symphony/ipc-contracts-workspace';
import { ciRequestSchemas } from '@symphony/ipc-contracts-ci';
import { automationRequestSchemas } from '@symphony/ipc-contracts-automation';
import { feedbackRequestSchemas } from '@symphony/ipc-contracts-feedback';
import { aiRequestSchemas } from '@symphony/ipc-contracts-ai';
import { skillRequestSchemas } from '@symphony/ipc-contracts-skills';
import { workflowRequestSchemas } from '@symphony/ipc-contracts-workflow';
import { mobileRequestSchemas } from '@symphony/ipc-contracts-mobile';
import { type RequestMethod } from '@symphony/ipc-contracts-composition';
import { orchestratorMethods } from '../transport/OrchestratorMethods';
// #endregion

function methodsOf(
  schemas: Readonly<Partial<Record<RequestMethod, unknown>>>,
): readonly RequestMethod[] {
  return Object.freeze(orchestratorMethods.filter((method) => Object.hasOwn(schemas, method)));
}

/**
 * Declares the fixed method ownership independently of registered implementations.
 *
 * @public
 */
export const orchestratorFeatureMethods = Object.freeze({
  platform: methodsOf(platformRequestSchemas),
  execution: methodsOf(executionRequestSchemas),
  delivery: methodsOf(deliveryRequestSchemas),
  work: methodsOf(workRequestSchemas),
  workspace: methodsOf(workspaceRequestSchemas),
  ci: methodsOf(ciRequestSchemas),
  automation: methodsOf(automationRequestSchemas),
  feedback: methodsOf(feedbackRequestSchemas),
  ai: methodsOf(aiRequestSchemas),
  skills: methodsOf(skillRequestSchemas),
  workflow: methodsOf(workflowRequestSchemas),
  mobile: methodsOf(mobileRequestSchemas),
  composition: Object.freeze([
    'snapshot.get',
    'snapshot.refresh',
    'lifecycle.reconcile',
    'lifecycle.active-operations.get',
    'lifecycle.active-operations.pause',
    'lifecycle.active-operations.cancel',
    'settings.get',
    'settings.save',
    'connections.get',
    'setup.repository.inspect',
  ] satisfies readonly RequestMethod[]),
});
