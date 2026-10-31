// #region Imports

import { Inject, Pipe, type PipeTransform } from '@angular/core';
import { WorkspaceAvatarImages } from './WorkspaceAvatarImages';
import type { WorkspaceAvatarSource } from './WorkspaceAvatarSource';

// #endregion

/** Keeps workspace appearance formatting shared across navigation and settings. @public */
@Pipe({ name: 'workspaceAvatarSource', standalone: true, pure: true })
export class WorkspaceAvatarSourcePipe implements PipeTransform {
  // #region Ctor

  /** Receives the shared browser image owner. @public */
  public constructor(
    @Inject(WorkspaceAvatarImages) private readonly _images: WorkspaceAvatarImages,
  ) {}

  // #endregion

  // #region Methods

  /** Returns the current preview for Angular's stale-result-safe async binding. @public */
  public transform(workspace: WorkspaceAvatarSource | null | undefined): Promise<string | null> {
    return this._images.render(workspace);
  }

  // #endregion
}
