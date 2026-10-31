// #region Imports

import type { IProjectFieldOption } from './IProjectFieldOption';
import type { ProjectFieldRole } from './ProjectFieldRole';

// #endregion

export type ProjectFieldDefinition =
  | (IProjectFieldDefinitionBase & { type: 'text' })
  | (IProjectFieldDefinitionBase & { type: 'number' })
  | (IProjectFieldDefinitionBase & { type: 'date' })
  | (IProjectFieldDefinitionBase & {
      type: 'single-select';
      options: readonly IProjectFieldOption[];
    })
  | (IProjectFieldDefinitionBase & {
      type: 'multi-select';
      options: readonly IProjectFieldOption[];
    })
  | (IProjectFieldDefinitionBase & {
      type: 'iteration';
      options: readonly IProjectFieldOption[];
    });

interface IProjectFieldDefinitionBase {
  id: string;
  name: string;
  role: ProjectFieldRole;
  /**
   * Board the field belongs to. Snapshots merge the fields of every configured board, so a
   * consumer that asks whether an item is missing a field must first discard the fields that
   * belong to a different board. Missing on records written before boards were distinguished.
   */
  sourceId?: string;
}
