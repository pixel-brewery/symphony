// #region Imports

import type { IWorkItemEditorMetadata } from '@symphony/domain-work';
import { type MobileWorkItemCreateRequest } from '@symphony/mobile-contracts';

// #endregion

export function requireProjectFields(
  metadata: IWorkItemEditorMetadata,
  values: MobileWorkItemCreateRequest['projectFields'],
): void {
  for (const field of metadata.projectFields) {
    const matching = values.filter((value) => value.fieldId === field.id);
    if (matching.length !== 1 || matching[0]?.type !== field.type) {
      throw new Error(`The project field ${field.name} changed. Reload the work-item form.`);
    }
    const value = matching[0];
    if (!value || !('options' in field)) continue;
    const selected = Array.isArray(value.value)
      ? value.value
      : typeof value.value === 'string' && value.value
        ? [value.value]
        : [];
    if (selected.some((optionId) => !field.options.some((option) => option.id === optionId))) {
      throw new Error(`The options for ${field.name} changed. Reload the work-item form.`);
    }
  }
  if (values.some((value) => !metadata.projectFields.some((field) => field.id === value.fieldId))) {
    throw new Error('The available project fields changed. Reload the work-item form.');
  }
}
