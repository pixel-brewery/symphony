// #region Imports

import type { RequestPayload } from '@symphony/ipc-contracts-composition';

// #endregion

export type RuntimeDependencyCommand = RequestPayload<'runtime-dependencies.install'>['command'];
