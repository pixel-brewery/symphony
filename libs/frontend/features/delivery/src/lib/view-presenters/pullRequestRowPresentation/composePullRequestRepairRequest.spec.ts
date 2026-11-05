// @vitest-environment jsdom

// #region Imports

import {
  destroyPlatform,
  provideZonelessChangeDetection,
  type ApplicationRef,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { ApplicationLocalization, provideApplicationLocalization } from '@symphony/frontend-intl';
import { describe, expect, it } from 'vitest';
import { composePullRequestRepairRequest } from './composePullRequestRepairRequest';

// #endregion

describe('composePullRequestRepairRequest', () => {
  it('keeps the Solver request and provider-owned names identical when the interface language changes', async () => {
    // arrange
    const pullRequest = { number: 42, sourceBranch: 'fix/übersicht' };
    const checks = { failingNames: ['Typecheck', 'Prüfung der Oberfläche'] };
    let app: ApplicationRef | undefined;
    try {
      app = await createApplication({
        providers: [provideZonelessChangeDetection(), provideApplicationLocalization()],
      });
      const english = composePullRequestRepairRequest(pullRequest, checks);

      // act
      app.injector.get(ApplicationLocalization).setLanguage('de');
      const german = composePullRequestRepairRequest(pullRequest, checks);

      // assert
      expect(german).toBe(english);
      expect(german).toBe(
        'Repair the failed checks of pull request #42 on fix/übersicht: Typecheck, Prüfung der Oberfläche.\n\n' +
          'Read the failure logs, fix the cause on the retained branch and keep the change focused on making these checks pass.',
      );
    } finally {
      app?.destroy();
      destroyPlatform();
    }
  });
});
