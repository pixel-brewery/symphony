// #region Imports

import type { IGuardFailure } from '../workflow/IGuardFailure';
import type { IGuardFacts } from './IGuardFacts';

// #endregion

export type GuardPredicate = (facts: IGuardFacts) => IGuardFailure | undefined;
