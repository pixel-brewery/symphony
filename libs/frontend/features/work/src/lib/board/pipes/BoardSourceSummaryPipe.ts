// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';

// #endregion

type WorkItemSource = ApplicationSettingsDto['workItemSources'][number];

/** Short provider-specific description of one board (work-item source). */
@Pipe({ name: 'boardSourceSummary', standalone: true, pure: true })
export class BoardSourceSummaryPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param source - Source.
   * @public
   */
  public transform(source: WorkItemSource | undefined): string {
    if (!source) return '';
    switch (source.provider) {
      case 'github-projects':
        return `GitHub Project · ${source.owner} #${source.projectNumber}`;
      case 'azure-devops':
        return `Azure DevOps · ${source.project}${source.team ? ` / ${source.team}` : ''}`;
      case 'simulated':
        return `Simulated · ${source.project}`;
    }
  }

  // #endregion
}
