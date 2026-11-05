// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IBoardCardState } from '../view-presenters/boardCard';
import type { IBoardCardStatusPresentation } from './IBoardCardStatusPresentation';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/** Names of the five delivery steps, in the order of the card's progress bar. */
const deliveryStepLabels = ['Analysis', 'Solution', 'Implementation', 'Checks', 'Acceptance'];

/**
 * Maps a board card's state onto its status chip: label, appearance, variant and icon.
 *
 * @public
 */
@Pipe({ name: 'boardCardStatusPresentation', standalone: true, pure: false })
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
          get label() {
            return translateLabel('loc.symphony.labels.waiting.for.you.9f760ab');
          },
          appearance: 'soft',
          variant: 'danger',
          iconName: 'errorCircle',
        };
      case 'failed':
        return {
          get label() {
            return translateLabel('loc.symphony.labels.failed.d5de6f7', step);
          },
          appearance: 'soft',
          variant: 'danger',
          iconName: 'errorCircle',
        };
      case 'checks-failed':
        return {
          get label() {
            return translateLabel('loc.symphony.labels.checks.failed.69ea579');
          },
          appearance: 'soft',
          variant: 'danger',
          iconName: 'errorCircle',
        };
      case 'elsewhere':
        return {
          get label() {
            return (
              (state.coordinationAction === 'analyze'
                ? translateLabel('loc.symphony.labels.analyzing.elsewhere.b32cc7c')
                : translateLabel('loc.symphony.labels.solving.elsewhere.70019b4')) +
              (state.coordinationOwner ? ` · @${state.coordinationOwner}` : '')
            );
          },
          appearance: 'soft',
          variant: 'warning',
          iconName: 'warning',
        };
      case 'running':
        return {
          get label() {
            return translateLabel('loc.symphony.labels.running.84978d6', step);
          },
          appearance: 'soft',
          variant: 'info',
        };
      case 'queued':
        return {
          get label() {
            return translateLabel('loc.symphony.labels.queued.0366036', step);
          },
          appearance: 'outline',
          variant: 'neutral',
        };
      case 'conflicting':
        return {
          get label() {
            return translateLabel('loc.symphony.labels.conflicts.with.base.eb2b50b');
          },
          appearance: 'soft',
          variant: 'warning',
          iconName: 'warning',
        };
      case 'behind-base':
        return {
          get label() {
            return translateLabel('loc.symphony.labels.behind.base.4491815');
          },
          appearance: 'soft',
          variant: 'warning',
        };
      case 'ready-to-review':
        return {
          get label() {
            return translateLabel('loc.symphony.labels.ready.to.review.ff2547b');
          },
          appearance: 'soft',
          variant: 'success',
        };
      case 'ready-for-agent':
        return {
          get label() {
            return translateLabel('loc.symphony.labels.ready.for.an.agent.b5fc298');
          },
          appearance: 'outline',
          variant: 'neutral',
        };
      case 'done':
        return {
          get label() {
            return translateLabel('loc.symphony.labels.done.11a6767');
          },
          appearance: 'outline',
          variant: 'neutral',
        };
      case 'stage':
        return { label: state.stageLabel, appearance: 'outline', variant: 'neutral' };
    }
  }

  // #endregion
}
