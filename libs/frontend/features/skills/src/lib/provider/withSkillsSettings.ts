// #region Imports
import type { IFeature } from '@symphony/frontend-core';
import {
  SettingsViewSlot,
  withSettingsEditor,
  withSettingsViews,
  type SettingsFeatureKind,
} from '@symphony/frontend-setting';
import { isSkillImportEditorRequest } from '../settings/isSkillImportEditorRequest';
// #endregion
/** Registers the existing role cards and portable import drawer with their canonical owner. @public */
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
            description: 'Refine how each built-in process role works.',
            order: 30,
          },
          canActivate: (selection) =>
            selection?.sectionId === 'skills' && selection.workspaceId === null,
          loadComponent: () =>
            import('../settings/SkillsSettingsView').then((module) => module.SkillsSettingsView),
        },
      ],
    }),
    withSettingsEditor({
      id: 'skills-import-editor',
      kind: 'skill-import',
      isRequest: isSkillImportEditorRequest,
      loadComponent: () =>
        import('../settings/SkillImportEditorView').then((module) => module.SkillImportEditorView),
    }),
  ];
}
