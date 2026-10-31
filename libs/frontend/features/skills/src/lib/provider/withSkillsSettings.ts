// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import {
  SettingsViewSlot,
  withSettingsEditor,
  withSettingsViews,
  type SettingsFeatureKind,
} from '@symphony/frontend-setting';
import { isSkillCatalogEditorRequest } from '../settings/isSkillCatalogEditorRequest';
import { isSkillEditorRequest } from '../settings/isSkillEditorRequest';
import { isSkillImportEditorRequest } from '../settings/isSkillImportEditorRequest';
import { isSkillRoleInstructionsEditorRequest } from '../settings/isSkillRoleInstructionsEditorRequest';

// #endregion

/**
 * Contributes the `Skills` section and its sheets to the Settings window: the role instructions,
 * `Add skills`, the skill package sheet and `Import skill`.
 *
 * @public
 */
export function withSkillsSettings(): readonly IFeature<SettingsFeatureKind>[] {
  return [
    withSettingsViews({
      id: 'skills-settings',
      slot: SettingsViewSlot.Global,
      views: [
        {
          id: 'SkillsSettingsView',
          order: 10,
          section: {
            scope: 'global',
            id: 'skills',
            label: 'Skills',
            description: 'How each step of the delivery flow works, in every workspace.',
            order: 30,
          },
          search: [
            {
              id: 'process-roles',
              label: 'Edit instructions',
              description:
                'Add instructions to refine how a built-in process role works; permissions and the reporting contract stay fixed.',
              keywords: ['create', 'analyze', 'solve', 'verify', 'diagnose CI', 'repair CI'],
            },
            {
              id: 'skill-packages',
              label: 'Add skills',
              description: 'Activate a discovered skill package for an optional AI step.',
              keywords: ['skill package', 'deactivate', 'catalog'],
            },
            {
              id: 'new-skill',
              label: 'New skill',
              description: 'Create a portable Symphony skill package.',
            },
            {
              id: 'import-skill',
              label: 'Import skill',
              description: 'Select a folder containing SKILL.md and packaged resources.',
              keywords: ['portable skill package'],
            },
          ],
          canActivate: (selection) =>
            selection?.sectionId === 'skills' && selection.workspaceId === null,
          loadComponent: () =>
            import('../settings/SkillsSettingsView').then((module) => module.SkillsSettingsView),
        },
      ],
    }),
    withSettingsEditor({
      id: 'skills-role-instructions-editor',
      kind: 'skill-role-instructions',
      width: '680px',
      isRequest: isSkillRoleInstructionsEditorRequest,
      loadComponent: () =>
        import('../settings/SkillRoleInstructionsEditorView').then(
          (module) => module.SkillRoleInstructionsEditorView,
        ),
    }),
    withSettingsEditor({
      id: 'skills-catalog-editor',
      kind: 'skill-catalog',
      width: '720px',
      isRequest: isSkillCatalogEditorRequest,
      loadComponent: () =>
        import('../views/dialogs/SkillCatalogDialogView').then(
          (module) => module.SkillCatalogDialogView,
        ),
    }),
    withSettingsEditor({
      id: 'skills-package-editor',
      kind: 'skill-editor',
      width: '720px',
      isRequest: isSkillEditorRequest,
      loadComponent: () =>
        import('../views/dialogs/SkillEditorDialogView').then(
          (module) => module.SkillEditorDialogView,
        ),
    }),
    withSettingsEditor({
      id: 'skills-import-editor',
      kind: 'skill-import',
      width: '600px',
      isRequest: isSkillImportEditorRequest,
      loadComponent: () =>
        import('../settings/SkillImportEditorView').then((module) => module.SkillImportEditorView),
    }),
  ];
}
