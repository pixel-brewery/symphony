// @vitest-environment jsdom

// #region Imports

import {
  ChangeDetectionStrategy,
  Component,
  destroyPlatform,
  provideZonelessChangeDetection,
  type ApplicationRef,
} from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { ApplicationLocalization, provideApplicationLocalization } from '@symphony/frontend-intl';
import { describe, expect, it } from 'vitest';
import { ActionRunRevisionPipe } from './ActionRunRevisionPipe';

// #endregion

@Component({
  selector: 'symphony-test-action-run-revision',
  imports: [ActionRunRevisionPipe],
  template: '{{ row | actionRunRevision }}',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ActionRunRevisionHost {
  // #region Fields

  /**
   * An unchanged provider row, including its original branch and event identifier.
   * @public
   * @readonly
   */
  public readonly row = {
    branch: 'fix/übersicht',
    revision: '4f2a91c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6',
    event: 'workflow_dispatch',
  };

  // #endregion
}

describe('ActionRunRevisionPipe', () => {
  it('updates the rendered trigger when only the application language changes', async () => {
    // arrange
    const host = document.createElement('symphony-test-action-run-revision');
    document.body.append(host);
    let app: ApplicationRef | undefined;
    try {
      app = await bootstrapApplication(ActionRunRevisionHost, {
        providers: [provideZonelessChangeDetection(), provideApplicationLocalization()],
      });
      app.tick();
      expect(host.textContent?.trim()).toBe('fix/übersicht · 4f2a91c · manual');

      // act
      app.injector.get(ApplicationLocalization).setLanguage('de');
      app.tick();

      // assert
      expect(host.textContent?.trim()).toBe('fix/übersicht · 4f2a91c · manuell');
    } finally {
      app?.destroy();
      host.remove();
      destroyPlatform();
    }
  });

  it('joins branch, short commit and trigger', () => {
    // arrange
    const pipe = new ActionRunRevisionPipe();

    // act
    const lines = [
      pipe.transform({
        branch: 'dev',
        revision: '4f2a91c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6',
        event: 'push',
      }),
      pipe.transform({ branch: 'main', event: 'workflow_dispatch' }),
      pipe.transform({ revision: 'simulated-1' }),
      pipe.transform({}),
    ];

    // assert
    expect(lines).toEqual(['dev · 4f2a91c · push', 'main · manual', 'simulated-1', '—']);
  });
});
