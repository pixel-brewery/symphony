// #region Imports

import type { WorkItemNoteKind } from '@symphony/domain-work';

// #endregion

/** Below this length an analysis cannot carry the sections the implementation contract needs. */
/** How a failed publication is named on the run stream, per note kind. */
export const noteSubjects: Record<WorkItemNoteKind, string> = {
  analysis: 'analysis',
  implementation: 'implementation result',
  delivery: 'pull-request handoff',
  acceptance: 'acceptance decision',
};
