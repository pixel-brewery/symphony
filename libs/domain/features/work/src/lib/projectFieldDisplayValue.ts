// #region Imports

import type { ProjectFieldDefinition } from './ProjectFieldDefinition';
import type { ProjectFieldValue } from './ProjectFieldValue';

// #endregion

export function projectFieldDisplayValue(
  field: ProjectFieldDefinition,
  value: ProjectFieldValue | undefined,
): string | undefined {
  if (!value || value.fieldId !== field.id || value.type !== field.type) return undefined;
  switch (field.type) {
    case 'text':
      return value.type === 'text' ? value.value || undefined : undefined;
    case 'date':
      return value.type === 'date' ? value.value || undefined : undefined;
    case 'number':
      return value.type !== 'number' || value.value === null ? undefined : String(value.value);
    case 'single-select':
      return value.type === 'single-select' && value.value
        ? field.options.find((option) => option.id === value.value)?.label
        : undefined;
    case 'iteration':
      return value.type === 'iteration' && value.value
        ? field.options.find((option) => option.id === value.value)?.label
        : undefined;
    case 'multi-select': {
      if (value.type !== 'multi-select') return undefined;
      const labels = value.value.flatMap((optionId) => {
        const option = field.options.find((candidate) => candidate.id === optionId);
        return option ? [option.label] : [];
      });
      return labels.length ? labels.join(', ') : undefined;
    }
  }
}
