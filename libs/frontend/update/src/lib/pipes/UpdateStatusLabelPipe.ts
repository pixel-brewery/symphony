// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { UpdateState } from '@symphony/ipc-contracts-desktop';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

@Pipe({ name: 'updateStatusLabel', standalone: true, pure: false })
export class UpdateStatusLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param state - State.
   * @public
   */
  public transform(state: UpdateState | undefined): string {
    if (!state) return translateLabel('loc.symphony.labels.loading.update.status.0538ba2');
    switch (state.kind) {
      case 'disabled':
        return state.reason === 'unsupported-platform'
          ? translateLabel(
              'loc.symphony.labels.updates.are.installed.through.the.operating.system.p.c805550',
            )
          : state.reason === 'development'
            ? translateLabel(
                'loc.symphony.labels.automatic.updates.are.disabled.in.development.builds.8079b2d',
              )
            : translateLabel(
                'loc.symphony.labels.this.build.does.not.have.a.release.feed.configured.e8b2252',
              );
      case 'idle':
        return state.lastCheckedAt
          ? translateLabel('loc.symphony.labels.symphony.is.up.to.date.f6c1082')
          : translateLabel('loc.symphony.labels.automatic.checks.are.active.d608641');
      case 'checking':
        return translateLabel('loc.symphony.labels.checking.for.updates.497a199');
      case 'available':
        return translateLabel(
          'loc.symphony.labels.version.is.available.to.download.30951cd',
          state.targetVersion,
        );
      case 'downloading':
        return translateLabel(
          'loc.symphony.labels.downloading.a.new.version.in.the.background.b22af61',
        );
      case 'ready':
        return translateLabel(
          'loc.symphony.labels.version.is.ready.to.install.fa8dcac',
          state.targetVersion,
        );
      case 'failed':
        return state.message;
    }
  }

  // #endregion
}
