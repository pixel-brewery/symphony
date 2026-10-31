// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { BoxingContenderId } from '../model/BoxingContenderId';
import { BoxingContenders } from '../model/BoxingContenders';

// #endregion

/** Resolves an original contender identifier for match and result copy. @public */
@Pipe({ name: 'boxingContenderName', standalone: true, pure: true })
export class BoxingContenderNamePipe implements PipeTransform {
  // #region Methods

  /** Returns the original contender name. @public */
  public transform(id: BoxingContenderId): string {
    return BoxingContenders.find((contender) => contender.id === id)?.name ?? id;
  }

  // #endregion
}
