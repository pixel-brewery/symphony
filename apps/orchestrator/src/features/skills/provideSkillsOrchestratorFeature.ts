// #region Imports
import { type IProvideSkillsOrchestratorFeatureDependencies } from './IProvideSkillsOrchestratorFeatureDependencies';
import { skillRequestSchemas, skillResponseSchemas } from '@symphony/ipc-contracts-skills';
import { createOrchestratorRequestHandler } from '../../transport/createOrchestratorRequestHandler';
// #endregion

/**
 * Owns skills commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function provideSkillsOrchestratorFeature(
  dependencies: IProvideSkillsOrchestratorFeatureDependencies,
) {
  const { skillPackages, settingsState } = dependencies;

  const handlers = Object.freeze([
    createOrchestratorRequestHandler(
      'skills.builtin.list',
      skillRequestSchemas['skills.builtin.list'],
      skillResponseSchemas['skills.builtin.list'],
      async () => {
        return { skills: skillPackages.builtins() };
      },
    ),
    createOrchestratorRequestHandler(
      'skills.builtin.customize',
      skillRequestSchemas['skills.builtin.customize'],
      skillResponseSchemas['skills.builtin.customize'],
      async (input) => {
        skillPackages.customizeBuiltin(input.role, input.additionalInstructions);
        return settingsState.current;
      },
    ),
    createOrchestratorRequestHandler(
      'skills.list',
      skillRequestSchemas['skills.list'],
      skillResponseSchemas['skills.list'],
      async () => {
        return skillPackages.list();
      },
    ),
    createOrchestratorRequestHandler(
      'skills.get',
      skillRequestSchemas['skills.get'],
      skillResponseSchemas['skills.get'],
      async (input) => {
        return skillPackages.get(input.id);
      },
    ),
    createOrchestratorRequestHandler(
      'skills.save',
      skillRequestSchemas['skills.save'],
      skillResponseSchemas['skills.save'],
      async (input) => {
        return skillPackages.save(input.skill);
      },
    ),
    createOrchestratorRequestHandler(
      'skills.import',
      skillRequestSchemas['skills.import'],
      skillResponseSchemas['skills.import'],
      async (input) => {
        return skillPackages.import(input.sourcePath);
      },
    ),
    createOrchestratorRequestHandler(
      'skills.export',
      skillRequestSchemas['skills.export'],
      skillResponseSchemas['skills.export'],
      async (input) => {
        return skillPackages.export(input.id, input.destinationRoot);
      },
    ),
    createOrchestratorRequestHandler(
      'skills.delete',
      skillRequestSchemas['skills.delete'],
      skillResponseSchemas['skills.delete'],
      async (input) => {
        return skillPackages.delete(input.name);
      },
    ),
  ]);
  return Object.freeze({ id: 'skills', handlers });
}
