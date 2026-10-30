// #region Imports
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { type IAnalyzerDependencies } from '@symphony/application-execution';
import { repositoryBindingsFor } from '@symphony/configuration-composition';
import { workspaceStorageDirectoryName } from '@symphony/persistence-core';
import { describeVerificationChecks } from '@symphony/providers-ci';
import { type ICreateImplementationVerificationDependencies } from './ICreateImplementationVerificationDependencies';
// #endregion
/**
 * Runs the existing bounded implementation checks in the addressed managed worktree.
 *
 * @public
 */
export function createImplementationVerification(
  dependencies: ICreateImplementationVerificationDependencies,
): NonNullable<IAnalyzerDependencies['verifyImplementation']> {
  const {
    settingsState,
    configurationRoot,
    implementationVerificationPlanner,
    implementationVerificationExecutor,
  } = dependencies;
  return async (workspacePath, workItem, signal) => {
    if (process.env['SYMPHONY_WORKSPACE_MODE'] === 'simulated') {
      return [{ label: 'Simulated repository verification', state: 'passed' as const }];
    }
    const repositories = repositoryBindingsFor(settingsState.current, workItem);
    if (repositories.length !== 1) {
      return [{ label: 'Unambiguous repository verification target', state: 'failed' as const }];
    }
    const repositoryBinding = repositories[0]!;
    const draft = await implementationVerificationPlanner.plan(
      repositoryBinding,
      { path: workspacePath, revision: 'managed-worktree', managed: true },
      signal,
    );
    // A managed worktree carries no installed dependencies, so restoring them is part of verifying
    // an implementation. E2E steps need services and a browser and stay out of the solve loop.
    const steps = draft.steps.filter(
      (step) =>
        step.kind !== 'e2e-test' &&
        (step.network === 'none' || (step.kind === 'restore' && step.network === 'dependencies')),
    );
    if (!steps.length) {
      return [{ label: 'Repository-defined deterministic checks', state: 'failed' as const }];
    }
    const results = await implementationVerificationExecutor.execute(
      workspacePath,
      join(
        configurationRoot,
        'workspaces',
        workspaceStorageDirectoryName(repositoryBinding.workspaceId),
        'verification',
        `goal-${randomUUID()}`,
      ),
      steps,
      signal,
    );
    return describeVerificationChecks(steps, results);
  };
}
