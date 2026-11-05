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
import { RelativeTimePipe } from './RelativeTimePipe';

// #endregion

@Component({
  selector: 'test-relative-time',
  imports: [RelativeTimePipe],
  template: "{{ timestamp | relativeTime: now : 'ago' }}",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class RelativeTimeHost {
  // #region Fields

  /**
   * A stable clock input, so a tick cannot hide stale translation caching.
   * @public
   * @readonly
   */
  public readonly now = Date.parse('2026-11-04T12:00:00Z');

  /**
   * A recent instant whose displayed age is localized.
   * @public
   * @readonly
   */
  public readonly timestamp = this.now - 10_000;

  // #endregion
}

describe('RelativeTimePipe', () => {
  it('updates rendered relative time on a language change while every pipe input stays fixed', async () => {
    // arrange
    const host = document.createElement('test-relative-time');
    document.body.append(host);
    let app: ApplicationRef | undefined;
    try {
      app = await bootstrapApplication(RelativeTimeHost, {
        providers: [provideZonelessChangeDetection(), provideApplicationLocalization()],
      });
      app.tick();
      expect(host.textContent?.trim()).toBe('just now');

      // act
      app.injector.get(ApplicationLocalization).setLanguage('de');
      app.tick();

      // assert
      expect(host.textContent?.trim()).toBe('gerade eben');
    } finally {
      app?.destroy();
      host.remove();
      destroyPlatform();
    }
  });
});
