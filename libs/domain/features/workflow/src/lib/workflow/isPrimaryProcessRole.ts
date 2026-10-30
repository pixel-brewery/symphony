// #region Imports

import type { PrimaryProcessRole } from './PrimaryProcessRole';
import type { ProcessRole } from './ProcessRole';
import { primaryProcessRoles } from './PrimaryProcessRoles';

// #endregion

export function isPrimaryProcessRole(role: ProcessRole): role is PrimaryProcessRole {
  return (primaryProcessRoles as readonly ProcessRole[]).includes(role);
}
