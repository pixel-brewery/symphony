// #region Imports

import type { ProjectFieldDefinition } from './ProjectFieldDefinition';
import type { ProjectFieldValue } from './ProjectFieldValue';
import { projectFieldDisplayValue } from './projectFieldDisplayValue';

// #endregion

export function projectFieldSearchText(
  fields: readonly ProjectFieldDefinition[],
  values: readonly ProjectFieldValue[] | undefined,
): string {
  return fields
    .flatMap((field) => {
      const display = projectFieldDisplayValue(
        field,
        values?.find((value) => value.fieldId === field.id),
      );
      return display ? [field.name, display] : [];
    })
    .join(' ');
}
