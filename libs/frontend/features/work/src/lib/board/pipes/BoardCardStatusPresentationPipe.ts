// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IBoardCardState } from '../view-presenters/boardCard';
import type { IBoardCardStatusPresentation } from './IBoardCardStatusPresentation';

// #endregion

/** Names of the five delivery steps, in the order of the card's progress bar. */
const deliveryStepLabels = ['Analysis', 'Solution', 'Implementation', 'Checks', 'Acceptance'];

/**
 * Maps a board card's state onto its status chip: label, appearance, variant and icon.
 *
 * @public
 */
@Pipe({ name: 'boardCardStatusPresentation', standalone: true, pure: true })
export class BoardCardStatusPresentationPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the card state into the chip presentation.
   *
   * @param state - Card state.
   * @returns The chip presentation.
   * @public
   */
  public transform(state: IBoardCardState): IBoardCardStatusPresentation {
    const step = deliveryStepLabels[state.activeStep] ?? 'Delivery';
    switch (state.status) {
      case 'waiting-for-you':
        return {
          label: 'Waiting for you',
          appearance: 'soft',
          variant: 'danger',
          iconName: 'errorCircle',
        };
      case 'failed':
        return {
          label: `${step} failed`,
          appearance: 'soft',
          variant: 'danger',
          iconName: 'errorCircle',
        };
      case 'checks-failed':
        return {
          label: 'Checks failed',
          appearance: 'soft',
          variant: 'danger',
          iconName: 'errorCircle',
        };
      case 'elsewhere':
        return {
          label:
            (state.coordinationAction === 'analyze' ? 'Analyzing elsewhere' : 'Solving elsewhere') +
            (state.coordinationOwner ? ` · @${state.coordinationOwner}` : ''),
          appearance: 'soft',
          variant: 'warning',
          iconName: 'warning',
        };
      case 'running':
        return { label: `${step} running`, appearance: 'soft', variant: 'info' };
      case 'queued':
        return { label: `${step} queued`, appearance: 'outline', variant: 'neutral' };
      case 'conflicting':
        return {
          label: 'Conflicts with base',
          appearance: 'soft',
          variant: 'warning',
          iconName: 'warning',
        };
      case 'behind-base':
        return { label: 'Behind base', appearance: 'soft', variant: 'warning' };
      case 'ready-to-review':
        return { label: 'Ready to review', appearance: 'soft', variant: 'success' };
      case 'ready-for-agent':
        return { label: 'Ready for an agent', appearance: 'outline', variant: 'neutral' };
      case 'done':
        return { label: 'Done', appearance: 'outline', variant: 'neutral' };
      case 'stage':
        return { label: state.stageLabel, appearance: 'outline', variant: 'neutral' };
    }
  }

  // #endregion
}
