// #region Imports

import type { IAnalyzerDependencies } from '../analyzer/IAnalyzerDependencies';

// #endregion

/** Derived from the port so the repair prompt cannot drift from what verification reports. */
export type DeterministicCheck = Awaited<
  ReturnType<NonNullable<IAnalyzerDependencies['verifyImplementation']>>
>[number];
