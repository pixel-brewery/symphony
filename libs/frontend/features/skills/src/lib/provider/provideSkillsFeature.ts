// #region Imports
import { inject, makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import {
  composeProviders,
  SKILLS_OPERATIONS,
  ORCHESTRATION_CLIENT,
  WORKSPACE_REFRESH_PARTICIPANTS,
  type IWorkspaceRefreshParticipant,
} from '@symphony/frontend-core';
import { SkillsAssignments } from '../adapters/SkillsAssignments';
import { SkillsContext } from '../adapters/SkillsContext';
import { SkillStore } from '../catalog/SkillStore';
import type { ISkillsSnapshotRefresh } from '../ports/ISkillsSnapshotRefresh';
import { SKILLS_ASSIGNMENTS } from '../ports/SkillsAssignmentsToken';
import { SKILLS_CLIENT } from '../ports/SkillsClientToken';
import { SKILLS_CONTEXT } from '../ports/SkillsContextToken';
import { SKILLS_SNAPSHOT_REFRESH } from '../ports/SkillsSnapshotRefreshToken';
import { APPLICATION_BOOTSTRAP_SKILLS } from '@symphony/frontend-core/bootstrap';
import { withSkillsSearch } from './withSkillsSearch';
import { provideViewSlot } from '@pixel-brewery/mosaik-elements-angular';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { SettingsViewSlot, type ISettingsSelection } from '@symphony/frontend-setting';
import { SKILL_IMPORT_PATHS } from '../settings/SkillImportPathsToken';
import { SKILLS_SETTINGS_CONTEXT } from '../settings/SkillsSettingsContextToken';
import type { ISkillsSettingsContext } from '../settings/ISkillsSettingsContext';
import { withSkillsSettings } from './withSkillsSettings';
import { OrchestrationSynchronizer } from '@symphony/frontend-core/synchronization';
// #endregion

/**
 * Registers Skills state, bounded dependencies and existing workspace/facade contributions.
 *
 * @returns The feature's application-level Angular providers.
 * @public
 */
export function provideSkillsFeature(): EnvironmentProviders {
  return makeEnvironmentProviders([
    ...composeProviders(
      [
        SkillStore,
        { provide: SKILL_IMPORT_PATHS, useExisting: ORCHESTRATION_CLIENT },
        {
          provide: SKILLS_SETTINGS_CONTEXT,
          useFactory: (): ISkillsSettingsContext => inject(ConfigurationStore),
        },
        { provide: APPLICATION_BOOTSTRAP_SKILLS, useExisting: SkillStore },
        { provide: SKILLS_CLIENT, useExisting: ORCHESTRATION_CLIENT },
        { provide: SKILLS_CONTEXT, useClass: SkillsContext },
        { provide: SKILLS_ASSIGNMENTS, useClass: SkillsAssignments },
        {
          provide: SKILLS_SNAPSHOT_REFRESH,
          useFactory: (): ISkillsSnapshotRefresh => {
            const synchronizer = inject(OrchestrationSynchronizer);
            return { refresh: () => synchronizer.refresh() };
          },
        },
        { provide: SKILLS_OPERATIONS, useExisting: SkillStore },
        {
          provide: WORKSPACE_REFRESH_PARTICIPANTS,
          useFactory: (skills: SkillStore): IWorkspaceRefreshParticipant => ({
            refresh: () => skills.refreshSkills(),
          }),
          deps: [SkillStore],
          multi: true,
        },
      ],
      [withSkillsSearch(), ...withSkillsSettings()],
    ),
    provideViewSlot<ISettingsSelection>(SettingsViewSlot.HeaderActions, [
      {
        id: 'skills-settings-header-actions',
        canActivate: (selection) =>
          selection?.workspaceId === null && selection.sectionId === 'skills',
        loadComponent: () =>
          import('../settings/SkillsSettingsHeaderActionView').then(
            (module) => module.SkillsSettingsHeaderActionView,
          ),
      },
    ]),
  ]);
}
