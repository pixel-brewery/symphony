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
import { translateLabel } from '@symphony/frontend-intl/labels';

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
            get label() {
              return translateLabel('loc.symphony.labels.skills.66d0f52');
            },
            get description() {
              return translateLabel(
                'loc.symphony.labels.how.each.step.of.the.delivery.flow.works.in.every.wo.18f68cf',
              );
            },
            order: 30,
          },
          search: [
            {
              id: 'process-roles',
              get label() {
                return translateLabel('loc.symphony.labels.edit.instructions.23e2751');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.add.instructions.to.refine.how.a.built.in.process.ro.84568bf',
                );
              },
              keywords: ['create', 'analyze', 'solve', 'verify', 'diagnose CI', 'repair CI'],
            },
            {
              id: 'skill-packages',
              get label() {
                return translateLabel('loc.symphony.labels.add.skills.7e02e13');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.activate.a.discovered.skill.package.for.an.optional..50ae0e0',
                );
              },
              keywords: ['skill package', 'deactivate', 'catalog'],
            },
            {
              id: 'new-skill',
              get label() {
                return translateLabel('loc.symphony.labels.new.skill.9bf06a8');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.create.a.portable.symphony.skill.package.17f1954',
                );
              },
            },
            {
              id: 'import-skill',
              get label() {
                return translateLabel('loc.symphony.labels.import.skill.42eea9a');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.select.a.folder.containing.skill.md.and.packaged.res.e9fd0fb',
                );
              },
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
