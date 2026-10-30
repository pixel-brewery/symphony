// #region Imports

import type { IEditableSkillPackage, ISkillPackageDocument } from '@symphony/domain-skills';

// #endregion

export function embeddedSkillMatches(
  existing: ISkillPackageDocument,
  imported: IEditableSkillPackage,
): boolean {
  return (
    existing.name === imported.name &&
    existing.description.trim() === imported.description.trim() &&
    existing.instructions.trim() === imported.instructions.trim() &&
    existing.openaiYaml.trim() === imported.openaiYaml.trim() &&
    JSON.stringify(existing.files) === JSON.stringify(imported.files)
  );
}
