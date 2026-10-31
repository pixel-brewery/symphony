// #region Imports
import {
  createWorkspaceBundle,
  workspaceBundleFileName,
  workspaceBundleSchema,
  planWorkspaceImport,
  embeddedSkillMatches,
} from '@symphony/configuration-composition';
import { type IProvideWorkspaceOrchestratorFeatureDependencies } from './IProvideWorkspaceOrchestratorFeatureDependencies';
import {
  workspaceRequestSchemas,
  workspaceResponseSchemas,
} from '@symphony/ipc-contracts-workspace';
import { createOrchestratorRequestHandler } from '../../transport/createOrchestratorRequestHandler';
// #endregion

/**
 * Owns workspace commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function provideWorkspaceOrchestratorFeature(
  dependencies: IProvideWorkspaceOrchestratorFeatureDependencies,
) {
  const {
    service,
    deleteWorkspace,
    skillPackages,
    settingsState,
    workspaceBundles,
    deletingWorkspaceIds,
    workItemService,
    normalizeMachinePaths,
    ensureWorkspaceRoot,
    synchronizeRemoteAutomation,
    synchronizeFeedbackIntake,
    runAutonomousCycle,
    repositoryRuntime,
    storageGovernor,
    workspaceIdForRepository,
  } = dependencies;

  const handlers = Object.freeze([
    createOrchestratorRequestHandler(
      'workspaces.clear',
      workspaceRequestSchemas['workspaces.clear'],
      workspaceResponseSchemas['workspaces.clear'],
      async () => {
        return service.clearWorkspaces();
      },
    ),
    createOrchestratorRequestHandler(
      'workspaces.delete',
      workspaceRequestSchemas['workspaces.delete'],
      workspaceResponseSchemas['workspaces.delete'],
      async (input) => {
        return deleteWorkspace(input.workspaceId);
      },
    ),
    createOrchestratorRequestHandler(
      'workspaces.export',
      workspaceRequestSchemas['workspaces.export'],
      workspaceResponseSchemas['workspaces.export'],
      async (input) => {
        const availableSkills = skillPackages.sharedPackages();
        const exportedAt = new Date();
        const bundle = createWorkspaceBundle(
          settingsState.current,
          input.workspaceId,
          availableSkills,
          exportedAt,
        );
        const path = workspaceBundles.write(
          input.destinationRoot,
          workspaceBundleFileName(bundle.workspace, exportedAt),
          bundle,
        );
        return {
          workspaceId: bundle.workspace.id,
          workspaceName: bundle.workspace.displayName,
          path,
          embeddedSkillCount: bundle.skills.length,
        };
      },
    ),
    createOrchestratorRequestHandler(
      'workspaces.import',
      workspaceRequestSchemas['workspaces.import'],
      workspaceResponseSchemas['workspaces.import'],
      async (input) => {
        if (deletingWorkspaceIds().size) {
          throw new Error('Wait for workspace deletion to finish before importing a workspace.');
        }
        const bundle = workspaceBundleSchema.parse(workspaceBundles.read(input.sourcePath));
        if (
          service
            .activeExecutionRecords()
            .some((execution) => execution.workspaceId === bundle.workspace.id) ||
          workItemService.hasActiveDraftForWorkspace(bundle.workspace.id)
        ) {
          throw new Error('Wait for active workspace operations to finish before importing it.');
        }
        const plan = planWorkspaceImport(settingsState.current, bundle, (repositoryId) =>
          settingsState.repositoryPath(repositoryId),
        );
        const existingSkills = new Map(
          skillPackages.sharedPackages().map((skill) => [skill.name, skill]),
        );
        for (const skill of plan.skills) {
          skillPackages.validate(skill);
          const existing = existingSkills.get(skill.name);
          if (existing && !embeddedSkillMatches(existing, skill)) {
            throw new Error(
              `Shared skill "${skill.name}" already exists with different content. Rename or remove it before importing this workspace.`,
            );
          }
        }
        let importedSkillCount = 0;
        for (const skill of plan.skills) {
          if (existingSkills.has(skill.name)) continue;
          skillPackages.save(skill);
          importedSkillCount += 1;
        }
        settingsState.current = settingsState.save(normalizeMachinePaths(plan.settings));
        ensureWorkspaceRoot(settingsState.current.runtime.workspaceRoot);
        void service.cleanupEligibleWorkspaces();
        void service.drainExecutionQueue();
        void synchronizeRemoteAutomation(true);
        void synchronizeFeedbackIntake(true);
        void runAutonomousCycle(true);
        return {
          settings: settingsState.current,
          workspaceId: plan.workspaceId,
          workspaceName: plan.workspaceName,
          replaced: plan.replaced,
          importedSkillCount,
          requiredConnectionIds: plan.requiredConnectionIds,
          repositoryBindingIds: plan.repositoryBindingIds,
        };
      },
    ),
    createOrchestratorRequestHandler(
      'repositories.runtime.list',
      workspaceRequestSchemas['repositories.runtime.list'],
      workspaceResponseSchemas['repositories.runtime.list'],
      async (input) => {
        return repositoryRuntime.statuses(input.repositoryBindingId);
      },
    ),
    createOrchestratorRequestHandler(
      'repositories.prepare',
      workspaceRequestSchemas['repositories.prepare'],
      workspaceResponseSchemas['repositories.prepare'],
      async (input) => {
        storageGovernor.assertWritable({
          workspaceId: workspaceIdForRepository(input.repositoryBindingId),
        });
        return repositoryRuntime.prepare(input.repositoryBindingId, new AbortController().signal);
      },
    ),
    createOrchestratorRequestHandler(
      'repositories.trust.grant-agent',
      workspaceRequestSchemas['repositories.trust.grant-agent'],
      workspaceResponseSchemas['repositories.trust.grant-agent'],
      async (input) => {
        repositoryRuntime.grantAgentTrust(input.repositoryBindingId);
        const [status] = await repositoryRuntime.statuses(input.repositoryBindingId);
        if (!status) throw new Error(`Unknown repository binding: ${input.repositoryBindingId}`);
        void synchronizeRemoteAutomation(true);
        void runAutonomousCycle(true);
        return status;
      },
    ),
    createOrchestratorRequestHandler(
      'repositories.trust.revoke',
      workspaceRequestSchemas['repositories.trust.revoke'],
      workspaceResponseSchemas['repositories.trust.revoke'],
      async (input) => {
        repositoryRuntime.revokeTrust(input.repositoryBindingId);
        return (await repositoryRuntime.statuses(input.repositoryBindingId))[0];
      },
    ),
  ]);
  return Object.freeze({ id: 'workspace', handlers });
}
