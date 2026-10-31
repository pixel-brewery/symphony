// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IWorkItem } from '@symphony/domain-work';
import type { IWorkItemLinkPresentation } from './IWorkItemLinkPresentation';

// #endregion

/**
 * The link actions a card offers for the item in its tracker. The tracker is named in the
 * labels because the operator picks the action by where it leads; an item whose tracker the
 * board does not recognise still gets both actions, just without a brand claim.
 */
@Pipe({ name: 'workItemLinkPresentation', standalone: true, pure: true })
export class WorkItemLinkPresentationPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param item - Item.
   * @public
   */
  public transform(item: IWorkItem): IWorkItemLinkPresentation | undefined {
    // Trackers that never published a URL for the item - simulated boards, locally drafted
    // items - have nothing to copy or open, so the card offers neither action.
    if (!item.externalUrl) return undefined;
    switch (item.provider) {
      case 'github-projects':
        return {
          url: item.externalUrl,
          copyLabel: 'Copy GitHub URL',
          openLabel: 'Open in GitHub',
          openIconName: 'github',
        };
      case 'azure-devops':
        return {
          url: item.externalUrl,
          copyLabel: 'Copy Azure DevOps URL',
          openLabel: 'Open in Azure DevOps',
          openIconName: 'azureDevOps',
        };
      default:
        return {
          url: item.externalUrl,
          copyLabel: 'Copy URL',
          openLabel: 'Open in browser',
          openIconName: 'open',
        };
    }
  }

  // #endregion
}
